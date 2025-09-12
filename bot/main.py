import os
import vk_api
from vk_api.bot_longpoll import VkBotLongPoll, VkBotEventType
from dotenv import load_dotenv
import logging
from types import SimpleNamespace
from apscheduler.schedulers.background import BackgroundScheduler
import sqlite3
from datetime import datetime

from database import init_db, set_user_role
from core.utils import get_random_id
from handlers import admin, general, dice, character, reminders, help

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Словарь команд
COMMANDS = {
    # Общие команды
    'привет': general.greet,
    'начать': general.start,
    'помощь': help.help_command,
    # Админские команды
    'датьадминку': admin.promote_to_admin,
    'снятьадминку': admin.demote_to_user,
    'админы': admin.show_admins,
    'помощьадминам': help.admin_help_command,
    # Игровые команды
    'roll': dice.roll,
    'r': dice.roll,
    # Команды персонажей
    'персонажи': character.my_characters,
    'инфо': character.character_info,
    # 'кредиты': character.set_currency, # Временно отключено
    # Команды напоминаний
    'напомнить': reminders.remind_command,
}
PREFIXES = ['sdp', '&']


def check_reminders(vk):
    """Проверяет и отправляет просроченные напоминания."""
    try:
        conn = sqlite3.connect('bot.db')
        cursor = conn.cursor()
        now = datetime.now()
        
        cursor.execute("SELECT id, target_vk_id, setter_vk_id, message FROM reminders WHERE due_date <= ? AND sent = 0", (now,))
        due_reminders = cursor.fetchall()

        for rem in due_reminders:
            rem_id, target_id, setter_id, msg = rem
            reminder_text = f"🔔 [id{setter_id}|Пользователь] просил вам напомнить: «{msg}»"
            vk.messages.send(
                user_id=target_id, # Напоминания отправляем в ЛС
                message=reminder_text,
                random_id=get_random_id()
            )
            # Помечаем как отправленное
            cursor.execute("UPDATE reminders SET sent = 1 WHERE id = ?", (rem_id,))
        
        conn.commit()
        conn.close()
        if due_reminders:
            logging.info(f"Отправлено {len(due_reminders)} напоминаний.")
    except Exception as e:
        logging.error(f"Ошибка при проверке напоминаний: {e}")

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
    
    # Назначение админов при старте
    setup_admins(vk, group_id)

    # Запускаем планировщик для проверки напоминаний
    scheduler = BackgroundScheduler(timezone="Europe/Moscow")
    scheduler.add_job(check_reminders, 'interval', minutes=1, args=[vk])
    scheduler.start()
    logging.info("Планировщик для напоминаний запущен.")

    logging.info("Бот запущен и слушает сообщения...")

    for event in longpoll.listen():
        # Используем VkBotEventType.MESSAGE_NEW
        if event.type == VkBotEventType.MESSAGE_NEW:
            message = event.obj.message
            
            # Адаптируем структуру event'а, чтобы не переписывать обработчики
            event_for_handler = SimpleNamespace(
                user_id=message['from_id'],
                peer_id=message['peer_id'],
                text=message['text']
            )

            logging.info(f"Новое сообщение от {event_for_handler.user_id} в чате {event_for_handler.peer_id}: '{event_for_handler.text}'")
            
            message_text = event_for_handler.text.strip()
            
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
            
            handler = COMMANDS.get(command)
            if handler:
                try:
                    handler(vk, event_for_handler, args)
                except Exception as e:
                    logging.error(f"Ошибка при выполнении команды '{command}': {e}")
                    vk.messages.send(
                        peer_id=event_for_handler.peer_id,
                        message="Произошла внутренняя ошибка при выполнении команды.",
                        random_id=get_random_id()
                    )
            else:
                 vk.messages.send(
                    peer_id=event_for_handler.peer_id,
                    message="Я пока не понимаю эту команду. Попробуйте написать 'sdp привет' или '&начать'.",
                    random_id=get_random_id()
                )

if __name__ == '__main__':
    main()
