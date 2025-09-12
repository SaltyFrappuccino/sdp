from vkbottle.bot import BotLabeler, Message
from vkbottle.dispatch.rules.base import FuncRule
import random

from core.game_logic import Deck, get_hand_value, format_hand

games_labeler = BotLabeler()

# --- Состояние игр ---
# Простое внутри-памяти хранилище. При перезапуске бота все игры сбрасываются.
# { chat_id: { "game_type": "blackjack", "deck": Deck, "player_hand": [], "dealer_hand": [], "status": "active" } }
active_games = {}


# --- Игра: Блэкджек (21) ---

def is_game_active(chat_id: int, game_type: str) -> bool:
    """Проверяет, активна ли уже игра в этом чате."""
    return chat_id in active_games and active_games[chat_id]["game_type"] == game_type


@games_labeler.message()
async def start_blackjack(message: Message):
    """Начинает новую игру в Блэкджек."""
    chat_id = message.chat_id
    if is_game_active(chat_id, "blackjack"):
        await message.answer("Игра в блэкджек уже идет в этом чате. Завершите ее, прежде чем начинать новую.")
        return

    deck = Deck()
    player_hand = [deck.deal(), deck.deal()]
    dealer_hand = [deck.deal(), deck.deal()]

    active_games[chat_id] = {
        "game_type": "blackjack",
        "deck": deck,
        "player_hand": player_hand,
        "dealer_hand": dealer_hand,
        "status": "active"
    }

    player_score = get_hand_value(player_hand)
    
    response = (
        f"🃏 Началась игра в Блэкджек!\n"
        f"Ваши карты: {format_hand(player_hand)} (Очки: {player_score})\n"
        f"Карта дилера: {dealer_hand[0]}\n\n"
        f"Чтобы взять еще карту, напишите `sdp взять`.\n"
        f"Чтобы остановиться, напишите `sdp хватит`."
    )
    
    # Проверяем на блэкджек у игрока сразу
    if player_score == 21:
        dealer_score = get_hand_value(dealer_hand)
        response = (
            f"🃏 У вас Блэкджек! Ваши карты: {format_hand(player_hand)} (Очки: 21)\n"
            f"Карты дилера: {format_hand(dealer_hand)} (Очки: {dealer_score})\n"
        )
        if dealer_score == 21:
            response += "🤯 Ничья! У дилера тоже блэкджек."
        else:
            response += "🎉 Поздравляю с победой!"
        del active_games[chat_id]

    await message.answer(response)

@games_labeler.message()
async def blackjack_hit(message: Message):
    """Игрок берет еще одну карту."""
    chat_id = message.chat_id
    if not is_game_active(chat_id, "blackjack"):
        await message.answer("Игра в блэкджек не начата. Напишите `sdp блэкджек`, чтобы начать.")
        return

    game = active_games[chat_id]
    game["player_hand"].append(game["deck"].deal())
    player_score = get_hand_value(game["player_hand"])

    response = f"Вы взяли карту.\nВаши карты: {format_hand(game['player_hand'])} (Очки: {player_score})"

    if player_score > 21:
        response += "\n\n💥 Перебор! Вы проиграли."
        del active_games[chat_id]
    elif player_score == 21:
        response += "\n\n🔥 21! Отличная рука! Теперь ход дилера."
        await message.answer(response)
        # Если у игрока 21, ход автоматически переходит дилеру
        await end_blackjack_game(message)
        return

    await message.answer(response)


@games_labeler.message()
async def blackjack_stand(message: Message):
    """Игрок решает остановиться, ход переходит к дилеру."""
    chat_id = message.chat_id
    if not is_game_active(chat_id, "blackjack"):
        await message.answer("Игра в блэкджек не начата. Напишите `sdp блэкджек`, чтобы начать.")
        return
    
    await message.answer("Вы решили остановиться. Дилер открывает карты...")
    await end_blackjack_game(message)


async def end_blackjack_game(message: Message):
    """Логика завершения игры и определения победителя."""
    chat_id = message.chat_id
    if not is_game_active(chat_id, "blackjack"):
        return

    game = active_games[chat_id]
    player_score = get_hand_value(game["player_hand"])
    dealer_hand = game["dealer_hand"]
    dealer_score = get_hand_value(dealer_hand)
    
    # Дилер добирает карты по правилу "до 17"
    while dealer_score < 17:
        dealer_hand.append(game["deck"].deal())
        dealer_score = get_hand_value(dealer_hand)

    response = (
        f"Ваши карты: {format_hand(game['player_hand'])} (Очки: {player_score})\n"
        f"Карты дилера: {format_hand(dealer_hand)} (Очки: {dealer_score})\n\n"
    )

    if dealer_score > 21:
        response += "딜 Дилер проиграл! У него перебор. Вы победили!"
    elif dealer_score == player_score:
        response += "🤯 Ничья!"
    elif dealer_score > player_score:
        response += "👎 Увы, дилер победил."
    else:
        response += "🎉 Поздравляю, вы победили!"

    await message.answer(response)
    del active_games[chat_id]
