import os
import vk_api
from vk_api.bot_longpoll import VkBotLongPoll, VkBotEventType
from dotenv import load_dotenv
import logging
from types import SimpleNamespace
from apscheduler.schedulers.background import BackgroundScheduler
import sqlite3
from datetime import datetime
import pytz
import random
import re
import time

from database import init_db, set_user_role
from core.utils import get_random_id, send_message
from handlers import admin, general, dice, character, reminders, help, gifs, handbook
from core import cooldowns, sglypa

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Словарь команд
COMMANDS = {
    'start': general.start,
    'начать': general.start,
    'пиво': general.beer_command,
    'roll': dice.roll,
    'r': dice.roll,
    'напомнить': reminders.remind_command,
    'персонажи': character.my_characters,
    'инфо': character.character_info,
    'помощь': help.help_command,
    'gif': gifs.get_gif,
    'справочник': handbook.handbook_command,
    # Админ-команды
    'датьадминку': admin.promote_to_admin,
    'снятьадминку': admin.demote_to_user,
    'админы': admin.show_admins,
    'помощьадминам': help.admin_help_command,
    'setcd': admin.set_cooldown_command,
    'cd': admin.list_cooldowns_command,
    'sglypa': admin.sglypa_mode_command
}
PREFIXES = ['sdp', '&']

# Определяем ID бота для фильтрации сообщений от самого себя
GROUP_ID_STR = os.getenv("GROUP_ID")
BOT_ID = -int(GROUP_ID_STR) if GROUP_ID_STR and GROUP_ID_STR.isdigit() else None


# --- Кэш участников чата ---
CHAT_MEMBERS_CACHE = {}
CACHE_LIFETIME_SECONDS = 600 # 10 минут

def get_chat_members(vk, peer_id):
    """Получает список участников чата, используя кэш."""
    now = time.time()
    
    # Проверяем кэш
    if peer_id in CHAT_MEMBERS_CACHE:
        cache_entry = CHAT_MEMBERS_CACHE[peer_id]
        if now - cache_entry['timestamp'] < CACHE_LIFETIME_SECONDS:
            return cache_entry['members']

    # Если в кэше нет или он устарел, делаем запрос к API
    try:
        members_response = vk.messages.getConversationMembers(peer_id=peer_id)
        # Фильтруем только ID пользователей (они положительные)
        user_ids = [member['member_id'] for member in members_response['items'] if member['member_id'] > 0]
        
        # Обновляем кэш
        CHAT_MEMBERS_CACHE[peer_id] = {
            'members': user_ids,
            'timestamp': now
        }
        return user_ids
    except vk_api.ApiError as e:
        logging.error(f"Не удалось получить участников чата {peer_id}: {e}")
        # В случае ошибки возвращаем пустой список и не кэшируем
        return []


def check_reminders(vk):
    """Проверяет и отправляет просроченные напоминания (только для чатов)."""
    try:
        conn = sqlite3.connect('bot.db')
        cursor = conn.cursor()
        
        utc_tz = pytz.utc
        now = datetime.now(utc_tz)
        
        # Выбираем только напоминания из чатов (peer_id > 2000000000)
        cursor.execute("SELECT id, target_vk_id, setter_vk_id, message, peer_id FROM reminders WHERE due_date <= ? AND sent = 0 AND peer_id > 2000000000", (now,))
        due_reminders = cursor.fetchall()

        for rem in due_reminders:
            rem_id, target_id, setter_id, msg, peer_id = rem
            
            reminder_text = f"🔔 [id{target_id}|Пользователь], вам напоминание от [id{setter_id}|пользователя]: «{msg}»"

            try:
                # Используем новую функцию для отправки
                send_message(vk, peer_id, reminder_text)
                
                # Помечаем как отправленное в случае успеха
                cursor.execute("UPDATE reminders SET sent = 1 WHERE id = ?", (rem_id,))
            except Exception as send_error:
                logging.error(f"Не удалось отправить напоминание ID {rem_id} в чат {peer_id}: {send_error}")
        
        conn.commit()
        conn.close()
        if due_reminders:
            logging.info(f"Обработано {len(due_reminders)} напоминаний для чатов.")
    except Exception as e:
        logging.error(f"Критическая ошибка при проверке напоминаний: {e}")

def setup_admins(vk, group_id):
    """При запуске делает администраторами бота всех руководителей группы."""
    try:
        managers = vk.groups.getMembers(group_id=group_id, filter='managers')
        manager_ids = [manager['id'] for manager in managers['items']]
        
        for manager_id in manager_ids:
            set_user_role(manager_id, 'admin')
        
        if manager_ids:
            logging.info(f"Назначены права администратора {len(manager_ids)} руководителям.")

    except vk_api.ApiError as e:
        logging.error(f"Ошибка VK API при получении списка руководителей: {e}")
    except Exception as e:
        logging.error(f"Неизвестная ошибка при назначении админов: {e}")


def main():
    """Основная функция запуска бота."""
    load_dotenv()
    vk_token = os.getenv('VK_TOKEN')
    group_id = os.getenv('GROUP_ID')

    if not vk_token or not group_id:
        logging.error("VK_TOKEN и GROUP_ID должны быть указаны в .env файле.")
        return

    try:
        init_db()
        logging.info("База данных успешно инициализирована.")
    except Exception as e:
        logging.error(f"Ошибка инициализации БД: {e}")
        return

    try:
        vk_session = vk_api.VkApi(token=vk_token)
        # Используем VkBotLongPoll для работы от имени сообщества
        longpoll = VkBotLongPoll(vk_session, group_id)
        vk = vk_session.get_api()
        logging.info("Авторизация в VK прошла успешно.")
    except Exception as error_msg:
        logging.error(f"Ошибка авторизации VK: {error_msg}")
        return
    
    # Инициализация базы данных
    init_db()

    # Загружаем настройки кулдаунов
    cooldowns.load_cooldown_settings()
    # Загружаем данные Сглыпы
    sglypa.load_sglypa_data()

    # Назначение админских прав руководителям группы
    setup_admins(vk, group_id)

    # Запускаем планировщик для проверки напоминаний
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(check_reminders, 'interval', minutes=1, args=[vk])
    scheduler.start()
    logging.info("Планировщик для напоминаний запущен.")

    logging.info("Бот запущен и слушает сообщения...")

    for event in longpoll.listen():
        # Используем VkBotEventType.MESSAGE_NEW
        if event.type == VkBotEventType.MESSAGE_NEW:
            
            # Игнорируем сообщения из личных чатов
            if event.obj.message['peer_id'] < 2000000000:
                continue

            message_obj = event.obj.message
            from_id = message_obj.get('from_id')

            # Адаптируем структуру event'а, чтобы не переписывать обработчики
            event_for_handler = SimpleNamespace(
                user_id=from_id,
                peer_id=event.obj.message['peer_id'],
                text=event.obj.message['text']
            )

            logging.info(f"Новое сообщение от {event_for_handler.user_id} в чате {event_for_handler.peer_id}: '{event_for_handler.text}'")
            
            message_text = event_for_handler.text
            
            # Проверяем, начинается ли сообщение с префикса
            is_command = False
            for prefix in PREFIXES:
                if message_text.lower().startswith(prefix):
                    is_command = True
                    break
            
            # Если режим Сглыпы включен для чата
            if event_for_handler.peer_id in sglypa.SGLYPA_MODE_CHATS:
                # --- Логика Сглыпы ---
                # Она срабатывает только если это НЕ команда
                if not is_command:
                    is_from_bot = (from_id == BOT_ID)
                    # Простое регулярное выражение для фильтрации строк, похожих на логи
                    is_log_message = bool(re.match(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}', message_text))

                    # Учимся и отвечаем только на сообщения от людей, не похожие на логи
                    if not is_from_bot and not is_log_message:
                        
                        # --- Логика ответов Сглыпы ---
                        
                        # 1. С некоторой вероятностью отвечаем сгенерированной фразой
                        if random.random() < 0.2: # 20% шанс ответа
                            response = sglypa.generate_response(event_for_handler.peer_id)
                            if response:
                                send_message(vk, event_for_handler.peer_id, response)

                        # 2. С другой, меньшей вероятностью, кидаем "подкол"
                        if random.random() < 0.05: # 1% шанс
                            members = get_chat_members(vk, event_for_handler.peer_id)
                            if members:
                                random_member_id = random.choice(members)
                                troll_message = f"Я знаю, что [id{random_member_id}|Ты] дрочишь."
                                send_message(vk, event_for_handler.peer_id, troll_message)
                        
                        # 3. В любом случае сразу обучаемся на сообщении
                        if message_text:
                            sglypa.build_model(event_for_handler.peer_id, [message_text])

                    continue # Переходим к следующему сообщению, т.к. это было не-командное сообщение

            # Если это команда, обрабатываем ее
            if is_command:
                used_prefix = None
                for prefix in PREFIXES:
                    if message_text.lower().startswith(prefix) and not prefix.endswith(' '):
                        used_prefix = prefix
                        command_body = message_text[len(prefix):].strip()
                        break
                    elif message_text.lower().startswith(prefix + ' '):
                        used_prefix = prefix
                        command_body = message_text[len(prefix):].strip()
                        break

                if used_prefix is None:
                    continue

                command_parts = command_body.split()
                command = command_parts[0].lower()
                args = command_parts[1:]
                
                command_func = COMMANDS.get(command)
                
                if command_func:
                    # Админские команды и команда помощи не имеют кулдауна
                    is_admin_command = command_func in [
                        admin.promote_to_admin, admin.demote_to_user, admin.show_admins, 
                        help.admin_help_command, admin.set_cooldown_command, admin.list_cooldowns_command
                    ]
                    
                    if not is_admin_command:
                        # Проверяем кулдаун для обычных команд
                        remaining_time = cooldowns.check_cooldown(event_for_handler.user_id, command)
                        if remaining_time > 0:
                            send_message(
                                vk,
                                event_for_handler.peer_id,
                                f"⏳ Команда `{command}` на перезарядке. Пожалуйста, подождите {remaining_time} сек."
                            )
                            continue # Прерываем выполнение команды

                    try:
                        # Передаем vk_session в обработчики, которым это нужно
                        if command_func == gifs.get_gif:
                            command_func(vk, event_for_handler, args, vk_session=vk_session)
                        else:
                            command_func(vk, event_for_handler, args)
                        
                        # Если команда выполнена успешно, устанавливаем кулдаун
                        if not is_admin_command:
                            cooldowns.set_cooldown(event_for_handler.user_id, command)

                    except Exception as e:
                        logging.error(f"Ошибка при выполнении команды '{command}': {e}")
                        send_message(
                            vk,
                            event_for_handler.peer_id,
                            "Произошла ошибка при выполнении команды. Администратор уже уведомлен."
                        )
                else:
                    # Если команда не найдена
                    send_message(vk, event_for_handler.peer_id, "иди нахуй")

if __name__ == '__main__':
    main()
