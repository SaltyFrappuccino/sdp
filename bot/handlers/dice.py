import re
import random
from core.utils import get_random_id

def roll(vk, event, args):
    """
    Обрабатывает бросок кубиков в формате NdM[+/-]K.
    Пример: 1d100, 2d6+5, 5d20-3
    """
    if not args:
        vk.messages.send(
            peer_id=event.peer_id,
            message="❓ Укажите, какие кубики бросить. Пример: sdp roll 2d20+5",
            random_id=get_random_id()
        )
        return

    dice_string = "".join(args).lower()
    
    # Регулярное выражение для парсинга строки броска
    match = re.match(r'^(?P<num>\d*)d(?P<sides>\d+)(?P<mod_op>[+-])?(?P<mod_val>\d+)?$', dice_string)

    if not match:
        vk.messages.send(
            peer_id=event.peer_id,
            message="❌ Неверный формат броска. Используйте формат NdM+K (например, 2d6-3).",
            random_id=get_random_id()
        )
        return

    data = match.groupdict()
    
    num_dice = int(data['num']) if data['num'] else 1
    sides = int(data['sides'])
    modifier = 0
    if data['mod_op'] and data['mod_val']:
        modifier = int(data['mod_op'] + data['mod_val'])

    # Проверка на адекватность значений
    if num_dice > 100 or sides > 1000:
        vk.messages.send(
            peer_id=event.peer_id,
            message="✋ Слишком много кубиков или граней. Максимум: 100d1000.",
            random_id=get_random_id()
        )
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

    result_message = f"🎲 Бросок {dice_string}:\n{rolls_str}{mod_str} = {total}"

    vk.messages.send(
        peer_id=event.peer_id,
        message=result_message,
        random_id=get_random_id()
    )
