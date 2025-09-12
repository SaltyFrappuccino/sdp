import os
import logging
import requests
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - BACKEND_API - %(levelname)s - %(message)s')

# Получаем URL бэкенда из .env
BASE_URL = os.getenv("BACKEND_API_URL")

if not BASE_URL:
    logging.error("Переменная BACKEND_API_URL не установлена в .env файле!")
    # Можно выбросить исключение, чтобы бот не запускался без этой важной настройки
    # raise ValueError("BACKEND_API_URL is not set")

def get_characters_by_vk_id(vk_id: int) -> list | None:
    """Получает список персонажей по VK ID через API."""
    if not BASE_URL: return None
    try:
        response = requests.get(f"{BASE_URL}/my-anketas/{vk_id}")
        response.raise_for_status()  # Вызовет исключение для кодов 4xx/5xx
        return response.json()
    except requests.RequestException as e:
        logging.error(f"API Error fetching characters for vk_id {vk_id}: {e}")
        return None

def find_character(identifier: str) -> dict | None:
    """
    Ищет персонажа по ID или имени через API.
    Предполагается, что API поддерживает такой поиск.
    """
    if not BASE_URL: return None
    
    # Сначала пробуем найти по ID
    if identifier.isdigit():
        try:
            response = requests.get(f"{BASE_URL}/characters/{identifier}")
            if response.status_code == 200:
                return response.json()
            # Если 404, то это не ошибка, просто не нашли. Продолжаем поиск по имени.
            if response.status_code != 404:
                response.raise_for_status()
        except requests.RequestException as e:
            logging.error(f"API Error fetching character by id '{identifier}': {e}")
            # Не возвращаем ошибку, а пробуем найти по имени
    
    # Ищем по имени (если по ID не нашли или identifier не был числом)
    try:
        # Предполагаем, что API поддерживает фильтрацию по character_name
        response = requests.get(f"{BASE_URL}/characters", params={'character_name': identifier})
        response.raise_for_status()
        results = response.json()
        # Возвращаем первый результат, если он есть
        if isinstance(results, list) and results:
            return results[0]
        return None
    except requests.RequestException as e:
        logging.error(f"API Error fetching character by name '{identifier}': {e}")
        return None

# Функции для админов (пока заглушки, ждут решения по аутентификации)
def update_character_data(char_id: int, data: dict, admin_api_key: str) -> bool:
    """Обновляет данные персонажа через API, используя API ключ."""
    if not BASE_URL: return False
    try:
        headers = {'x-bot-api-key': admin_api_key}
        response = requests.put(f"{BASE_URL}/characters/{char_id}", json=data, headers=headers)
        response.raise_for_status()
        return True
    except requests.RequestException as e:
        logging.error(f"API Error updating character {char_id}: {e}")
        return False
