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

from database import get_or_create_user, init_db, set_user_role
from core.utils import get_random_id, send_message
from handlers import admin, general, dice, character, reminders, help, gifs, handbook, ai_commands, games, vote_ban
from handlers.help import help_command, admin_help_command
from handlers.gifs import get_gif
from handlers.handbook import handbook_command
from handlers.ai_commands import sglypa_ai_command, grok_ai_command, image_generation_command, does_he_know_command, gigachat_ai_command
from handlers.rp_ai_commands import rp_ai_command, rp_judge_command
import core.cooldowns as cooldowns
import core.sglypa as sglypa
from vkbottle import Bot
from vkbottle.bot import Message, BotLabeler

# --- Адаптер для vkbottle ---
# Создаем фейковый объект bot, чтобы можно было использовать labeler'ы
bot = Bot(token="fake")
labeler = BotLabeler()

# --- Асинхронный обработчик для игр ---
# Так как новые хендлеры асинхронные, их нужно запускать в event loop'е
import asyncio

async def run_game_command(command_func, message_obj):
    """Запускает асинхронную команду игры."""
    # Создаем фейковый объект Message, совместимый с vkbottle
    vkbottle_message = Message(**message_obj)
    # Имитируем получение user'а, т.к. в старом коде этого нет напрямую в объекте
    vkbottle_message.from_id = message_obj['from_id']
    
    # Для /кости <num>
    args = message_obj['text'].split()
    kwargs = {}
    if len(args) > 1 and args[1].isdigit():
        kwargs['num'] = int(args[1])

    await command_func(vkbottle_message, **kwargs)


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
    'помощь': help_command,
    'gif': get_gif,
    'справочник': handbook_command,
    # Игровые команды
    'блэкджек': games.start_blackjack,
    'взять': games.blackjack_hit,
    'хватит': games.blackjack_stand,
    # Админ-команды
    'датьадминку': admin.promote_to_admin,
    'снятьадминку': admin.demote_to_user,
    'админы': admin.show_admins,
    'помощьадминам': admin_help_command,
    'setcd': admin.set_cooldown_command,
    'cd': admin.list_cooldowns_command,
    'sglypa': admin.sglypa_mode_command,
    'аутизм': admin.autism_command,
    # Нейро-команды
    'нейронка': sglypa_ai_command,
    'шедевр': image_generation_command,
    'rp': rp_ai_command,
    'гигачат': gigachat_ai_command,
    'судья': rp_judge_command
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


def check_ban_votes(vk):
    """Проверяет и завершает истекшие голосования за бан."""
    try:
        # Проверяем все активные голосования во всех чатах
        for peer_id in list(vote_ban.ACTIVE_VOTES.keys()):
            vote_ban.check_and_finalize_votes(vk, peer_id)
    except Exception as e:
        logging.error(f"Критическая ошибка при проверке голосований: {e}")

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


# === ГЛАВНЫЙ ЦИКЛ ОБРАБОТКИ СООБЩЕНИЙ ===
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
        # Увеличиваем wait до 90 секунд, чтобы избежать ReadTimeout
        longpoll = VkBotLongPoll(vk_session, group_id, wait=90)
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

    # Запускаем планировщик для проверки напоминаний и голосований
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(check_reminders, 'interval', minutes=1, args=[vk])
    scheduler.add_job(check_ban_votes, 'interval', seconds=10, args=[vk])  # Проверяем голосования каждые 10 секунд
    scheduler.start()
    logging.info("Планировщик для напоминаний и голосований запущен.")

    logging.info("Бот запущен и слушает сообщения...")

    while True:
        try:
            for event in longpoll.listen():
                try:
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
                            peer_id=message_obj.get('peer_id'),
                            text=message_obj.get('text')
                        )
                        # Для команд, работающих с ответами, нам нужен полный объект сообщения
                        full_message_object = message_obj

                        logging.info(f"Новое сообщение от {event_for_handler.user_id} в чате {event_for_handler.peer_id}: '{event_for_handler.text}'")
                        
                        message_text = event_for_handler.text
                        user_id = event_for_handler.user_id

                        # --- Обработка команд без префикса ---
                        lower_message = message_text.lower().strip()

                        # GROK - гибкий паттерн для разных вариантов написания
                        # Паттерн: (грок|grok)[,]? (это правда|is this true|правда|true)[?]?
                        grok_pattern = r'^(грок|grok)[,\s]+(это\s+правда|is\s+this\s+true|правда|true)\??$'
                        if re.match(grok_pattern, lower_message):
                            command_name = "grok"
                            if cooldowns.check_cooldown_and_notify(vk, user_id, event_for_handler.peer_id, command_name):
                                continue
                            ai_commands.grok_ai_command(vk, event.obj.message, [])
                            cooldowns.set_cooldown(user_id, command_name)
                            continue

                        # DOES HE KNOW?
                        if lower_message in ["does he know?", "знает ли он?"]:
                            command_name = "doesheknow"
                            if cooldowns.check_cooldown_and_notify(vk, user_id, event_for_handler.peer_id, command_name):
                                continue
                            ai_commands.does_he_know_command(vk, event.obj.message, [])
                            cooldowns.set_cooldown(user_id, command_name)
                            continue

                        # ГОЛОСОВАНИЕ ЗА БАН
                        if lower_message == "этого баним нахуй":
                            command_name = "ban_vote"
                            if cooldowns.check_cooldown_and_notify(vk, user_id, event_for_handler.peer_id, command_name):
                                continue
                            vote_ban.ban_vote_command(vk, full_message_object, [])
                            cooldowns.set_cooldown(user_id, command_name)
                            continue

                        # --- Обработка команд с префиксом ---
                        used_prefix = None
                        for prefix in PREFIXES:
                            if message_text.lower().startswith(prefix.lower()):
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
                        if not command_parts:
                            continue
                        
                        command_name = command_parts[0].lower()
                        args = command_parts[1:]

                        # --- Проверка кулдаунов (кроме админов) ---
                        if get_or_create_user(user_id).get('role') != 'admin':
                            if cooldowns.check_cooldown_and_notify(vk, user_id, event_for_handler.peer_id, command_name):
                                continue

                        command_func = COMMANDS.get(command_name)
                        
                        if command_func:
                            try:
                                # --- Обработка игровых асинхронных команд ---
                                if command_name in ['блэкджек', 'взять', 'хватит']:
                                    # Для асинхронных функций нужен event loop
                                    asyncio.run(run_game_command(command_func, event.obj.message))
                                    cooldowns.set_cooldown(user_id, command_name) # Ставим кулдаун после вызова
                                    continue # Переходим к следующему событию

                                # Команды с разными сигнатурами вызываются по-разному
                                if command_name in ["шедевр", "gif"]:
                                    command_func(vk, event_for_handler, args, vk_session)
                                elif command_name in ["rp", "судья"]:
                                    command_func(vk, vk_session, event_for_handler, args, event.obj.message)
                                elif command_name == "гигачат":
                                    # Гигачат нужен полный объект сообщения для извлечения контекста
                                    command_func(vk, event.obj.message, args)
                                else: # Для 'нейронка' и всех остальных стандартных команд
                                    command_func(vk, event_for_handler, args)

                                # Устанавливаем кулдаун после успешного выполнения
                                if get_or_create_user(user_id).get('role') != 'admin':
                                     cooldowns.set_cooldown(user_id, command_name)

                            except Exception as e:
                                logging.error(f"Ошибка при выполнении команды '{command_name}': {e}", exc_info=True)
                                send_message(vk, event_for_handler.peer_id, f"Произошла ошибка при выполнении команды '{command_name}'. Администратор уже уведомлен.")
                        else:
                            # Если команда не найдена
                            send_message(vk, event_for_handler.peer_id, "иди нахуй")

                except Exception as e:
                    logging.critical(f"Критическая ошибка при обработке события: {e}", exc_info=True)
                    peer_id = None
                    try:
                        # Пытаемся извлечь peer_id из события, чтобы уведомить чат
                        if event and hasattr(event, 'obj') and hasattr(event.obj, 'message'):
                            peer_id = event.obj.message.get('peer_id')
                    except Exception:
                        pass  # Игнорируем, если не удалось получить peer_id
                    
                    if peer_id and vk:
                        try:
                            error_message = f"💥 Произошла критическая ошибка. Бот продолжает работать. Администратор уведомлен."
                            send_message(vk, peer_id, error_message)
                        except Exception as notify_error:
                            logging.error(f"Не удалось отправить уведомление об ошибке в чат {peer_id}: {notify_error}")

        except Exception as e:
            logging.critical(f"Критическая ошибка в цикле longpoll.listen() (возможно, проблема с сетью): {e}", exc_info=True)
            logging.info("Переподключение через 15 секунд...")
            time.sleep(15)


if __name__ == '__main__':
    main()
