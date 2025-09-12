import re
import logging
from core.permissions import admin_required
from core.utils import get_random_id, send_message
from database import set_user_role, get_users_by_role, get_or_create_user
from core import cooldowns, sglypa
import vk_api.exceptions
import vk_api

def parse_user_id(text_mention: str) -> int | None:
    """Извлекает ID пользователя из упоминания '[id123|Name]' или простого текста."""
    match = re.search(r"\[id(\d+)\|.+\]", text_mention)
    if match:
        return int(match.group(1))
    # Проверяем, является ли аргумент просто числом (ID)
    if text_mention.isdigit():
        return int(text_mention)
    return None

@admin_required
def sglypa_mode_command(vk, event, args):
    """Управляет режимом Сглыпы. Формат: sdp sglypa [on|off|learn]"""
    if not args or args[0] not in ['on', 'off', 'learn']:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp sglypa [on|off|learn]`")
        return

    action = args[0]
    peer_id = event.peer_id

    if action == 'on':
        sglypa.SGLYPA_MODE_CHATS.add(peer_id)
        sglypa.save_sglypa_data()
        message = "✅ Режим Сглыпы активирован для этого чата."
    
    elif action == 'off':
        if peer_id in sglypa.SGLYPA_MODE_CHATS:
            sglypa.SGLYPA_MODE_CHATS.remove(peer_id)
            # При выключении режима можно сразу обучиться на том, что есть в памяти
            peer_id_str = str(peer_id)
            messages_to_learn = sglypa.MESSAGE_MEMORY.get(peer_id_str, [])
            if messages_to_learn:
                sglypa.build_model(peer_id, messages_to_learn)
            sglypa.save_sglypa_data()
            message = "👽 Режим Сглыпы выключен. Я запомнил всё, что вы тут написали. До новых встреч."
        else:
            message = "👽 Режим Сглыпы уже был выключен."
    else:
        message = "Неверный аргумент. Используйте 'on' или 'off'."

    send_message(vk, peer_id, message)


@admin_required
def set_cooldown_command(vk, event, args):
    """Устанавливает кулдаун для команды. Формат: sdp setcd <команда> <секунды>"""
    if len(args) != 2:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp setcd <команда> <секунды>`\nНапример: `sdp setcd gif 60`")
        return

    command, time_str = args
    try:
        seconds = int(time_str)
        if seconds < 0:
            raise ValueError
    except ValueError:
        send_message(vk, event.peer_id, "🚫 Время должно быть положительным целым числом.")
        return
    
    cooldowns.COMMAND_COOLDOWNS[command] = seconds
    cooldowns.save_cooldown_settings()

    if seconds == 0:
        message = f"✅ Кулдаун для команды `{command}` был убран."
    else:
        message = f"✅ Установлен кулдаун для команды `{command}`: {seconds} сек."

    send_message(vk, event.peer_id, message)


@admin_required
def list_cooldowns_command(vk, event, args):
    """Показывает список текущих настроек кулдаунов."""
    
    # Убедимся, что загружены последние настройки
    cooldowns.load_cooldown_settings()

    if not cooldowns.COMMAND_COOLDOWNS:
        message = "ℹ️ Не установлено ни одного персонального кулдауна."
    else:
        message = "⚙️ Текущие настройки кулдаунов:\n\n"
        for command, seconds in cooldowns.COMMAND_COOLDOWNS.items():
            if seconds > 0: # Показываем только те, у которых есть кулдаун
                message += f"🔹 `{command}`: {seconds} сек.\n"
    
    message += "\nℹ️ Для всех остальных команд кулдаун отсутствует. Вы можете добавить его командой `setcd`."

    send_message(vk, event.peer_id, message)


def set_role_command(vk, event, args, role_to_set: str, role_name: str):
    """Общая функция для установки роли."""
    if not args:
        send_message(vk, event.peer_id, f"❓ Укажите ID пользователя. Пример: sdp датьадминку [id123|Пользователь]")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, f"❌ Не удалось распознать ID пользователя.")
        return
        
    try:
        # Убедимся, что целевой пользователь существует в БД
        get_or_create_user(target_id)
        set_user_role(target_id, role_to_set)
        send_message(vk, event.peer_id, f"✅ Пользователю [id{target_id}|пользователь] выданы права '{role_name}'.")
    except Exception as e:
        logging.error(f"Ошибка при установке роли для {target_id}: {e}")
        send_message(vk, event.peer_id, f"⚠️ Произошла ошибка при обновлении роли.")

def promote_to_admin(vk, event, args):
    """Назначает пользователю роль администратора."""
    set_role_command(vk, event, args, role_to_set='admin', role_name='Администратор')

def demote_to_user(vk, event, args):
    """Снимает с пользователя права администратора."""
    set_role_command(vk, event, args, role_to_set='user', role_name='Пользователь')

@admin_required
def show_admins(vk, event, args):
    """Показывает список всех администраторов."""
    try:
        admin_ids = get_users_by_role('admin')
        if not admin_ids:
            message = "Список администраторов пуст."
        else:
            # Получаем информацию о пользователях от VK API
            users_info = vk.users.get(user_ids=','.join(map(str, admin_ids)))
            
            admin_mentions = []
            for user in users_info:
                # Создаем упоминание вида [id123|Имя Фамилия]
                admin_mentions.append(f"[id{user['id']}|{user['first_name']} {user['last_name']}]")
            
            message = "Список администраторов:\n" + "\n".join(admin_mentions)
        
        send_message(vk, event.peer_id, message)
    except Exception as e:
        logging.error(f"Ошибка при получении списка админов: {e}")
        send_message(vk, event.peer_id, "⚠️ Не удалось получить список администраторов.")


@admin_required
def autism_command(vk, event, args):
    """Включает/выключает режим Аутизма для Сглыпы в текущем чате."""
    peer_id = event.peer_id
    if peer_id in sglypa.AUTISM_MODE_CHATS:
        sglypa.AUTISM_MODE_CHATS.remove(peer_id)
        message = "Режим Аутизма для Сглыпы ВЫКЛЮЧЕН. (´-ω-`)"
    else:
        sglypa.AUTISM_MODE_CHATS.add(peer_id)
        message = "Режим Аутизма для Сглыпы ВКЛЮЧЕН. (^ω^)"
    
    sglypa.save_sglypa_data()
    send_message(vk, peer_id, message)
