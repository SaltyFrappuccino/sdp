import json
import logging
from core.permissions import admin_required
from core.utils import send_message
from core.backend_api import get_characters_by_vk_id, find_character

# --- Команды для игроков ---

def my_characters(vk, event, args):
    """Показывает список персонажей пользователя."""
    vk_id = event.user_id
    characters = get_characters_by_vk_id(vk_id)
    
    if not characters:
        send_message(vk, event.peer_id, "У вас пока нет персонажей.")
        return

    char_list = "\n".join([f"- {char['name']} (ID: {char['id']})" for char in characters])
    message = f"📜 Ваши персонажи:\n{char_list}"
    send_message(vk, event.peer_id, message)

def character_info(vk, event, args):
    """Показывает подробную информацию о персонаже."""
    if not args:
        send_message(vk, event.peer_id, "Пожалуйста, укажите имя или ID персонажа.")
        return

    query = " ".join(args)
    vk_id = event.user_id
    
    character = find_character(vk_id, query)

    if character:
        # Форматирование атрибутов
        attributes_str = "\n".join([f"  - {attr}: {value}" for attr, value in character.get('attributes', {}).items()])
        if not attributes_str:
            attributes_str = "  (не указаны)"

        # Форматирование ячеек ауры
        aura_cells = character.get('aura_cells')
        if isinstance(aura_cells, dict):
             aura_cells_str = "\n".join([f"  - {cell}: {count}" for cell, count in aura_cells.items()])
        else:
             aura_cells_str = "  (не указаны)"

        message = (
            f"👤 Персонаж: {character['name']} (ID: {character['id']})\n"
            f"💰 Кредиты: {character.get('credits', 'N/A')}\n"
            f"✨ Очки атрибутов: {character.get('attribute_points_total', 'N/A')}\n\n"
            f"📊 Атрибуты:\n{attributes_str}\n\n"
            f"🔮 Ячейки ауры:\n{aura_cells_str}"
        )
        send_message(vk, event.peer_id, message)
    else:
        send_message(vk, event.peer_id, f"Персонаж с именем или ID '{query}' не найден среди ваших персонажей.")

# --- Команды для админов ---

# @admin_required
# def set_currency(vk, event, args):
#     """
#     (ВРЕМЕННО ОТКЛЮЧЕНО)
#     Устанавливает, добавляет или вычитает кредиты персонажу.
#     """
#     vk.messages.send(peer_id=event.peer_id, message="⚠️ Команда временно отключена до настройки безопасного API-ключа.", random_id=get_random_id())
