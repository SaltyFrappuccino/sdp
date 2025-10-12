# Quick Reference - API Endpoints

Краткий справочник всех endpoints для быстрого доступа.

## 📚 Навигация по модулям

- [Characters](#characters) - Персонажи
- [Admin](#admin) - Администрирование
- [Market](#market) - Биржа акций
- [Crypto](#crypto) - Криптовалюты
- [Casino](#casino) - Казино
- [Poker](#poker) - Покер
- [Fishing](#fishing) - Рыбалка
- [Hunting](#hunting) - Охота
- [Collections](#collections) - Коллекции
- [Purchases](#purchases) - Покупки
- [Bestiary](#bestiary) - Бестиарий
- [Events](#events) - События
- [Crafting](#crafting) - Крафт
- [Echo Zones](#echo-zones) - Эхо-зоны

---

## Characters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health-check` | Проверка работоспособности |
| POST | `/characters` | Создать персонажа |
| GET | `/characters` | Список персонажей (с фильтрами) |
| GET | `/characters/{id}` | Получить персонажа |
| PUT | `/characters/{id}` | Обновить персонажа |
| DELETE | `/characters/{id}` | Удалить персонажа |
| GET | `/characters/by-vk/{vk_id}` | Принятые персонажи пользователя |
| GET | `/characters/my/{vk_id}` | Все анкеты пользователя |
| GET | `/my-anketas/{vk_id}` | Полные анкеты с контрактами |
| GET | `/characters/{id}/versions` | История версий |
| POST | `/characters/{id}/status` | Изменить статус (админ) |
| POST | `/characters/{id}/life-status` | Изменить life_status (админ) |
| POST | `/characters/{id}/updates` | Создать запрос на обновление |

---

## Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Авторизация админа |
| GET | `/admin/characters/pending` | Персонажи на рассмотрении |
| GET | `/admin/characters` | Все персонажи (детально) |
| POST | `/admin/characters/{id}/approve` | Одобрить анкету |
| POST | `/admin/characters/{id}/reject` | Отклонить анкету |
| GET | `/updates` | Все запросы на обновление |
| GET | `/updates/{id}` | Детали обновления |
| POST | `/updates/{id}/approve` | Одобрить обновление |
| POST | `/updates/{id}/reject` | Отклонить обновление |
| DELETE | `/updates/{id}` | Удалить обновление |
| GET | `/admin/stats` | Статистика системы |
| GET | `/admin/backup` | Backup БД |
| POST | `/admin/characters/bulk-update-attribute-points` | Массовое обновление очков |
| POST | `/admin/characters/bulk-update-currency` | Массовое изменение валюты |
| POST | `/admin/characters/bulk-add-inventory` | Массовая выдача предметов |

---

## Market

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/market/stocks` | Список всех акций |
| GET | `/market/stocks/{ticker}` | Информация об акции |
| POST | `/market/trade` | Купить/продать акции |
| GET | `/market/portfolio/{character_id}` | Портфолио персонажа |
| POST | `/market/order` | Создать лимитный ордер |
| GET | `/market/orders/{character_id}` | Ордера персонажа |
| POST | `/market/short` | Открыть короткую позицию |
| POST | `/market/cover` | Закрыть короткую позицию |
| GET | `/market/leaderboard` | Топ трейдеров |
| GET | `/market/events` | Рыночные события |
| POST | `/admin/market/reset` | Сбросить рынок (админ) |

---

## Crypto

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crypto/currencies` | Список криптовалют |
| GET | `/crypto/currencies/{id}` | Информация о криптовалюте |
| POST | `/crypto/buy` | Купить криптовалюту |
| POST | `/crypto/sell` | Продать криптовалюту |
| GET | `/crypto/portfolio/{character_id}` | Крипто-портфолио |
| GET | `/crypto/transactions/{character_id}` | История транзакций |
| GET | `/crypto/leaderboard` | Топ крипто-трейдеров |
| GET | `/crypto/events` | События крипторынка |
| POST | `/admin/crypto/create` | Создать криптовалюту (админ) |
| PUT | `/admin/crypto/{id}` | Обновить криптовалюту (админ) |
| DELETE | `/admin/crypto/{id}` | Удалить криптовалюту (админ) |
| POST | `/admin/crypto/event` | Создать событие (админ) |
| POST | `/admin/crypto/reset` | Сбросить крипторынок (админ) |

---

## Casino

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/casino/blackjack/start` | Начать блэкджек |
| POST | `/casino/blackjack` | Действие в блэкджеке |
| POST | `/casino/slots/start` | Крутить слоты |
| POST | `/casino/slots` | Игра в слоты |
| POST | `/casino/dice/start` | Бросить кости |
| POST | `/casino/dice` | Игра в кости |
| POST | `/casino/roulette/start` | Рулетка (start) |
| POST | `/casino/roulette` | Игра в рулетку |
| GET | `/casino/horseracing/horses` | Список лошадей |
| GET | `/casino/horseracing/stats` | Статистика лошадей |
| POST | `/casino/horseracing/start` | Начать скачки |
| POST | `/casino/horseracing` | Скачки |
| GET | `/casino/history/{character_id}` | История игр |

---

## Poker

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/poker/rooms` | Список комнат |
| POST | `/poker/rooms` | Создать комнату |
| GET | `/poker/rooms/{id}` | Информация о комнате |
| POST | `/poker/rooms/{id}/join` | Присоединиться |
| POST | `/poker/rooms/{id}/leave` | Покинуть комнату |
| POST | `/poker/rooms/{id}/start` | Начать игру |
| DELETE | `/poker/rooms/{id}` | Удалить комнату |
| GET | `/poker/hands/{id}/cards/{player_id}` | Карты игрока |
| POST | `/poker/hands/{id}/simple-action` | Действие в игре |

---

## Fishing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/games/fishing/locations` | Локации рыбалки |
| GET | `/games/fishing/gear` | Снаряжение для рыбалки |

---

## Hunting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/games/hunting/locations` | Локации охоты |
| GET | `/games/hunting/gear` | Снаряжение для охоты |

---

## Collections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/collections/series` | Все серии коллекций |
| GET | `/collections/series/{id}` | Детали серии |
| GET | `/collections/packs` | Доступные паки |
| POST | `/collections/buy-pack` | Купить пак |
| POST | `/collections/open-pack/{pack_id}` | Открыть пак |
| GET | `/collections/my/{character_id}` | Коллекция персонажа |
| GET | `/collections/leaderboard` | Топ коллекционеров |
| POST | `/admin/collections/series` | Создать серию (админ) |
| PUT | `/admin/collections/series/{id}` | Обновить серию (админ) |
| DELETE | `/admin/collections/series/{id}` | Удалить серию (админ) |
| POST | `/admin/collections/item` | Создать предмет (админ) |
| PUT | `/admin/collections/item/{id}` | Обновить предмет (админ) |

---

## Purchases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchases/categories` | Категории покупок |
| GET | `/purchases/items` | Предметы для покупки |
| GET | `/purchases/items/{id}` | Информация о предмете |
| POST | `/purchases/buy` | Купить предмет |
| GET | `/purchases/my/{character_id}` | Покупки персонажа |
| GET | `/purchases/item/{id}/owners` | Владельцы предмета |
| POST | `/admin/purchases/category` | Создать категорию (админ) |
| PUT | `/admin/purchases/category/{id}` | Обновить категорию (админ) |
| DELETE | `/admin/purchases/category/{id}` | Удалить категорию (админ) |
| POST | `/admin/purchases/item` | Создать предмет (админ) |
| PUT | `/admin/purchases/item/{id}` | Обновить предмет (админ) |
| DELETE | `/admin/purchases/item/{id}` | Удалить предмет (админ) |

---

## Bestiary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bestiary/taxonomy` | Таксономия существ |
| GET | `/bestiary/species` | Все виды существ |
| GET | `/bestiary/species/{id}` | Информация о виде |
| GET | `/bestiary/encounters/{character_id}` | Встречи персонажа |

---

## Events

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | Список событий |
| GET | `/events/{id}` | Информация о событии |
| POST | `/events` | Создать событие |
| POST | `/events/{id}/join` | Присоединиться |
| DELETE | `/events/{id}/leave` | Покинуть событие |
| DELETE | `/events/{id}` | Удалить событие |
| POST | `/events/{id}/branches` | Создать ветку события |
| GET | `/events/{id}/branches` | Получить ветки |
| DELETE | `/events/branches/{branch_id}` | Удалить ветку |
| POST | `/events/{id}/join-branch` | Присоединиться к ветке |
| GET | `/events/{id}/bets` | Ставки события |
| POST | `/events/{id}/bets` | Создать ставку |
| GET | `/bets/{bet_id}/details` | Детали ставки |
| POST | `/bets/{bet_id}/place` | Сделать ставку |
| PUT | `/bets/{bet_id}/settle` | Определить результат |
| PUT | `/bets/{bet_id}/close` | Закрыть ставку |
| GET | `/characters/{character_id}/bet-history` | История ставок |

---

## Crafting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/crafting/recipes` | Доступные рецепты |
| POST | `/crafting/craft` | Скрафтить синки |
| GET | `/crafting/history/{character_id}` | История крафта |
| GET | `/crafting/stats/{character_id}` | Статистика крафта |

---

## Echo Zones

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/echo-zones/{activity_type}` | Активные зоны (fishing/hunting) |

---

## 🔑 Частые параметры

### Headers
```
x-admin-id: 1                 # Для админских операций
x-user-vk-id: {VK_ID}        # Для пользовательских операций
Content-Type: application/json
```

### Query Parameters
```
status=Принято               # Фильтр по статусу
rank=C                       # Фильтр по рангу
faction=Гильдия              # Фильтр по фракции
category_id=1                # Фильтр по категории
```

### Common Body Fields
```json
{
  "character_id": 5,
  "admin_password": "heartattack",
  "amount": 1000
}
```

---

## 📊 Коды ответов

- **200** - OK
- **201** - Created
- **400** - Bad Request (validation error)
- **401** - Unauthorized (требуется авторизация)
- **403** - Forbidden (недостаточно прав)
- **404** - Not Found
- **500** - Internal Server Error

---

## 🔗 Полезные ссылки

- [Полная документация](./README.md)
- [OpenAPI спецификация](./openapi-full.yaml)
- [Примеры curl](./examples/curl-examples.md)
- [Swagger UI](http://localhost:3000/api-docs)

---

**Последнее обновление**: Октябрь 2025

