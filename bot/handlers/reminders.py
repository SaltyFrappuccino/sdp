import re
import sqlite3
import logging
from datetime import datetime, timedelta
from core.utils import get_random_id, send_message
from handlers.admin import parse_user_id
import pytz

def parse_time(time_str: str) -> timedelta | None:
    """Парсит строку времени (напр., '1д', '5ч', '30м') и возвращает timedelta."""
    match = re.match(r'(\d+)([дмчс])', time_str.lower())
    if not match:
        send_message(vk, event.peer_id, "❌ Неверный формат времени. Используйте '1д', '5ч', '30м'.")
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
    else:
        return None

def add_reminder(target_vk_id: int, setter_vk_id: int, message: str, due_date: datetime, peer_id: int):
    """Добавляет напоминание в базу данных."""
    conn = sqlite3.connect('bot.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO reminders (target_vk_id, setter_vk_id, message, due_date, peer_id) VALUES (?, ?, ?, ?, ?)",
        (target_vk_id, setter_vk_id, message, due_date, peer_id)
    )
    conn.commit()
    conn.close()

def remind_command(vk, event, args):
    """Обрабатывает команду 'напомнить'."""
    # sdp напомнить [id123|@mention] через 1д 5ч написать пост
    
    if len(args) < 4 or 'через' not in args:
        send_message(vk, event.peer_id, "📝 Неверный формат. Используйте: `sdp напомнить <@пользователь> через <время> <текст>`")
        return

    mention = args[0]
    
    try:
        # Извлекаем ID из упоминания
        target_id = int(re.search(r"\[id(\d+)\|", mention).group(1))
    except (AttributeError, ValueError):
        send_message(vk, event.peer_id, "❌ Не удалось распознать пользователя. Убедитесь, что это корректное @упоминание.")
        return

    # Собираем время и текст
    time_parts = []
    text_parts_started = False
    text_parts = []

    for part in args[2:]: # Пропускаем mention и 'через'
        if not text_parts_started and re.match(r'^\d+[дчм]$', part, re.IGNORECASE):
            time_parts.append(part)
        else:
            text_parts_started = True
            text_parts.append(part)
    
    if not time_parts:
        send_message(vk, event.peer_id, "❌ Вы не указали время. Используйте '1д', '5ч', '30м'.")
        return
        
    total_delta = timedelta()
    for part in time_parts:
        delta = parse_time(part)
        if delta:
            total_delta += delta
        else:
            send_message(vk, event.peer_id, f"❌ Неверный формат времени: '{part}'.")
            return
            
    reminder_text = " ".join(text_parts)
    if not reminder_text:
        send_message(vk, event.peer_id, "📝 Вы не указали текст напоминания.")
        return
        
    try:
        due_date, due_date_moscow_str = add_reminder(target_id, event.user_id, reminder_text, total_delta, event.peer_id)
        send_message(vk, event.peer_id, f"✅ Хорошо, я напомню [id{target_id}|пользователю] {due_date_moscow_str}.")
    except Exception as e:
        send_message(vk, event.peer_id, f"🚫 Произошла ошибка при установке напоминания: {e}")
