"""
Скрипт для тестирования и получения списка доступных реакций VK.
Запустите его, чтобы узнать, какие ID реакций доступны в вашем сообществе.
"""

import os
import vk_api
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    load_dotenv()
    vk_token = os.getenv('VK_TOKEN')
    
    if not vk_token:
        logging.error("VK_TOKEN не найден в .env файле")
        return
    
    try:
        vk_session = vk_api.VkApi(token=vk_token)
        vk = vk_session.get_api()
        
        logging.info("Получаю список доступных реакций...")
        
        # Получаем ассеты реакций
        result = vk.messages.getReactionsAssets()
        
        print("\n" + "="*60)
        print("ДОСТУПНЫЕ РЕАКЦИИ VK")
        print("="*60)
        
        if 'reaction_ids' in result:
            reaction_ids = result['reaction_ids']
            print(f"\nНайдено {len(reaction_ids)} реакций:")
            print(f"IDs: {reaction_ids}")
            
            print("\n" + "-"*60)
            print("Рекомендации для голосования:")
            if len(reaction_ids) >= 2:
                print(f"  ЗА бан: reaction_id = {reaction_ids[0]}")
                print(f"  ПРОТИВ бана: reaction_id = {reaction_ids[1]}")
            else:
                print("  Недостаточно реакций для настройки голосования")
            print("-"*60)
        
        if 'version' in result:
            print(f"\nВерсия ассетов: {result['version']}")
        
        if 'assets' in result and result['assets']:
            print(f"\nДоступно ассетов: {len(result['assets'])}")
        
        print("\n" + "="*60)
        print("\nИнформация сохранена! Бот автоматически использует эти реакции.")
        print("="*60 + "\n")
        
    except vk_api.exceptions.ApiError as e:
        logging.error(f"Ошибка VK API: {e}")
    except Exception as e:
        logging.error(f"Ошибка: {e}", exc_info=True)

if __name__ == '__main__':
    main()

