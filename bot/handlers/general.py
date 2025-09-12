from core.utils import get_random_id

def greet(vk, event, args):
    """Отправляет приветственное сообщение."""
    vk.messages.send(
        peer_id=event.peer_id,
        message="Привет! Я бот проекта Salty's Dream Project. Чем могу помочь?",
        random_id=get_random_id()
    )

def start(vk, event, args):
    """Отправляет сообщение при команде 'начать'."""
    vk.messages.send(
        peer_id=event.peer_id,
        message="Добро пожаловать в Salty's Dream Project! Отправьте команду, чтобы взаимодействовать со мной.",
        random_id=get_random_id()
    )
