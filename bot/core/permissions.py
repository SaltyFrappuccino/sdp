from functools import wraps
from database import get_or_create_user
from core.utils import get_random_id

def admin_required(func):
    """
    Декоратор, который проверяет, является ли пользователь администратором.
    """
    @wraps(func)
    def wrapper(vk, event, args, **kwargs):
        # Убедимся, что пользователь существует в нашей БД
        user = get_or_create_user(event.user_id)
        
        if user['role'] != 'admin':
            vk.messages.send(
                peer_id=event.peer_id,
                message="⛔ У вас нет прав для выполнения этой команды.",
                random_id=get_random_id()
            )
            return
        return func(vk, event, args, **kwargs)
    return wrapper
