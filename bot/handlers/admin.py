import re
import logging
from core.permissions import admin_required
from core.utils import get_random_id
from database import set_user_role, get_users_by_role, get_or_create_user

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
def set_role_command(vk, event, args, role_to_set: str, role_name: str):
    """Общая функция для установки роли."""
    if not args:
        vk.messages.send(peer_id=event.peer_id, message=f"❓ Укажите ID пользователя. Пример: sdp датьадминку [id123|Пользователь]", random_id=get_random_id())
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        vk.messages.send(peer_id=event.peer_id, message=f"❌ Не удалось распознать ID пользователя.", random_id=get_random_id())
        return
        
    try:
        # Убедимся, что целевой пользователь существует в БД
        get_or_create_user(target_id)
        set_user_role(target_id, role_to_set)
        vk.messages.send(peer_id=event.peer_id, message=f"✅ Пользователю [id{target_id}|пользователь] выданы права '{role_name}'.", random_id=get_random_id())
    except Exception as e:
        logging.error(f"Ошибка при установке роли для {target_id}: {e}")
        vk.messages.send(peer_id=event.peer_id, message=f"⚠️ Произошла ошибка при обновлении роли.", random_id=get_random_id())

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
        
        vk.messages.send(peer_id=event.peer_id, message=message, random_id=get_random_id())
    except Exception as e:
        logging.error(f"Ошибка при получении списка админов: {e}")
        vk.messages.send(peer_id=event.peer_id, message="⚠️ Не удалось получить список администраторов.", random_id=get_random_id())
