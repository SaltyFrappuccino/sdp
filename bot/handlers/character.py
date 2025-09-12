import json
import logging
from core.permissions import admin_required
from core.utils import get_random_id
from core.backend_api import (
    get_characters_by_vk_id, 
    find_character,
    # update_character_data # Пока не используем
)

# --- Команды для игроков ---

def my_characters(vk, event, args):
    """Показывает список персонажей, привязанных к VK ID игрока, через API."""
    try:
        # Используем новую функцию для запроса к API
        chars = get_characters_by_vk_id(event.user_id)
        
        # Обрабатываем случай, когда API недоступен или вернул ошибку
        if chars is None:
            vk.messages.send(peer_id=event.peer_id, message="⚠️ Не удалось связаться с сервером анкет. Попробуйте позже.", random_id=get_random_id())
            return

        if not chars:
            message = "❌ У вас пока нет персонажей со статусом 'Принято'."
        else:
            message = "🎭 Ваши персонажи:\n"
            for char in chars:
                # Поля могут отличаться, берем из ответа API
                message += f"• ID: {char.get('id')} | {char.get('character_name')} (Ранг: {char.get('rank', 'N/A')}, Статус: {char.get('status', 'N/A')})\n"
        
        vk.messages.send(peer_id=event.peer_id, message=message, random_id=get_random_id())
    except Exception as e:
        logging.error(f"Ошибка при получении персонажей для vk_id {event.user_id}: {e}")
        vk.messages.send(peer_id=event.peer_id, message="⚠️ Произошла внутренняя ошибка бота.", random_id=get_random_id())

def character_info(vk, event, args):
    """Показывает информацию о конкретном персонаже по его ID или имени через API."""
    if not args:
        vk.messages.send(peer_id=event.peer_id, message="❓ Укажите ID или имя персонажа.", random_id=get_random_id())
        return

    identifier = " ".join(args)
    try:
        # Используем новую функцию для запроса к API
        char = find_character(identifier)

        if char is None:
             vk.messages.send(peer_id=event.peer_id, message="⚠️ Не удалось связаться с сервером анкет или персонаж не найден.", random_id=get_random_id())
             return

        # attributes и aura_cells теперь должны быть объектами, а не JSON-строками
        attributes = char.get('attributes', {})
        aura_cells = char.get('aura_cells', {})
        
        attr_str = ", ".join([f"{k}: {v}" for k, v in attributes.items()]) if attributes else "Нет"
        cells_str = ", ".join([f"{k}: {v}" for k, v in aura_cells.items()]) if aura_cells else "Нет"

        message = (
            f"👤 Персонаж: {char.get('character_name', 'N/A')} (ID: {char.get('id', 'N/A')})\n"
            f"💰 Кредиты: {char.get('currency', 0)} ₭\n"
            f"💪 Атрибуты: {attr_str}\n"
            f"✨ Ячейки ауры: {cells_str}"
        )
        
        vk.messages.send(peer_id=event.peer_id, message=message, random_id=get_random_id())
    except Exception as e:
        logging.error(f"Ошибка при поиске персонажа '{identifier}': {e}")
        vk.messages.send(peer_id=event.peer_id, message="⚠️ Произошла внутренняя ошибка бота при поиске персонажа.", random_id=get_random_id())

# --- Команды для админов ---

# @admin_required
# def set_currency(vk, event, args):
#     """
#     (ВРЕМЕННО ОТКЛЮЧЕНО)
#     Устанавливает, добавляет или вычитает кредиты персонажу.
#     """
#     vk.messages.send(peer_id=event.peer_id, message="⚠️ Команда временно отключена до настройки безопасного API-ключа.", random_id=get_random_id())
