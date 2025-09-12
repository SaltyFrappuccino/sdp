import sqlite3
import logging

def init_db():
    """Инициализирует базу данных и создает необходимые таблицы."""
    conn = sqlite3.connect('bot.db')
    cursor = conn.cursor()

    # Таблица для связи пользователей VK с их игровыми персонажами
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vk_id INTEGER UNIQUE NOT NULL,
            character_id INTEGER,
            role TEXT DEFAULT 'user' NOT NULL,
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Проверяем, существует ли колонка role, и добавляем ее, если нет (для обратной совместимости)
    try:
        cursor.execute("SELECT role FROM users LIMIT 1")
    except sqlite3.OperationalError:
        logging.info("Добавляю колонку 'role' в таблицу 'users'.")
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL")

    # Таблица для хранения каких-либо игровых состояний или настроек
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_state (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    # Таблица для напоминаний
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setter_vk_id INTEGER NOT NULL,
            target_vk_id INTEGER NOT NULL,
            peer_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            due_date TIMESTAMP NOT NULL,
            sent INTEGER DEFAULT 0
        )
    ''')
    
    # Добавляем столбец peer_id, если его нет (для обратной совместимости)
    try:
        cursor.execute("ALTER TABLE reminders ADD COLUMN peer_id INTEGER NOT NULL DEFAULT 0;")
    except sqlite3.OperationalError:
        pass # Столбец уже существует

    conn.commit()
    conn.close()

def get_or_create_user(vk_id: int):
    """
    Получает пользователя из БД по его vk_id. Если пользователь не найден, создает нового с ролью 'user'.
    Возвращает словарь с данными пользователя.
    """
    conn = sqlite3.connect('bot.db')
    cursor = conn.cursor()
    cursor.execute("SELECT vk_id, role FROM users WHERE vk_id = ?", (vk_id,))
    user = cursor.fetchone()
    
    if user:
        conn.close()
        return {'vk_id': user[0], 'role': user[1]}
    else:
        logging.info(f"Создан новый пользователь с vk_id: {vk_id}")
        cursor.execute("INSERT INTO users (vk_id) VALUES (?)", (vk_id,))
        conn.commit()
        conn.close()
        return {'vk_id': vk_id, 'role': 'user'}

def set_user_role(vk_id: int, role: str):
    """Устанавливает пользователю указанную роль."""
    get_or_create_user(vk_id) # Убедимся, что пользователь существует
    conn = sqlite3.connect('bot.db')
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = ? WHERE vk_id = ?", (role, vk_id))
    conn.commit()
    conn.close()
    logging.info(f"Пользователю {vk_id} установлена роль '{role}'.")

def get_users_by_role(role: str) -> list:
    """Возвращает список vk_id пользователей с указанной ролью."""
    conn = sqlite3.connect('bot.db')
    cursor = conn.cursor()
    cursor.execute("SELECT vk_id FROM users WHERE role = ?", (role,))
    users = cursor.fetchall()
    conn.close()
    return [user[0] for user in users]


if __name__ == '__main__':
    init_db()
    print("База данных 'bot.db' успешно инициализирована.")
