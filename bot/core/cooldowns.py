import json
import time
import os

# Структура для хранения времени последнего использования команды пользователем
# { "user_id": { "command_name": timestamp } }
USER_COOLDOWNS = {}

# Структура для хранения настроек кулдаунов для каждой команды
# { "command_name": seconds }
COMMAND_COOLDOWNS = {
    # Устанавливаем кулдауны по умолчанию для самых "спамных" команд
    "roll": 30,
    "r": 30,
    "gif": 30,
    "grok": 30,
    "нейронка": 30,
    "doesheknow": 30,
}
DEFAULT_COOLDOWN = 0 # По умолчанию кулдауна нет
SETTINGS_FILE = "settings.json"

def load_cooldown_settings():
    """Загружает настройки кулдаунов из settings.json."""
    global COMMAND_COOLDOWNS
    # Сначала устанавливаем базовые кулдауны
    base_cooldowns = { "roll": 30, "r": 30, "gif": 30 }

    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            user_settings = json.load(f)
            # Обновляем базовые настройки пользовательскими, чтобы пользователь мог их переопределить
            base_cooldowns.update(user_settings)
    
    COMMAND_COOLDOWNS = base_cooldowns
    # Сохраняем, чтобы файл settings.json всегда был актуален, даже при первом запуске
    save_cooldown_settings()

def save_cooldown_settings():
    """Сохраняет текущие настройки кулдаунов в settings.json."""
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(COMMAND_COOLDOWNS, f, indent=4, ensure_ascii=False)

def check_cooldown(user_id: int, command: str) -> float:
    """
    Проверяет, находится ли команда на кулдауне для данного пользователя.
    Возвращает оставшееся время в секундах или 0, если кулдауна нет.
    """
    cooldown_duration = COMMAND_COOLDOWNS.get(command, DEFAULT_COOLDOWN)
    
    # Если кулдаун для команды установлен на 0, то его нет
    if cooldown_duration <= 0:
        return 0

    last_used = USER_COOLDOWNS.get(user_id, {}).get(command)

    if not last_used:
        return 0 # Команда еще не использовалась

    time_since_last_use = time.time() - last_used
    
    if time_since_last_use < cooldown_duration:
        return round(cooldown_duration - time_since_last_use, 1) # Возвращаем оставшееся время
    
    return 0 # Кулдаун прошел

def check_cooldown_and_notify(vk, user_id, peer_id, command_name) -> bool:
    """
    Проверяет кулдаун и отправляет уведомление, если он активен.
    Возвращает True, если кулдаун активен (команду выполнять НЕЛЬЗЯ), иначе False.
    """
    remaining_time = check_cooldown(user_id, command_name)
    if remaining_time > 0:
        from core.utils import send_message # Локальный импорт для избежания циклической зависимости
        send_message(
            vk,
            peer_id,
            f"⏳ Команда на перезарядке. Пожалуйста, подождите {remaining_time} сек."
        )
        return True
    return False


def set_cooldown(user_id: int, command: str):
    """Устанавливает временную метку последнего использования команды."""
    if user_id not in USER_COOLDOWNS:
        USER_COOLDOWNS[user_id] = {}
    USER_COOLDOWNS[user_id][command] = time.time()
