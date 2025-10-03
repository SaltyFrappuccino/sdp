from functools import wraps
from database import get_or_create_user
from core.utils import get_random_id, send_message

def admin_required(func):
    """
    Декоратор, который проверяет, является ли пользователь администратором.
    """
    @wraps(func)
    def wrapper(vk, event, args, **kwargs):
        # Убедимся, что пользователь существует в нашей БД
        user = get_or_create_user(event.user_id)
        
        if user['role'] != 'admin':
            send_message(vk, event.peer_id, "⛔ У вас нет прав для выполнения этой команды.")
            return
        return func(vk, event, args, **kwargs)
    return wrapper

def check_admin_permissions(vk, user_id, peer_id):
    """
    Проверяет права администратора и отправляет сообщение об ошибке, если их нет.
    Возвращает True, если пользователь админ, иначе False.
    """
    user = get_or_create_user(user_id)
    
    if user['role'] != 'admin':
        send_message(vk, peer_id, "⛔ У вас нет прав для выполнения этой команды.")
        return False
    
    return True

def is_admin(peer_id, user_id):
    """
    Проверяет, является ли пользователь админом в данном чате.
    """
    user = get_or_create_user(user_id)
    # TODO: Добавить проверку админов самого чата VK
    return user and user.get('role') == 'admin'
