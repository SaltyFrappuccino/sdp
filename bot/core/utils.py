import random

def get_random_id():
    """Генерирует случайный ID для сообщения VK."""
    return random.getrandbits(31) * random.choice([-1, 1])
