import random
import vk_api
import logging
import json
import os
from vk_api.vk_api import VkApiMethod

MAX_MESSAGE_LENGTH = 4000 # Немного меньше лимита VK (4096) для надежности
SETTINGS_FILE = "settings.json"

def get_random_id():
    """Генерирует случайный ID для сообщения VK."""
    return random.getrandbits(31) * random.choice([-1, 1])

def send_message(vk: VkApiMethod, peer_id: int, message: str, **kwargs):
    """
    Отправляет сообщение, автоматически разбивая его на части, если оно превышает лимит.
    """
    try:
        if len(message) <= MAX_MESSAGE_LENGTH:
            vk.messages.send(peer_id=peer_id, message=message, random_id=get_random_id(), **kwargs)
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
                
                vk.messages.send(peer_id=peer_id, message=final_message, random_id=get_random_id(), **kwargs)

    except vk_api.exceptions.ApiError as e:
        logging.error(f"Ошибка VK API при отправке сообщения в чат {peer_id}: {e}")
    except Exception as e:
        logging.error(f"Неизвестная ошибка при отправке сообщения в чат {peer_id}: {e}")

def load_settings():
    """Загружает настройки из файла settings.json."""
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_settings(settings):
    """Сохраняет настройки в файл settings.json."""
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=4, ensure_ascii=False)

def check_and_use_otp(token: str) -> bool:
    """
    Проверяет OTP токен и помечает его как использованный, если он верный.
    Возвращает True, если токен верный и еще не использовался, иначе False.
    """
    settings = load_settings()
    
    # Проверяем, что OTP еще не использовался
    if settings.get('otp_used', False):
        return False
    
    # Проверяем токен
    if settings.get('otp_token') != token:
        return False
    
    # Помечаем OTP как использованный
    settings['otp_used'] = True
    save_settings(settings)
    
    logging.info(f"OTP токен успешно использован и заблокирован")
    return True
