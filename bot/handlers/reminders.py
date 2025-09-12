import re
import sqlite3
import logging
from datetime import datetime, timedelta
from core.utils import get_random_id
from handlers.admin import parse_user_id

def parse_time(time_str: str) -> timedelta | None:
    """Парсит строку времени (напр., '1д', '5ч', '30м') и возвращает timedelta."""
    match = re.match(r'(\d+)([дмчс])', time_str.lower())
    if not match:
        return None
    
    value, unit = int(match.group(1)), match.group(2)
    
    if unit == 'д':
        return timedelta(days=value)
    elif unit == 'ч':
        return timedelta(hours=value)
    elif unit == 'м':
        return timedelta(minutes=value)
    elif unit == 'с':
        return timedelta(seconds=value)
    return None

def add_reminder(target_vk_id: int, setter_vk_id: int, message: str, due_date: datetime):
    """Добавляет напоминание в базу данных."""
    conn = sqlite3.connect('bot.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO reminders (target_vk_id, setter_vk_id, message, due_date) VALUES (?, ?, ?, ?)",
        (target_vk_id, setter_vk_id, message, due_date)
    )
    conn.commit()
    conn.close()

def remind_command(vk, event, args):
    """
    Устанавливает напоминание для пользователя.
    Пример: psd напомнить [id123|Пользователь] через 1д написать пост
    """
    if len(args) < 4 or args[1] != "через":
        vk.messages.send(
            peer_id=event.peer_id,
            message="❓ Неверный формат. Пример: `psd напомнить @user через 1д написать пост`",
            random_id=get_random_id()
        )
        return

    target_id = parse_user_id(args[0])
    if not target_id:
        vk.messages.send(peer_id=event.peer_id, message="❌ Не удалось распознать пользователя.", random_id=get_random_id())
        return

    delta = parse_time(args[2])
    if not delta:
        vk.messages.send(peer_id=event.peer_id, message="❌ Неверный формат времени. Используйте: д, ч, м, с. Например: `2д`, `5ч`, `30м`.", random_id=get_random_id())
        return

    reminder_message = " ".join(args[3:])
    due_date = datetime.now() + delta
    
    try:
        add_reminder(target_id, event.user_id, reminder_message, due_date)
        vk.messages.send(
            peer_id=event.peer_id,
            message=f"✅ Напоминание для [id{target_id}|пользователя] установлено на {due_date.strftime('%Y-%m-%d %H:%M:%S')}.",
            random_id=get_random_id()
        )
    except Exception as e:
        logging.error(f"Ошибка при создании напоминания: {e}")
        vk.messages.send(peer_id=event.peer_id, message="⚠️ Не удалось установить напоминание.", random_id=get_random_id())
