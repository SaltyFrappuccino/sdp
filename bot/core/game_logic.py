import random

# --- Логика для Блэкджека ---

SUITS = ["♥️", "♦️", "♣️", "♠️"]
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
VALUES = {"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10, "A": 11}

class Deck:
    """Представляет колоду карт."""
    def __init__(self):
        self.cards = [f"{rank}{suit}" for suit in SUITS for rank in RANKS]
        self.shuffle()

    def shuffle(self):
        """Перемешивает колоду."""
        random.shuffle(self.cards)

    def deal(self):
        """Сдает одну карту. Возвращает None, если колода пуста."""
        if self.cards:
            return self.cards.pop()
        return None

def get_hand_value(hand: list[str]) -> int:
    """Вычисляет стоимость карт в руке для Блэкджека."""
    value = 0
    aces = 0
    for card in hand:
        rank = card[:-2] if card.startswith("10") else card[0]
        value += VALUES[rank]
        if rank == "A":
            aces += 1

    # Корректируем стоимость тузов, если сумма превышает 21
    while value > 21 and aces:
        value -= 10
        aces -= 1

    return value

def format_hand(hand: list[str]) -> str:
    """Красиво форматирует руку для вывода в чат."""
    return " ".join(hand)
