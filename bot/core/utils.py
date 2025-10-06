import random
import vk_api
import logging
from vk_api.vk_api import VkApiMethod

MAX_MESSAGE_LENGTH = 4000 # Немного меньше лимита VK (4096) для надежности

def get_random_id():
    """Генерирует случайный ID для сообщения VK."""
    return random.getrandbits(31) * random.choice([-1, 1])

def send_message(vk: VkApiMethod, peer_id: int, message: str, reply_to: int = None, **kwargs):
    """
    Отправляет сообщение, автоматически разбивая его на части, если оно превышает лимит.
    
    Args:
        vk: VK API объект
        peer_id: ID чата/пользователя
        message: Текст сообщения
        reply_to: ID сообщения, на которое нужно ответить (опционально)
        **kwargs: Дополнительные параметры для messages.send
    """
    try:
        if len(message) <= MAX_MESSAGE_LENGTH:
            params = {'peer_id': peer_id, 'message': message, 'random_id': get_random_id()}
            if reply_to:
                params['reply_to'] = reply_to
            vk.messages.send(**params, **kwargs)
            return

        logging.info(f"Сообщение для чата {peer_id} слишком длинное. Разбиваю на части.")
        
        parts = []
        remaining_message = message
        while len(remaining_message) > 0:
            if len(remaining_message) <= MAX_MESSAGE_LENGTH:
                parts.append(remaining_message)
                break
            
            # Ищем последний перенос строки в пределах лимита для красивого разрыва
            split_index = remaining_message.rfind('\n', 0, MAX_MESSAGE_LENGTH)
            
            # Если переноса строки нет, или он не подходит, режем по максимальной длине
            if split_index <= 0:
                split_index = MAX_MESSAGE_LENGTH
            
            parts.append(remaining_message[:split_index])
            remaining_message = remaining_message[split_index:].lstrip()

        for i, part in enumerate(parts):
            if part:
                header = f"📄 Часть {i + 1}/{len(parts)}\n"
                # Проверяем, не станет ли часть с заголовком слишком длинной
                if len(header) + len(part) > MAX_MESSAGE_LENGTH:
                    # Если да, отправляем без заголовка. Это крайний случай
                    final_message = part
                else:
                    final_message = header + part
                
                params = {'peer_id': peer_id, 'message': final_message, 'random_id': get_random_id()}
                # Только первое сообщение отвечает на оригинал
                if reply_to and i == 0:
                    params['reply_to'] = reply_to
                vk.messages.send(**params, **kwargs)

    except vk_api.exceptions.ApiError as e:
        logging.error(f"Ошибка VK API при отправке сообщения в чат {peer_id}: {e}")
    except Exception as e:
        logging.error(f"Неизвестная ошибка при отправке сообщения в чат {peer_id}: {e}")
