import logging
import asyncio
import threading
from typing import List, Dict, Any
from vk_api.vk_api import VkApiMethod, VkApi
from vk_api.bot_longpoll import VkBotMessageEvent

from core.utils import send_message
from core.permissions import is_admin
from core.ai_handler import query_rp_opinion_ai, query_rp_verdict_ai

# --- Утилиты ---

_user_cache: Dict[int, str] = {}

def _get_user_name(vk: VkApiMethod, user_id: int) -> str:
    """Получает имя пользователя по ID, используя кэш."""
    if user_id in _user_cache:
        return _user_cache[user_id]
    try:
        user_info = vk.users.get(user_ids=user_id)[0]
        # Используем first_name и last_name, чтобы получить полное имя
        full_name = f"{user_info['first_name']} {user_info['last_name']}"
        _user_cache[user_id] = full_name
        return full_name
    except Exception as e:
        logging.warning(f"Не удалось получить имя для пользователя {user_id}: {e}")
        return f"Пользователь {user_id}"

def _extract_text_from_event(vk: VkApiMethod, event: Dict[str, Any]) -> str:
    """Извлекает текст из reply_message или fwd_messages с именами авторов."""
    texts = []
    messages_to_process: List[Dict[str, Any]] = []

    # Приоритет отдаем пересланным сообщениям
    if 'fwd_messages' in event and event['fwd_messages']:
        messages_to_process.extend(event['fwd_messages'])

    # Если их нет, смотрим на сообщение, на которое ответили
    if not messages_to_process and 'reply_message' in event:
        messages_to_process.append(event['reply_message'])
    
    # Если и этого нет, берем текст самого сообщения (для случаев sdp команда <текст>)
    if not messages_to_process and event.get('text'):
        author_name = _get_user_name(vk, event['from_id'])
        texts.append(f"{author_name}: {event['text']}")

    for msg in messages_to_process:
        author_name = _get_user_name(vk, msg['from_id'])
        texts.append(f"{author_name}: {msg['text']}")
        # Рекурсивно обрабатываем вложенные пересланные сообщения
        if 'fwd_messages' in msg and msg['fwd_messages']:
             texts.append(_extract_text_from_event(vk, msg))


    return "\n\n".join(texts)

# --- Логика выполнения в потоке ---

def _rp_ai_thread_target(vk: VkApiMethod, event: VkBotMessageEvent, text: str, extra_instructions: str, mode: str):
    """
    Целевая функция для потока, которая запускает асинхронный запрос к AI.
    """
    try:
        logging.info(f"Запускаю RP AI ({mode}) в отдельном потоке для чата {event.peer_id}")
        send_message(vk, event.peer_id, f"⌛️ Анализирую посты для режима «{mode}»... Это может занять некоторое время.")

        if mode == 'мнение':
            response = query_rp_opinion_ai(text, extra_instructions)
        elif mode == 'вердикт':
            response = query_rp_verdict_ai(text, extra_instructions)
        else:
            # Эта проверка дублируется, но она полезна для безопасности
            response = "❌ Неизвестный режим для RP AI."

        logging.info(f"RP AI ({mode}) вернул ответ для чата {event.peer_id}.")
        send_message(vk, event.peer_id, response)

    except Exception as e:
        logging.error(f"Ошибка в потоке RP AI ({mode}): {e}", exc_info=True)
        send_message(vk, event.peer_id, f"💥 Произошла серьезная ошибка при обработке вашего запроса RP AI ({mode}).")

# --- Команда ---

def rp_ai_command(vk: VkApiMethod, vk_session: VkApi, event: VkBotMessageEvent, command_args: list, full_message_object):
    """
    Обрабатывает команды 'sdp rp вердикт' и 'sdp rp мнение'.
    """
    if not is_admin(event.peer_id, event.user_id):
        send_message(vk, event.peer_id, "🚫 У вас нет прав для использования этой команды.")
        return

    if not command_args or command_args[0].lower() not in ['вердикт', 'мнение']:
        send_message(vk, event.peer_id, "Использование: sdp rp [вердикт|мнение] [дополнительные инструкции...]\n(команда должна быть ответом на посты или пересылать их)")
        return

    mode = command_args[0].lower()
    extra_instructions = ' '.join(command_args[1:]) if len(command_args) > 1 else "Нет"

    # Используем vk_session.get_api(), т.к. для vk.users.get нужен полный объект vk_api
    text_to_analyze = _extract_text_from_event(vk_session.get_api(), full_message_object)

    if not text_to_analyze:
        send_message(vk, event.peer_id, "❌ Не найдены сообщения для анализа. Используйте команду в ответ на пост или перешлите сообщения.")
        return

    # Запускаем тяжелую операцию в отдельном потоке
    ai_thread = threading.Thread(
        target=_rp_ai_thread_target,
        args=(vk, event, text_to_analyze, extra_instructions, mode)
    )
    ai_thread.start()


def rp_judge_command(vk: VkApiMethod, vk_session: VkApi, event: VkBotMessageEvent, command_args: list, full_message_object):
    """
    Обрабатывает команду 'sdp судья' - анализирует РП посты и выносит вердикт.
    Доступна только админам.
    """
    if not is_admin(event.peer_id, event.user_id):
        send_message(vk, event.peer_id, "🚫 У вас нет прав для использования этой команды.")
        return

    # Дополнительные инструкции - все аргументы команды
    extra_instructions = ' '.join(command_args) if command_args else "Нет"

    # Используем vk_session.get_api(), т.к. для vk.users.get нужен полный объект vk_api
    text_to_analyze = _extract_text_from_event(vk_session.get_api(), full_message_object)

    if not text_to_analyze:
        send_message(vk, event.peer_id, "❌ Не найдены сообщения для анализа. Используйте команду в ответ на РП посты или перешлите их.")
        return

    # Запускаем тяжелую операцию в отдельном потоке с режимом 'вердикт'
    ai_thread = threading.Thread(
        target=_rp_ai_thread_target,
        args=(vk, event, text_to_analyze, extra_instructions, 'вердикт')
    )
    ai_thread.start()