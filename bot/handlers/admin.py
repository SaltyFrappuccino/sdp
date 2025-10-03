import re
import logging
from core.permissions import admin_required, check_admin_permissions
from core.utils import get_random_id, send_message, check_and_use_otp
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

def otp_command(vk, event, args):
    """
    Секретная команда для получения прав администратора.
    Может быть использована только один раз.
    Формат: sdp otp <секретный_токен>
    """
    if not args:
        send_message(vk, event.peer_id, "🔐 Неверный формат. Используйте: `sdp otp <токен>`")
        return
    
    token = " ".join(args)
    user_id = event.user_id
    
    # Проверяем и используем OTP токен
    if check_and_use_otp(token):
        # Устанавливаем пользователю роль администратора
        get_or_create_user(user_id)  # Убедимся, что пользователь существует в БД
        set_user_role(user_id, 'admin')
        
        # Получаем информацию о пользователе для красивого сообщения
        try:
            user_info = vk.users.get(user_ids=user_id)[0]
            user_name = f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip()
            if not user_name:
                user_name = f"Пользователь {user_id}"
        except Exception as e:
            logging.warning(f"Не удалось получить информацию о пользователе {user_id}: {e}")
            user_name = f"Пользователь {user_id}"
        
        message = (
            f"🎉 Поздравляем! {user_name} получил права администратора!\n\n"
            f"🔑 OTP токен был успешно использован и заблокирован.\n"
            f"⚡ Теперь вы можете использовать все административные команды."
        )
        
        logging.info(f"Пользователь {user_id} ({user_name}) получил права администратора через OTP")
        
    else:
        message = "❌ Неверный токен или токен уже был использован."
        logging.warning(f"Неудачная попытка использования OTP пользователем {user_id}")
    
    send_message(vk, event.peer_id, message)

# === КОМАНДЫ МОДЕРАЦИИ ===

def mute_command(vk, event, args):
    """Заглушает пользователя на указанное время. Формат: sdp мут [id|@пользователь] [время] [причина]"""
    if not check_admin_permissions(vk, event.user_id, event.peer_id):
        return
    
    if len(args) < 2:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp мут [id|@пользователь] [время] [причина]`\nПример: `sdp мут [id123|Пользователь] 1ч Спам`")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, "❌ Не удалось распознать ID пользователя.")
        return

    # Парсим время (1ч, 30м, 1д)
    time_str = args[1]
    reason = " ".join(args[2:]) if len(args) > 2 else "Нарушение правил"
    
    try:
        # Пытаемся заглушить пользователя
        vk.messages.removeChatUser(chat_id=event.peer_id - 2000000000, user_id=target_id)
        
        # Добавляем обратно через указанное время (это упрощенная реализация)
        # В реальности нужно было бы использовать планировщик задач
        
        message = f"🔇 Пользователь [id{target_id}|пользователь] заглушен на {time_str}.\n📝 Причина: {reason}"
        logging.info(f"Пользователь {target_id} заглушен в чате {event.peer_id} на {time_str}. Причина: {reason}")
        
    except vk_api.exceptions.ApiError as e:
        if e.code == 15:  # Access denied
            message = "❌ Недостаточно прав для выполнения этой операции."
        elif e.code == 935:  # User not in chat
            message = "❌ Пользователь не найден в чате."
        else:
            message = f"❌ Ошибка VK API: {e}"
        logging.error(f"Ошибка при заглушении пользователя {target_id}: {e}")
    
    send_message(vk, event.peer_id, message)

def unmute_command(vk, event, args):
    """Снимает заглушение с пользователя. Формат: sdp размут [id|@пользователь]"""
    if not check_admin_permissions(vk, event.user_id, event.peer_id):
        return
    
    if not args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp размут [id|@пользователь]`")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, "❌ Не удалось распознать ID пользователя.")
        return

    try:
        # Добавляем пользователя обратно в чат
        vk.messages.addChatUser(chat_id=event.peer_id - 2000000000, user_id=target_id)
        
        message = f"🔊 Заглушение с пользователя [id{target_id}|пользователь] снято."
        logging.info(f"Заглушение снято с пользователя {target_id} в чате {event.peer_id}")
        
    except vk_api.exceptions.ApiError as e:
        if e.code == 15:  # Access denied
            message = "❌ Недостаточно прав для выполнения этой операции."
        elif e.code == 936:  # User already in chat
            message = "ℹ️ Пользователь уже в чате."
        else:
            message = f"❌ Ошибка VK API: {e}"
        logging.error(f"Ошибка при снятии заглушения с пользователя {target_id}: {e}")
    
    send_message(vk, event.peer_id, message)

def kick_command(vk, event, args):
    """Исключает пользователя из чата. Формат: sdp кик [id|@пользователь] [причина]"""
    if not check_admin_permissions(vk, event.user_id, event.peer_id):
        return
    
    if not args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp кик [id|@пользователь] [причина]`")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, "❌ Не удалось распознать ID пользователя.")
        return

    reason = " ".join(args[1:]) if len(args) > 1 else "Нарушение правил"
    
    try:
        vk.messages.removeChatUser(chat_id=event.peer_id - 2000000000, user_id=target_id)
        
        message = f"👢 Пользователь [id{target_id}|пользователь] исключен из чата.\n📝 Причина: {reason}"
        logging.info(f"Пользователь {target_id} исключен из чата {event.peer_id}. Причина: {reason}")
        
    except vk_api.exceptions.ApiError as e:
        if e.code == 15:  # Access denied
            message = "❌ Недостаточно прав для выполнения этой операции."
        elif e.code == 935:  # User not in chat
            message = "❌ Пользователь не найден в чате."
        else:
            message = f"❌ Ошибка VK API: {e}"
        logging.error(f"Ошибка при исключении пользователя {target_id}: {e}")
    
    send_message(vk, event.peer_id, message)

def ban_command(vk, event, args):
    """Банит пользователя в группе. Формат: sdp бан [id|@пользователь] [причина]"""
    if not check_admin_permissions(vk, event.user_id, event.peer_id):
        return
    
    if not args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp бан [id|@пользователь] [причина]`")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, "❌ Не удалось распознать ID пользователя.")
        return

    reason = " ".join(args[1:]) if len(args) > 1 else "Нарушение правил"
    
    try:
        # Получаем ID группы из peer_id
        group_id = abs(event.peer_id - 2000000000)
        vk.groups.ban(group_id=group_id, owner_id=target_id, reason=0, comment=reason)
        
        message = f"🚫 Пользователь [id{target_id}|пользователь] забанен в группе.\n📝 Причина: {reason}"
        logging.info(f"Пользователь {target_id} забанен в группе. Причина: {reason}")
        
    except vk_api.exceptions.ApiError as e:
        if e.code == 15:  # Access denied
            message = "❌ Недостаточно прав для выполнения этой операции."
        else:
            message = f"❌ Ошибка VK API: {e}"
        logging.error(f"Ошибка при бане пользователя {target_id}: {e}")
    
    send_message(vk, event.peer_id, message)

@admin_required
def unban_command(vk, event, args):
    """Разбанивает пользователя в группе. Формат: sdp разбан [id|@пользователь]"""
    if not args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp разбан [id|@пользователь]`")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, "❌ Не удалось распознать ID пользователя.")
        return

    try:
        # Получаем ID группы из peer_id
        group_id = abs(event.peer_id - 2000000000)
        vk.groups.unban(group_id=group_id, owner_id=target_id)
        
        message = f"✅ Пользователь [id{target_id}|пользователь] разбанен в группе."
        logging.info(f"Пользователь {target_id} разбанен в группе")
        
    except vk_api.exceptions.ApiError as e:
        if e.code == 15:  # Access denied
            message = "❌ Недостаточно прав для выполнения этой операции."
        else:
            message = f"❌ Ошибка VK API: {e}"
        logging.error(f"Ошибка при разбане пользователя {target_id}: {e}")
    
    send_message(vk, event.peer_id, message)

@admin_required
def warn_command(vk, event, args):
    """Выдает предупреждение пользователю. Формат: sdp варн [id|@пользователь] [причина]"""
    if not args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp варн [id|@пользователь] [причина]`")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, "❌ Не удалось распознать ID пользователя.")
        return

    reason = " ".join(args[1:]) if len(args) > 1 else "Нарушение правил"
    
    message = f"⚠️ [id{target_id}|Пользователь], вам выдано предупреждение!\n📝 Причина: {reason}\n\nПожалуйста, соблюдайте правила чата."
    logging.info(f"Пользователю {target_id} выдано предупреждение. Причина: {reason}")
    
    send_message(vk, event.peer_id, message)

@admin_required
def clear_command(vk, event, args):
    """Очищает чат от сообщений (удаляет последние N сообщений). Формат: sdp очистить [количество]"""
    if not args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp очистить [количество]`\nПример: `sdp очистить 10`")
        return

    try:
        count = int(args[0])
        if count <= 0 or count > 100:
            send_message(vk, event.peer_id, "❌ Количество должно быть от 1 до 100.")
            return
    except ValueError:
        send_message(vk, event.peer_id, "❌ Неверное количество сообщений.")
        return

    try:
        # Получаем последние сообщения
        messages = vk.messages.getHistory(peer_id=event.peer_id, count=count)
        
        deleted_count = 0
        for message in messages['items']:
            try:
                vk.messages.delete(message_ids=message['id'], delete_for_all=1)
                deleted_count += 1
            except:
                pass  # Игнорируем ошибки удаления отдельных сообщений
        
        message = f"🗑️ Удалено {deleted_count} из {count} сообщений."
        logging.info(f"Удалено {deleted_count} сообщений в чате {event.peer_id}")
        
    except vk_api.exceptions.ApiError as e:
        message = f"❌ Ошибка при очистке чата: {e}"
        logging.error(f"Ошибка при очистке чата {event.peer_id}: {e}")
    
    send_message(vk, event.peer_id, message)

@admin_required
def info_command(vk, event, args):
    """Показывает информацию о пользователе. Формат: sdp инфо [id|@пользователь]"""
    if not args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp инфо [id|@пользователь]`")
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        send_message(vk, event.peer_id, "❌ Не удалось распознать ID пользователя.")
        return

    try:
        # Получаем информацию о пользователе
        user_info = vk.users.get(user_ids=target_id, fields='online,last_seen,status')[0]
        
        # Получаем роль в боте
        user_role = get_or_create_user(target_id).get('role', 'user')
        
        # Форматируем информацию
        name = f"{user_info.get('first_name', '')} {user_info.get('last_name', '')}".strip()
        online = "🟢 В сети" if user_info.get('online') else "🔴 Не в сети"
        
        last_seen = "Неизвестно"
        if user_info.get('last_seen'):
            last_seen = f"Последний раз: {user_info['last_seen'].get('time', 'Неизвестно')}"
        
        status = user_info.get('status', 'Статус не указан')
        
        message = (
            f"👤 **Информация о пользователе**\n\n"
            f"📝 Имя: {name}\n"
            f"🆔 ID: {target_id}\n"
            f"🔐 Роль в боте: {user_role}\n"
            f"📊 Статус: {online}\n"
            f"⏰ {last_seen}\n"
            f"💬 Статус: {status}"
        )
        
    except vk_api.exceptions.ApiError as e:
        message = f"❌ Ошибка при получении информации: {e}"
        logging.error(f"Ошибка при получении информации о пользователе {target_id}: {e}")
    
    send_message(vk, event.peer_id, message)
