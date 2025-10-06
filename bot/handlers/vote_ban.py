import logging
import time
from typing import Dict, Set
import vk_api
from core.utils import get_random_id, send_message
from database import get_or_create_user

# Структура для хранения активных голосований
# {peer_id: {target_user_id: {'initiator': user_id, 'votes_for': set(), 'votes_against': set(), 'timestamp': time, 'message_id': int}}}
ACTIVE_VOTES: Dict[int, Dict[int, Dict]] = {}

# Настройки голосования
VOTE_DURATION = 30  # 30 секунд на голосование для теста
VOTES_REQUIRED_PERCENTAGE = 0.6  # 60% голосов "за" для бана
MIN_VOTES = 3  # Минимум 3 голоса "за" для бана

# ID реакций VK - будут определены автоматически
REACTION_LIKE = None  # 👍 - будет определено через API
REACTION_DISLIKE = None  # 👎 - будет определено через API
REACTIONS_INITIALIZED = False

def init_reactions(vk):
    """
    Инициализирует ID реакций через VK API.
    Вызывается один раз при первом использовании.
    """
    global REACTION_LIKE, REACTION_DISLIKE, REACTIONS_INITIALIZED
    
    if REACTIONS_INITIALIZED:
        return
    
    try:
        # Получаем список доступных реакций
        assets = vk.messages.getReactionsAssets()
        reaction_ids = assets.get('reaction_ids', [])
        
        logging.info(f"Доступные реакции VK: {reaction_ids}")
        
        # По умолчанию используем первые две реакции
        # Обычно это лайк (1) и дизлайк (2), но лучше проверить
        if len(reaction_ids) >= 2:
            REACTION_LIKE = reaction_ids[0]  # Обычно это "❤️" или "👍"
            REACTION_DISLIKE = reaction_ids[1] if len(reaction_ids) > 1 else reaction_ids[0]
        else:
            # Фоллбэк на стандартные значения
            REACTION_LIKE = 1
            REACTION_DISLIKE = 2
        
        REACTIONS_INITIALIZED = True
        logging.info(f"Реакции инициализированы: LIKE={REACTION_LIKE}, DISLIKE={REACTION_DISLIKE}")
    except Exception as e:
        logging.error(f"Не удалось получить список реакций: {e}")
        # Используем значения по умолчанию
        REACTION_LIKE = 1
        REACTION_DISLIKE = 2
        REACTIONS_INITIALIZED = True


def get_message_reactions(vk, peer_id, conversation_message_id):
    """
    Получает реакции на сообщение через API.
    Возвращает словарь {user_id: reaction_id}
    """
    try:
        result = vk.messages.getMessagesReactions(
            peer_id=peer_id,
            cmids=conversation_message_id
        )
        
        reactions = {}
        if result and 'items' in result:
            for item in result['items']:
                if 'reactions' in item:
                    for reaction in item['reactions']:
                        # Получаем список пользователей с этой реакцией
                        user_ids = reaction.get('user_ids', [])
                        reaction_id = reaction.get('reaction_id')
                        
                        for uid in user_ids:
                            reactions[uid] = reaction_id
        
        return reactions
    except Exception as e:
        logging.error(f"Ошибка при получении реакций: {e}")
        return {}


def _format_vote_message(vk, target_id, votes_for_count, votes_against_count, time_left):
    """Форматирует сообщение о голосовании."""
    try:
        user_info = vk.users.get(user_ids=target_id)[0]
        user_mention = f"[id{target_id}|{user_info['first_name']} {user_info['last_name']}]"
    except Exception as e:
        logging.error(f"Не удалось получить информацию о пользователе {target_id}: {e}")
        user_mention = f"[id{target_id}|пользователь]"
    
    total_votes = votes_for_count + votes_against_count
    percentage = (votes_for_count / total_votes * 100) if total_votes > 0 else 0
    
    # Определяем текст в зависимости от инициализированных реакций
    if REACTION_LIKE and REACTION_DISLIKE:
        reaction_info = f"Ставьте реакции на это сообщение для голосования!\n(Первая реакция = ЗА, Вторая = ПРОТИВ)"
    else:
        reaction_info = "Ставьте реакции на это сообщение для голосования!"
    
    return f"""🔥 ГОЛОСОВАНИЕ ЗА БАН! 🔥

Пользователь {user_mention} номинирован на бан.

📊 Текущий счёт:
👍 ЗА: {votes_for_count}
👎 ПРОТИВ: {votes_against_count}
📈 Поддержка: {percentage:.0f}%

⏱ Осталось времени: {time_left} сек.
🎯 Требуется: минимум {MIN_VOTES} голосов "за" и {int(VOTES_REQUIRED_PERCENTAGE * 100)}% поддержки

{reaction_info}"""


def start_ban_vote(vk, event):
    """
    Начинает голосование за бан пользователя.
    Команда должна быть ответом на сообщение того, кого хотят забанить.
    """
    # event - это словарь с данными сообщения
    peer_id = event.get('peer_id')
    initiator_id = event.get('from_id')
    
    # Проверяем, есть ли reply_message
    if 'reply_message' not in event or not event['reply_message']:
        try:
            vk.messages.send(
                peer_id=peer_id,
                message="❌ Используйте эту команду в ответ на сообщение того, кого хотите забанить.",
                random_id=get_random_id()
            )
        except Exception as e:
            logging.error(f"Ошибка отправки сообщения: {e}")
        return
    
    target_id = event['reply_message'].get('from_id')
    
    # Проверки
    if not target_id:
        try:
            vk.messages.send(
                peer_id=peer_id,
                message="❌ Не удалось определить пользователя для бана.",
                random_id=get_random_id()
            )
        except Exception as e:
            logging.error(f"Ошибка отправки сообщения: {e}")
        return
        
    if target_id == initiator_id:
        try:
            vk.messages.send(
                peer_id=peer_id,
                message="🤡 Ты не можешь начать голосование за бан самого себя, умник.",
                random_id=get_random_id()
            )
        except Exception as e:
            logging.error(f"Ошибка отправки сообщения: {e}")
        return
    
    # Проверяем, не админ ли цель
    target_user = get_or_create_user(target_id)
    if target_user.get('role') == 'admin':
        try:
            vk.messages.send(
                peer_id=peer_id,
                message="🚫 Нельзя забанить администратора. Хорошая попытка.",
                random_id=get_random_id()
            )
        except Exception as e:
            logging.error(f"Ошибка отправки сообщения: {e}")
        return
    
    # Проверяем, нет ли уже активного голосования
    if peer_id in ACTIVE_VOTES and target_id in ACTIVE_VOTES[peer_id]:
        existing_vote = ACTIVE_VOTES[peer_id][target_id]
        time_left = int(VOTE_DURATION - (time.time() - existing_vote['timestamp']))
        if time_left > 0:
            try:
                vk.messages.send(
                    peer_id=peer_id,
                    message=f"⚠️ Голосование за бан этого пользователя уже идёт! Осталось {time_left} секунд.",
                    random_id=get_random_id()
                )
            except Exception as e:
                logging.error(f"Ошибка отправки сообщения: {e}")
            return
    
    # Создаем голосование
    if peer_id not in ACTIVE_VOTES:
        ACTIVE_VOTES[peer_id] = {}
    
    # Отправляем сообщение и сохраняем его ID
    message_text = _format_vote_message(vk, target_id, 0, 0, VOTE_DURATION)
    
    # Инициализируем реакции, если ещё не сделали
    init_reactions(vk)
    
    try:
        response = vk.messages.send(
            peer_id=peer_id,
            message=message_text,
            random_id=get_random_id()
        )
        message_id = response
        
        # Получаем conversation_message_id для опроса реакций
        try:
            msg_info = vk.messages.getById(message_ids=message_id)
            cmid = msg_info['items'][0]['conversation_message_id'] if msg_info and 'items' in msg_info else None
        except Exception as e:
            logging.error(f"Не удалось получить conversation_message_id: {e}")
            cmid = None
        
        ACTIVE_VOTES[peer_id][target_id] = {
            'initiator': initiator_id,
            'votes_for': set(),
            'votes_against': set(),
            'timestamp': time.time(),
            'message_id': message_id,
            'conversation_message_id': cmid,
            'target_id': target_id
        }
        
        logging.info(f"Начато голосование за бан пользователя {target_id} в чате {peer_id}, message_id: {message_id}, cmid: {cmid}")
    except Exception as e:
        logging.error(f"Ошибка при создании голосования: {e}")


def update_votes_from_reactions(vk, peer_id, target_id):
    """
    Обновляет голоса на основе реакций, полученных через API.
    """
    if peer_id not in ACTIVE_VOTES or target_id not in ACTIVE_VOTES[peer_id]:
        return
    
    vote_data = ACTIVE_VOTES[peer_id][target_id]
    cmid = vote_data.get('conversation_message_id')
    
    if not cmid:
        return
    
    # Получаем текущие реакции на сообщение
    reactions = get_message_reactions(vk, peer_id, cmid)
    
    # Очищаем старые голоса
    vote_data['votes_for'].clear()
    vote_data['votes_against'].clear()
    
    # Заполняем новыми на основе реакций
    for user_id, reaction_id in reactions.items():
        if reaction_id == REACTION_LIKE:
            vote_data['votes_for'].add(user_id)
        elif reaction_id == REACTION_DISLIKE:
            vote_data['votes_against'].add(user_id)
    
    logging.debug(f"Обновлены голоса: {len(vote_data['votes_for'])} за, {len(vote_data['votes_against'])} против")


def update_vote_message(vk, peer_id, target_id):
    """
    Обновляет сообщение с голосованием, отображая текущий счёт.
    """
    if peer_id not in ACTIVE_VOTES or target_id not in ACTIVE_VOTES[peer_id]:
        return
    
    vote_data = ACTIVE_VOTES[peer_id][target_id]
    message_id = vote_data.get('message_id')
    
    if not message_id:
        return
    
    time_elapsed = time.time() - vote_data['timestamp']
    time_left = max(0, int(VOTE_DURATION - time_elapsed))
    
    votes_for = len(vote_data['votes_for'])
    votes_against = len(vote_data['votes_against'])
    
    new_message = _format_vote_message(vk, target_id, votes_for, votes_against, time_left)
    
    try:
        vk.messages.edit(
            peer_id=peer_id,
            message_id=message_id,
            message=new_message
        )
    except Exception as e:
        logging.error(f"Не удалось обновить сообщение голосования: {e}")


def check_and_finalize_votes(vk, peer_id):
    """
    Проверяет все активные голосования в чате и завершает те, у которых истекло время.
    """
    if peer_id not in ACTIVE_VOTES:
        return
    
    current_time = time.time()
    votes_to_remove = []
    
    for target_id, vote_data in ACTIVE_VOTES[peer_id].items():
        time_elapsed = current_time - vote_data['timestamp']
        
        # Обновляем сообщение каждые несколько секунд, если время идёт
        if time_elapsed < VOTE_DURATION:
            # Получаем актуальные реакции и обновляем голоса
            update_votes_from_reactions(vk, peer_id, target_id)
            # Обновляем таймер в сообщении
            update_vote_message(vk, peer_id, target_id)
            continue
        
        # Голосование завершено
        votes_for = len(vote_data['votes_for'])
        votes_against = len(vote_data['votes_against'])
        total_votes = votes_for + votes_against
        message_id = vote_data.get('message_id')
        
        # Получаем информацию о пользователе
        try:
            user_info = vk.users.get(user_ids=target_id)[0]
            user_mention = f"[id{target_id}|{user_info['first_name']} {user_info['last_name']}]"
        except Exception as e:
            logging.error(f"Не удалось получить информацию о пользователе {target_id}: {e}")
            user_mention = f"[id{target_id}|пользователь]"
        
        if votes_for >= MIN_VOTES and total_votes > 0:
            percentage_for = votes_for / total_votes
            
            if percentage_for >= VOTES_REQUIRED_PERCENTAGE:
                # БАН!
                try:
                    # Пытаемся кикнуть пользователя из чата
                    vk.messages.removeChatUser(chat_id=peer_id - 2000000000, member_id=target_id)
                    
                    message = f"""🔨 ВЕРДИКТ: БАН! 🔨

{user_mention} исключён из чата по результатам голосования.

📊 Результаты:
👍 ЗА: {votes_for}
👎 ПРОТИВ: {votes_against}
📈 Поддержка: {int(percentage_for * 100)}%

Демократия победила! 🎉"""
                    logging.info(f"Пользователь {target_id} забанен в чате {peer_id} по результатам голосования")
                except vk_api.exceptions.ApiError as e:
                    logging.error(f"Не удалось кикнуть пользователя {target_id}: {e}")
                    message = f"""❌ ОШИБКА

Голосование завершилось в пользу бана ({votes_for} за, {votes_against} против), но не удалось исключить пользователя из чата. Возможно, у бота нет прав администратора."""
            else:
                # Недостаточно поддержки
                message = f"""✅ ВЕРДИКТ: НЕ БАНИТЬ

{user_mention} остаётся в чате.

📊 Результаты:
👍 ЗА: {votes_for}
👎 ПРОТИВ: {votes_against}
📈 Поддержка: {int(percentage_for * 100)}% (требовалось {int(VOTES_REQUIRED_PERCENTAGE * 100)}%)

Народ решил дать второй шанс."""
        else:
            # Недостаточно голосов
            message = f"""❌ ГОЛОСОВАНИЕ ОТМЕНЕНО

Недостаточно голосов для бана {user_mention}.

📊 Результаты:
👍 ЗА: {votes_for} (требовалось минимум {MIN_VOTES})
👎 ПРОТИВ: {votes_against}

Попробуйте ещё раз, если уверены."""
        
        # Редактируем исходное сообщение с финальным результатом
        if message_id:
            try:
                vk.messages.edit(
                    peer_id=peer_id,
                    message_id=message_id,
                    message=message
                )
            except Exception as e:
                logging.error(f"Не удалось обновить сообщение с результатом: {e}")
                # Если не получилось отредактировать, отправляем новое
                try:
                    vk.messages.send(peer_id=peer_id, message=message, random_id=get_random_id())
                except Exception as e2:
                    logging.error(f"Не удалось отправить сообщение с результатом: {e2}")
        else:
            # Отправляем новое сообщение, если ID не сохранён
            try:
                vk.messages.send(peer_id=peer_id, message=message, random_id=get_random_id())
            except Exception as e:
                logging.error(f"Не удалось отправить сообщение с результатом: {e}")
        
        votes_to_remove.append(target_id)
    
    # Удаляем завершённые голосования
    for target_id in votes_to_remove:
        del ACTIVE_VOTES[peer_id][target_id]
    
    # Если голосований больше нет, удаляем ключ чата
    if not ACTIVE_VOTES[peer_id]:
        del ACTIVE_VOTES[peer_id]


def vote_command(vk, event, vote_type: str):
    """
    Обрабатывает голос пользователя за или против бана.
    vote_type: 'за' или 'против'
    """
    # event - это словарь с данными сообщения
    peer_id = event.get('peer_id')
    voter_id = event.get('from_id')
    
    # Для упрощения: ищем любое активное голосование в этом чате
    # В идеале нужно проверять, что это ответ именно на сообщение с голосованием
    if peer_id not in ACTIVE_VOTES or not ACTIVE_VOTES[peer_id]:
        send_message(vk, peer_id, "❌ В этом чате нет активных голосований за бан.")
        return
    
    # Берём первое активное голосование (упрощение)
    target_id = list(ACTIVE_VOTES[peer_id].keys())[0]
    
    vote_data = ACTIVE_VOTES[peer_id][target_id]
    
    # Проверяем, не голосовал ли уже пользователь
    if voter_id in vote_data['votes_for'] or voter_id in vote_data['votes_against']:
        send_message(vk, peer_id, "⚠️ Вы уже проголосовали!")
        return
    
    # Добавляем голос
    if vote_type == 'за':
        vote_data['votes_for'].add(voter_id)
        emoji = "👍"
    else:
        vote_data['votes_against'].add(voter_id)
        emoji = "👎"
    
    votes_for = len(vote_data['votes_for'])
    votes_against = len(vote_data['votes_against'])
    
    send_message(vk, peer_id, f"{emoji} Ваш голос учтён! Текущий счёт: {votes_for} за, {votes_against} против.")


def ban_vote_command(vk, event, args):
    """Команда 'Этого баним нахуй' - начинает голосование за бан."""
    start_ban_vote(vk, event)

