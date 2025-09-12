import json
import os
import random
import re
from vk_api.vk_api import VkApiMethod
import logging

# --- Камодзи для Сглыпы ---
KAOMOJI_LIST = [
    "(^ω^)", "(´• ω •`)", "(´♡‿♡`)", "(─‿‿─)", "(*^‿^*)",
    "(´｡• ᵕ •｡`)", "(´• ω •`) ♡", "(⁄ ⁄•⁄ω⁄•⁄ ⁄)", "(◡‿◡ *)",
    "ヽ(>∀<☆)ノ", "(ﾉ´ヮ`)ﾉ*: ･ﾟ", "(*꒦ິ꒳꒦ີ)", "(ಥ﹏ಥ)",
    "(´-ω-`)", "(；￣Д￣)", "(￣ヘ￣)", "(＃`Д´)", "(-_-)",
    "ヽ( `д´*)ノ", "(」°ロ°)」", "Σ(°ロ°)", "(⊙_⊙)", "щ(゜ロ゜щ)",
    "¯\\_(ツ)_/¯", "(⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)", "♪(･ω･)ﾉ", "(´∀｀)♡", "(*μ_μ)"
]

# --- Состояние режима Сглыпы ---
# { peer_id: model }
MARKOV_MODELS = {}
# { peer_id }
SGLYPA_MODE_CHATS = set()
# { peer_id }
AUTISM_MODE_CHATS = set()

# --- Состояние для детектора мемов ---
# { peer_id_str: [msg1, msg2, ...] } - хранит нормализованные последние сообщения
RECENT_MESSAGES = {}
MEME_HISTORY_LENGTH = 3 # Сколько последних сообщений помнить для сравнения
MEME_BOOST_FACTOR = 5  # Во сколько раз усилить вес "мема" при обучении

DATA_FILE = "sglypa_data.json"

def load_sglypa_data():
    """Загружает модели и активные чаты из файла."""
    global MARKOV_MODELS, SGLYPA_MODE_CHATS, AUTISM_MODE_CHATS
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            MARKOV_MODELS = data.get("models", {})
            # peer_id в json сохраняются как строки, нужно конвертировать обратно в int
            SGLYPA_MODE_CHATS = set(map(int, data.get("active_chats", [])))
            AUTISM_MODE_CHATS = set(map(int, data.get("autism_chats", [])))

def save_sglypa_data():
    """Сохраняет текущие модели и активные чаты в файл."""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        data = {
            "models": MARKOV_MODELS,
            "active_chats": list(SGLYPA_MODE_CHATS),
            "autism_chats": list(AUTISM_MODE_CHATS)
        }
        json.dump(data, f, ensure_ascii=False, indent=4)

def clean_text(text):
    """Очищает текст от мусора для построения модели."""
    # Удаляем URL
    text = re.sub(r'https?://\S+', '', text)
    # Удаляем упоминания ([id123|...])
    text = re.sub(r'\[id\d+\|.*?\]', '', text)
    # Оставляем только слова на кириллице и латинице и пробелы
    text = re.sub(r'[^a-zA-Zа-яА-ЯёЁ\s]', '', text).lower()
    return text.split()

def build_model(peer_id, messages: list[str], boost: int = 1):
    """Строит или обновляет модель Маркова для чата на основе сообщений."""
    peer_id_str = str(peer_id)
    # Получаем существующую модель или создаем новую, чтобы не терять старые знания
    model = MARKOV_MODELS.get(peer_id_str, {})
    
    for message in messages:
        words = clean_text(message)
        if len(words) < 2:
            continue
        
        for i in range(len(words) - 1):
            current_word = words[i]
            next_word = words[i+1]
            if current_word not in model:
                model[current_word] = {}
            if next_word not in model[current_word]:
                model[current_word][next_word] = 0
            model[current_word][next_word] += boost
            
    MARKOV_MODELS[peer_id_str] = model
    save_sglypa_data()


def process_message_for_learning(peer_id, message_text: str):
    """
    Проверяет сообщение на повторение (мем) и вызывает обучение с соответствующим усилением.
    """
    # Приводим сообщение к единому виду для сравнения
    normalized_text = message_text.strip().lower()
    if not normalized_text or len(normalized_text) < 3: # Игнорируем слишком короткие сообщения
        return

    peer_id_str = str(peer_id)
    history = RECENT_MESSAGES.get(peer_id_str, [])

    # Считаем сообщение "мемом", если оно совпадает с предыдущим
    is_meme = False
    if history and history[-1] == normalized_text:
        is_meme = True
    
    boost = MEME_BOOST_FACTOR if is_meme else 1
    if is_meme:
        logging.info(f"MEME DETECTED in chat {peer_id_str}! Boosting weight for: '{message_text}'")

    build_model(peer_id, [message_text], boost=boost)

    # Обновляем историю последних сообщений
    history.append(normalized_text)
    RECENT_MESSAGES[peer_id_str] = history[-MEME_HISTORY_LENGTH:]


def generate_response(peer_id, length=15, tries=10):
    """Генерирует ответ на основе модели Маркова для чата."""
    peer_id_str = str(peer_id)
    model = MARKOV_MODELS.get(peer_id_str)
    
    if not model:
        return None

    for _ in range(tries):
        # Выбираем случайное начальное слово из всех возможных
        start_word = random.choice(list(model.keys()))
        
        # Проверяем, что у стартового слова есть продолжение
        if not model.get(start_word):
            continue

        result = [start_word]
        current_word = start_word
        for _ in range(length - 1):
            # Проверяем, есть ли текущее слово в модели и есть ли у него продолжения
            if current_word not in model or not model[current_word]:
                break
            
            # Получаем возможные следующие слова и их "вес" (частоту)
            next_word_options = list(model[current_word].keys())
            weights = list(model[current_word].values())
            
            # Выбираем следующее слово с учетом веса
            next_word = random.choices(next_word_options, weights=weights, k=1)[0]
            
            result.append(next_word)
            current_word = next_word
        
        # Убедимся, что сгенерировалось хотя бы несколько слов
        if len(result) > 2:
            base_message = ' '.join(result)
            # Добавляем каомодзи, только если режим для чата включен
            if peer_id in AUTISM_MODE_CHATS and random.random() < 0.7:
                kaomoji = random.choice(KAOMOJI_LIST)
                return f"{base_message} {kaomoji}"
            return base_message

    return None # Если за все попытки не удалось сгенерировать нормальный ответ
