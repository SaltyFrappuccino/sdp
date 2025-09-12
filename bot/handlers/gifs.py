import os
import requests
import random
from io import BytesIO

from vk_api.upload import VkUpload

from core.utils import send_message

def get_gif(vk, event, args, vk_session):
    """Ищет гифку по запросу через GIPHY API и отправляет ее в чат."""
    
    giphy_api_key = os.getenv("GIPHY_API_KEY")
    if not giphy_api_key:
        send_message(vk, event.peer_id, "🚫 API ключ для GIPHY не настроен. Обратитесь к администратору.")
        return

    if not args:
        send_message(vk, event.peer_id, "📝 Пожалуйста, укажите поисковый запрос. Например: `sdp gif котики`")
        return
        
    search_query = " ".join(args)

    # Отправляем сообщение о том, что мы начали поиск
    send_message(vk, event.peer_id, f"⏳ Ищу гифку по запросу «{search_query}»...")
    
    # Формируем запрос к GIPHY API
    api_url = "https://api.giphy.com/v1/gifs/search"
    params = {
        "api_key": giphy_api_key,
        "q": search_query,
        "limit": 25,  # Берем побольше, чтобы был выбор
        "offset": 0,
        "rating": "g",
        "lang": "ru"
    }

    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status() # Проверяем на ошибки HTTP
        data = response.json()

        if not data["data"]:
            send_message(vk, event.peer_id, f"😿 Не смог найти гифку по запросу: «{search_query}»")
            return

        # Выбираем случайную гифку из результатов
        gif_data = random.choice(data["data"])
        gif_url = gif_data["images"]["original"]["url"]

        # Скачиваем гифку в память
        gif_response = requests.get(gif_url)
        gif_response.raise_for_status()
        gif_bytes = BytesIO(gif_response.content)
        gif_bytes.name = f"{search_query.replace(' ', '_')}.gif" # VK требует имя файла
        
        # Загружаем на сервер VK как документ
        upload = VkUpload(vk_session)
        doc = upload.document_message(doc=gif_bytes, title=gif_bytes.name, peer_id=event.peer_id)['doc']
        
        attachment = f"doc{doc['owner_id']}_{doc['id']}"

        # Отправляем сообщение с прикрепленной гифкой
        send_message(vk, event.peer_id, message=f"✨ Ваша гифка по запросу \"{search_query}\":", attachment=attachment)

    except requests.exceptions.RequestException as e:
        send_message(vk, event.peer_id, "🚫 GIPHY API временно недоступен. Попробуйте позже.")
    except Exception as e:
        send_message(vk, event.peer_id, f"Произошла непредвиденная ошибка: {e}")
