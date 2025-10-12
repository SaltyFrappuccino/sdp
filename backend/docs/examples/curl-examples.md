# Примеры curl запросов

Полный набор примеров запросов к API для разработки и тестирования.

## 🔰 Базовые операции

### Health Check
```bash
curl http://localhost:3000/api/health-check
```

---

## 👤 Characters - Персонажи

### Создать персонажа
```bash
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -d '{
    "vk_id": 123456789,
    "character_name": "Дмитрий Волков",
    "nickname": "Серый",
    "age": 25,
    "rank": "C",
    "faction": "Гильдия Проводников",
    "faction_position": "Проводник 3-го класса",
    "home_island": "Новый Эдем",
    "appearance": {
      "text": "Высокий мужчина с седыми волосами",
      "images": ["https://example.com/image1.jpg"]
    },
    "character_images": ["https://example.com/char1.jpg"],
    "personality": "Спокойный и рассудительный",
    "biography": "Родился в Новом Эдеме, стал проводником в 20 лет",
    "archetypes": ["Охотник", "Защитник"],
    "attributes": {
      "Сила": "Опытный",
      "Ловкость": "Эксперт",
      "Интеллект": "Новичок",
      "Выносливость": "Опытный"
    },
    "inventory": [],
    "contracts": [
      {
        "contract_name": "Теневой страж",
        "creature_name": "Умбра",
        "creature_rank": "B",
        "creature_spectrum": "Тень",
        "creature_description": "Существо из теней",
        "creature_images": ["https://example.com/creature1.jpg"],
        "gift": "Слияние с тенями",
        "sync_level": 45,
        "unity_stage": "Синхронизация",
        "abilities": {
          "main": "Теневой шаг",
          "passive": "Ночное зрение"
        },
        "manifestation": null,
        "dominion": null
      }
    ]
  }'
```

### Получить всех персонажей
```bash
curl http://localhost:3000/api/characters
```

### Получить персонажей с фильтрами
```bash
# По статусу
curl "http://localhost:3000/api/characters?status=Принято"

# По рангу
curl "http://localhost:3000/api/characters?rank=C"

# По фракции
curl "http://localhost:3000/api/characters?faction=Гильдия%20Проводников"

# Комбинированные фильтры
curl "http://localhost:3000/api/characters?status=Принято&rank=C"
```

### Получить персонажа по ID
```bash
curl http://localhost:3000/api/characters/5
```

### Получить персонажей пользователя
```bash
# Только принятые (с валютой)
curl http://localhost:3000/api/characters/by-vk/123456789

# Все анкеты (базовая инфо)
curl http://localhost:3000/api/characters/my/123456789

# Полные анкеты с контрактами
curl http://localhost:3000/api/my-anketas/123456789
```

### Обновить персонажа (пользователь)
```bash
curl -X PUT http://localhost:3000/api/characters/5 \
  -H "Content-Type: application/json" \
  -H "x-user-vk-id: 123456789" \
  -d '{
    "personality": "Обновлённое описание личности",
    "biography": "Дополненная биография"
  }'
```

### Обновить персонажа (админ)
```bash
curl -X PUT http://localhost:3000/api/characters/5 \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{
    "admin_password": "heartattack",
    "personality": "Новое описание",
    "currency": 15000
  }'
```

### Удалить персонажа
```bash
curl -X DELETE http://localhost:3000/api/characters/5 \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{"admin_password": "heartattack"}'
```

### Обновить статус персонажа
```bash
curl -X POST http://localhost:3000/api/characters/5/status \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{
    "status": "Принято",
    "admin_password": "heartattack"
  }'
```

### Получить историю версий
```bash
curl http://localhost:3000/api/characters/5/versions
```

---

## 🔧 Admin - Администрирование

### Авторизация админа
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "heartattack"}'
```

### Получить персонажей на рассмотрении
```bash
curl http://localhost:3000/api/admin/characters/pending \
  -H "x-admin-id: 1"
```

### Одобрить анкету
```bash
curl -X POST http://localhost:3000/api/admin/characters/5/approve \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{"admin_password": "heartattack"}'
```

### Отклонить анкету
```bash
curl -X POST http://localhost:3000/api/admin/characters/5/reject \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{
    "admin_password": "heartattack",
    "reason": "Недостаточно проработана биография персонажа"
  }'
```

### Получить все запросы на обновление
```bash
curl http://localhost:3000/api/updates \
  -H "x-admin-id: 1"
```

### Получить детали обновления
```bash
curl http://localhost:3000/api/updates/10 \
  -H "x-admin-id: 1"
```

### Одобрить обновление
```bash
curl -X POST http://localhost:3000/api/updates/10/approve \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{"admin_password": "heartattack"}'
```

### Отклонить обновление
```bash
curl -X POST http://localhost:3000/api/updates/10/reject \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{
    "admin_password": "heartattack",
    "reason": "Изменения не соответствуют логике персонажа"
  }'
```

### Получить статистику
```bash
curl http://localhost:3000/api/admin/stats \
  -H "x-admin-id: 1"
```

### Создать backup БД
```bash
curl http://localhost:3000/api/admin/backup \
  -H "x-admin-id: 1" \
  --output backup.db
```

### Массовое обновление валюты
```bash
curl -X POST http://localhost:3000/api/admin/characters/bulk-update-currency \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{
    "admin_password": "heartattack",
    "character_ids": [1, 5, 10, 15],
    "amount": 5000
  }'
```

---

## 📈 Market - Биржа акций

### Получить все акции
```bash
curl http://localhost:3000/api/market/stocks
```

### Получить акцию по тикеру
```bash
curl http://localhost:3000/api/market/stocks/NRGCORP
```

### Купить акции
```bash
curl -X POST http://localhost:3000/api/market/trade \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "ticker": "NRGCORP",
    "action": "buy",
    "quantity": 10
  }'
```

### Продать акции
```bash
curl -X POST http://localhost:3000/api/market/trade \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "ticker": "NRGCORP",
    "action": "sell",
    "quantity": 5
  }'
```

### Получить портфолио
```bash
curl http://localhost:3000/api/market/portfolio/5
```

### Создать лимитный ордер
```bash
# Ордер на покупку
curl -X POST http://localhost:3000/api/market/order \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "ticker": "NRGCORP",
    "order_type": "buy",
    "quantity": 10,
    "price": 140
  }'

# Ордер на продажу
curl -X POST http://localhost:3000/api/market/order \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "ticker": "NRGCORP",
    "order_type": "sell",
    "quantity": 5,
    "price": 160
  }'
```

### Получить лидерборд
```bash
curl http://localhost:3000/api/market/leaderboard
```

---

## 💰 Crypto - Криптовалюты

### Получить все криптовалюты
```bash
curl http://localhost:3000/api/crypto/currencies
```

### Получить криптовалюту по ID
```bash
curl http://localhost:3000/api/crypto/currencies/1
```

### Купить криптовалюту
```bash
curl -X POST http://localhost:3000/api/crypto/buy \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "crypto_id": 1,
    "amount": 1000
  }'
```

### Продать криптовалюту
```bash
curl -X POST http://localhost:3000/api/crypto/sell \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "crypto_id": 1,
    "amount": 500
  }'
```

### Получить крипто-портфолио
```bash
curl http://localhost:3000/api/crypto/portfolio/5
```

### Получить транзакции
```bash
curl http://localhost:3000/api/crypto/transactions/5
```

---

## 🎰 Casino - Казино

### Блэкджек
```bash
curl -X POST http://localhost:3000/api/casino/blackjack/start \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "bet_amount": 100
  }'
```

### Слоты
```bash
curl -X POST http://localhost:3000/api/casino/slots/start \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "bet_amount": 50
  }'
```

### Рулетка
```bash
curl -X POST http://localhost:3000/api/casino/roulette/start \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "bet_amount": 100,
    "bet_type": "red"
  }'
```

### Кости
```bash
curl -X POST http://localhost:3000/api/casino/dice/start \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "bet_amount": 75
  }'
```

### Получить лошадей
```bash
curl http://localhost:3000/api/casino/horseracing/horses
```

### Скачки
```bash
curl -X POST http://localhost:3000/api/casino/horseracing/start \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "bet_amount": 200,
    "horse_id": 3,
    "bet_type": "win"
  }'
```

### История игр
```bash
curl http://localhost:3000/api/casino/history/5
```

---

## 🃏 Poker - Покер

### Получить комнаты
```bash
curl http://localhost:3000/api/poker/rooms
```

### Создать комнату
```bash
curl -X POST http://localhost:3000/api/poker/rooms \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "room_name": "High Stakes",
    "buy_in": 1000,
    "small_blind": 10,
    "big_blind": 20,
    "max_players": 6
  }'
```

### Присоединиться к комнате
```bash
curl -X POST http://localhost:3000/api/poker/rooms/1/join \
  -H "Content-Type: application/json" \
  -d '{"character_id": 5}'
```

### Начать игру
```bash
curl -X POST http://localhost:3000/api/poker/rooms/1/start \
  -H "Content-Type: application/json"
```

---

## 🎣 Fishing - Рыбалка

### Получить локации
```bash
curl http://localhost:3000/api/games/fishing/locations
```

### Получить снаряжение
```bash
curl http://localhost:3000/api/games/fishing/gear
```

---

## 🏹 Hunting - Охота

### Получить локации
```bash
curl http://localhost:3000/api/games/hunting/locations
```

### Получить снаряжение
```bash
curl http://localhost:3000/api/games/hunting/gear
```

---

## 🎴 Collections - Коллекции

### Получить серии
```bash
curl http://localhost:3000/api/collections/series
```

### Получить детали серии
```bash
curl http://localhost:3000/api/collections/series/1
```

### Получить паки
```bash
curl http://localhost:3000/api/collections/packs
```

### Купить пак
```bash
curl -X POST http://localhost:3000/api/collections/buy-pack \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "pack_id": 1
  }'
```

### Открыть пак
```bash
curl -X POST http://localhost:3000/api/collections/open-pack/10 \
  -H "Content-Type: application/json" \
  -d '{"character_id": 5}'
```

### Получить коллекцию персонажа
```bash
curl http://localhost:3000/api/collections/my/5
```

---

## 🛒 Purchases - Покупки

### Получить категории
```bash
curl http://localhost:3000/api/purchases/categories
```

### Получить предметы
```bash
# Все предметы
curl http://localhost:3000/api/purchases/items

# По категории
curl "http://localhost:3000/api/purchases/items?category_id=1"
```

### Купить предмет
```bash
curl -X POST http://localhost:3000/api/purchases/buy \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "item_id": 10
  }'
```

---

## 🐉 Bestiary - Бестиарий

### Получить таксономию
```bash
curl http://localhost:3000/api/bestiary/taxonomy
```

### Получить все виды
```bash
curl http://localhost:3000/api/bestiary/species
```

### Получить вид по ID
```bash
curl http://localhost:3000/api/bestiary/species/1
```

---

## 🎪 Events - События

### Получить события
```bash
curl http://localhost:3000/api/events
```

### Создать событие
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Турнир проводников",
    "description": "Ежегодный турнир для проводников всех рангов",
    "event_type": "tournament",
    "max_participants": 16
  }'
```

### Присоединиться к событию
```bash
curl -X POST http://localhost:3000/api/events/1/join \
  -H "Content-Type: application/json" \
  -d '{"character_id": 5}'
```

### Получить ставки события
```bash
curl http://localhost:3000/api/events/1/bets
```

### Создать ставку
```bash
curl -X POST http://localhost:3000/api/events/1/bets \
  -H "Content-Type: application/json" \
  -d '{
    "bet_name": "Победа Команды А",
    "description": "Ставка на победу команды А в турнире"
  }'
```

### Сделать ставку
```bash
curl -X POST http://localhost:3000/api/bets/1/place \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "amount": 500,
    "position": "believer"
  }'
```

---

## 🔨 Crafting - Крафт

### Получить рецепты
```bash
# Все рецепты
curl "http://localhost:3000/api/crafting/recipes?character_id=5"
```

### Скрафтить синки
```bash
curl -X POST http://localhost:3000/api/crafting/craft \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "recipe_id": 3
  }'
```

---

## 🌀 Echo Zones - Эхо-зоны

### Получить эхо-зоны
```bash
# Для рыбалки
curl http://localhost:3000/api/echo-zones/fishing

# Для охоты
curl http://localhost:3000/api/echo-zones/hunting
```

---

## 💡 Полезные советы

### Использование переменных окружения

```bash
# Установить базовый URL
export API_URL="http://localhost:3000/api"

# Использовать в запросах
curl $API_URL/health-check
```

### Сохранение токена админа

```bash
# Получить админ токен
export ADMIN_ID=$(curl -X POST $API_URL/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "heartattack"}' \
  | jq -r '.adminId')

# Использовать в запросах
curl $API_URL/admin/stats -H "x-admin-id: $ADMIN_ID"
```

### Форматирование JSON ответов

```bash
# С использованием jq
curl http://localhost:3000/api/characters/5 | jq '.'

# С использованием python
curl http://localhost:3000/api/characters/5 | python -m json.tool
```

### Отладка запросов

```bash
# Показать headers и статус
curl -v http://localhost:3000/api/health-check

# Только headers
curl -I http://localhost:3000/api/health-check

# Время выполнения
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/characters
```

