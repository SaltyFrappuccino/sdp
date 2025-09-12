from core.utils import send_message

def start(vk, event, args):
    """Отправляет приветственное сообщение."""
    user_info = vk.users.get(user_ids=event.user_id)[0]
    first_name = user_info.get('first_name', 'Пользователь')
    message = f"👋 Привет, {first_name}! Я бот для Salty's Dream Project. Используй 'sdp помощь', чтобы узнать список команд."
    send_message(vk, event.peer_id, message)

def beer_command(vk, event, args):
    """Отправляет сообщение с пивом."""
    send_message(vk, event.peer_id, "🍻 Держи кружечку холодного!")
