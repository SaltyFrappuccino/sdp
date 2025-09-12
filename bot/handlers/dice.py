import random
import re
from core import utils

def roll(vk, event, args):
    """
    Обрабатывает бросок кубиков в формате NdM[+/-]K.
    Пример: 1d100, 2d6+5, 5d20-3
    """
    if not args:
        utils.send_message(vk, event.peer_id, "🎲 Пожалуйста, укажите, какие кости бросить (например, 'sdp roll 2d6+3').")
        return

    roll_str = "".join(args).lower()
    
    # Регулярное выражение для парсинга строки броска
    match = re.match(r'^(?P<num>\d*)d(?P<sides>\d+)(?P<mod_op>[+-])?(?P<mod_val>\d+)?$', roll_str)

    if not match:
        utils.send_message(vk, event.peer_id, "❌ Неверный формат броска. Используйте формат NdM+K (например, 2d6-3).")
        return

    data = match.groupdict()
    
    num_dice = int(data['num']) if data['num'] else 1
    sides = int(data['sides'])
    modifier = 0
    if data['mod_op'] and data['mod_val']:
        modifier = int(data['mod_op'] + data['mod_val'])

    # Проверка на адекватность значений
    if num_dice > 1000000 or sides > 1000000:
        utils.send_message(vk, event.peer_id, "✋ Слишком много кубиков или граней. Максимум: 100d1000.")
        return

    # Бросаем кубики
    rolls = [random.randint(1, sides) for _ in range(num_dice)]
    total = sum(rolls) + modifier

    # Формируем красивый ответ
    rolls_str = f"[{', '.join(map(str, rolls))}]"
    mod_str = ""
    if modifier > 0:
        mod_str = f" + {modifier}"
    elif modifier < 0:
        mod_str = f" - {abs(modifier)}"

    result_message = f"🎲 Бросок {roll_str}:\n{rolls_str}{mod_str} = {total}"

    try:
        utils.send_message(vk, event.peer_id, result_message)
    except Exception as e:
        error_message = f"Произошла ошибка при отправке результатов: {e}"
        utils.send_message(vk, event.peer_id, error_message)
