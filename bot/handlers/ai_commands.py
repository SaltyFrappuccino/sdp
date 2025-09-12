import logging
import threading
from core import utils
from core import ai_handler
from database import get_or_create_user
import uuid
import os
import vk_api

def _extract_text_from_event(vk, event):
    """
    Извлекает текст из пересланных сообщений или из ответа,
    обогащая его именами авторов для лучшего контекста.
    """
    user_cache = {}
    text_parts = []

    # Приоритет - пересланные сообщения
    if event.get('fwd_messages'):
        # Собираем ID всех уникальных пользователей для одного запроса к API
        user_ids = {msg['from_id'] for msg in event['fwd_messages'] if 'from_id' in msg and msg['from_id'] > 0}
        if user_ids:
            try:
                users_info = vk.users.get(user_ids=list(user_ids))
                for user in users_info:
                    user_cache[user['id']] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
            except vk_api.ApiError as e:
                logging.warning(f"Не удалось получить имена пользователей для IDs {user_ids}: {e}")

        # Собираем диалог
        for fwd_msg in event['fwd_messages']:
            from_id = fwd_msg.get('from_id')
            text = fwd_msg.get('text', '').strip()
            if not text:
                continue
            
            author_name = user_cache.get(from_id, f"Пользователь {from_id}")
            text_parts.append(f"{author_name}: {text}")
            
        return "\n".join(text_parts) if text_parts else None

    # Если их нет, ищем ответ на сообщение
    if event.get('reply_message'):
        reply_msg = event['reply_message']
        from_id = reply_msg.get('from_id')
        text = reply_msg.get('text', '').strip()

        if not text:
            return None

        author_name = f"Пользователь {from_id}"
        if from_id and from_id > 0:
            try:
                user_info = vk.users.get(user_ids=from_id)[0]
                author_name = f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip()
            except vk_api.ApiError as e:
                logging.warning(f"Не удалось получить имя пользователя для ID {from_id}: {e}")
        
        return f"{author_name}: {text}"
        
    return None


# =========================================================================================
# === ПОТОЧНЫЕ ФУНКЦИИ (ДЛЯ АСИНХРОННОГО ВЫПОЛНЕНИЯ) =======================================
# =========================================================================================

def _sglypa_ai_thread_target(vk, peer_id, user_text):
    """Целевая функция для потока, выполняющая запрос к Сглыпе-AI."""
    response = ai_handler.query_sglypa_ai(user_text)
    utils.send_message(vk, peer_id, response)

def _grok_ai_thread_target(vk, peer_id, user_text):
    """Целевая функция для потока, выполняющая запрос к Grok-AI."""
    response = ai_handler.query_grok_ai(user_text)
    utils.send_message(vk, peer_id, response)

def _does_he_know_thread_target(vk, peer_id, user_text):
    """Целевая функция для потока, выполняющая запрос к "Does he know?"-AI."""
    response = ai_handler.query_does_he_know_ai(user_text)
    utils.send_message(vk, peer_id, response)

def _image_generation_thread_target(vk, peer_id, prompt, vk_session):
    """Целевая функция для потока, генерирующая и отправляющая изображение."""
    image_bytes, error_message = ai_handler.generate_image_ai(prompt)

    if error_message:
        utils.send_message(vk, peer_id, error_message)
        return

    # Сохраняем, загружаем и отправляем картинку
    temp_file_path = f"temp_image_{uuid.uuid4()}.png"
    try:
        with open(temp_file_path, "wb") as f:
            f.write(image_bytes)

        upload = vk_api.VkUpload(vk_session)
        # Убираем peer_id из вызова загрузчика.
        # Это более стабильный метод: сначала загружаем фото в "общий" альбом,
        # а потом используем полученный ID для отправки в конкретный чат.
        photo = upload.photo_messages(photos=temp_file_path)[0]
        
        attachment = f"photo{photo['owner_id']}_{photo['id']}"
        utils.send_message(vk, peer_id, message="✨ Ваш шедевр готов!", attachment=attachment)

    except vk_api.ApiError as e:
        logging.error(f"Ошибка VK API при загрузке изображения: {e}")
        utils.send_message(vk, peer_id, "🚫 Не удалось загрузить изображение в VK.")
    except Exception as e:
        logging.error(f"Неизвестная ошибка в image_generation_command: {e}")
        utils.send_message(vk, peer_id, "🚫 Произошла непредвиденная ошибка.")
    finally:
        # Гарантированно удаляем временный файл
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# =========================================================================================
# === ОБРАБОТЧИКИ КОМАНД (ЗАПУСКАЮТ ПОТОКИ) ================================================
# =========================================================================================

def sglypa_ai_command(vk, event, args):
    """Генерирует ответ Сглыпы-нейронки на пересланное сообщение."""
    user_text = _extract_text_from_event(vk, event)
    if not user_text:
        utils.send_message(vk, event['peer_id'], "📝 Эта команда работает только в ответ на сообщение (или с пересланными сообщениями).")
        return

    utils.send_message(vk, event['peer_id'], "🧠 Хуй Шестака обрабатывает запрос...")
    
    # Запускаем тяжелую операцию в отдельном потоке
    thread = threading.Thread(
        target=_sglypa_ai_thread_target,
        args=(vk, event['peer_id'], user_text)
    )
    thread.start()


def grok_ai_command(vk, event, args):
    """Генерирует ответ Grok на пересланное сообщение."""
    user_text = _extract_text_from_event(vk, event)
    if not user_text:
        utils.send_message(vk, event['peer_id'], "📝 Эта команда работает только в ответ на сообщение (или с пересланными сообщениями).")
        return
            
    utils.send_message(vk, event['peer_id'], "⚡️ Grok анализирует правдивость...")
    
    # Запускаем тяжелую операцию в отдельном потоке
    thread = threading.Thread(
        target=_grok_ai_thread_target,
        args=(vk, event['peer_id'], user_text)
    )
    thread.start()


def does_he_know_command(vk, event, args):
    """Генерирует ответ в стиле "Does he know?" на пересланное сообщение."""
    user_text = _extract_text_from_event(vk, event)
    if not user_text:
        utils.send_message(vk, event['peer_id'], "📝 Эта команда работает только в ответ на сообщение (или с пересланными сообщениями).")
        return

    utils.send_message(vk, event['peer_id'], "🤔...")
    
    # Запускаем тяжелую операцию в отдельном потоке
    thread = threading.Thread(
        target=_does_he_know_thread_target,
        args=(vk, event['peer_id'], user_text)
    )
    thread.start()


def image_generation_command(vk, event, args, vk_session):
    """Генерирует изображение по запросу из пересланных/отвеченных сообщений."""
    user_id = event.get('from_id')
    user_role = get_or_create_user(user_id).get('role')
    if user_role != 'admin':
        utils.send_message(vk, event['peer_id'], "🚫 У вас нет прав для использования этой команды.")
        return

    prompt = _extract_text_from_event(vk, event)
    if not prompt:
        utils.send_message(vk, event['peer_id'], "📝 Эта команда работает по ответу на сообщение. Укажите текстом, что нарисовать.")
        return

    # Обрезаем промпт для отображения, чтобы не спамить в чат
    prompt_short = prompt[:200] + '...' if len(prompt) > 200 else prompt
    utils.send_message(vk, event['peer_id'], f"🎨 Нейросеть рисует шедевр по запросу: \"{prompt_short}\"")

    # Запускаем тяжелую операцию в отдельном потоке
    thread = threading.Thread(
        target=_image_generation_thread_target,
        args=(vk, event['peer_id'], prompt, vk_session)
    )
    thread.start()
