# API Documentation - Salty's Dream Project

Полная документация REST API для ролевой системы VK Mini App.

## 📋 Содержание

1. [Быстрый старт](#быстрый-старт)
2. [Аутентификация](#аутентификация)
3. [Основные модули](#основные-модули)
4. [Примеры использования](#примеры-использования)
5. [Коды ответов](#коды-ответов)
6. [Бизнес-логика](#бизнес-логика)

## 🚀 Быстрый старт

### Базовый URL

```
Development: http://localhost:3000/api
Production:  https://your-server.com/api
```

### Проверка работоспособности

```bash
curl http://localhost:3000/api/health-check
```

Ответ:
```json
{
  "status": "ok"
}
```

## 🔐 Аутентификация

API использует два типа аутентификации через headers:

### 1. Административная авторизация
```http
x-admin-id: 1
```

Для получения admin ID используйте:
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "heartattack"}'
```

### 2. Пользовательская авторизация
```http
x-user-vk-id: {VK_USER_ID}
```

Используется для операций, требующих идентификации пользователя.

## 📦 Основные модули

### 1. Characters - Персонажи

**Основные операции:**
- Создание персонажа
- Получение информации
- Обновление данных
- Управление контрактами

**Ключевые endpoints:**
- `POST /characters` - Создать персонажа
- `GET /characters/{id}` - Получить персонажа
- `PUT /characters/{id}` - Обновить персонажа
- `GET /my-anketas/{vk_id}` - Получить все анкеты пользователя

### 2. Admin - Администрирование

**Основные операции:**
- Одобрение/отклонение анкет
- Управление обновлениями
- Статистика системы
- Backup базы данных

**Ключевые endpoints:**
- `GET /admin/characters/pending` - Анкеты на рассмотрении
- `POST /admin/characters/{id}/approve` - Одобрить анкету
- `POST /updates/{id}/approve` - Одобрить обновление
- `GET /admin/stats` - Статистика

### 3. Market - Биржа акций

**Основные операции:**
- Просмотр акций
- Покупка/продажа
- Управление портфолио
- Лимитные ордера

**Ключевые endpoints:**
- `GET /market/stocks` - Список акций
- `POST /market/trade` - Купить/продать
- `GET /market/portfolio/{character_id}` - Портфолио
- `POST /market/order` - Создать ордер

### 4. Crypto - Криптовалюты

**Основные операции:**
- Торговля криптовалютами
- Крипто-портфолио
- События крипторынка

**Ключевые endpoints:**
- `GET /crypto/currencies` - Список криптовалют
- `POST /crypto/buy` - Купить крипту
- `GET /crypto/portfolio/{character_id}` - Крипто-портфолио

### 5. Casino - Казино

**Игры:**
- Блэкджек
- Слоты
- Рулетка
- Кости
- Скачки

**Ключевые endpoints:**
- `POST /casino/blackjack/start` - Блэкджек
- `POST /casino/slots/start` - Слоты
- `POST /casino/horseracing/start` - Скачки

### 6. Poker - Покер

**Основные операции:**
- Создание комнат
- Присоединение к играм
- Управление ставками

**Ключевые endpoints:**
- `GET /poker/rooms` - Список комнат
- `POST /poker/rooms` - Создать комнату
- `POST /poker/rooms/{id}/join` - Присоединиться

### 7. Fishing & Hunting - Рыбалка и Охота

**Основные операции:**
- Просмотр локаций
- Управление снаряжением
- Инвентарь добычи

**Ключевые endpoints:**
- `GET /games/fishing/locations` - Локации рыбалки
- `GET /games/hunting/locations` - Локации охоты

### 8. Collections - Коллекции

**Основные операции:**
- Просмотр серий
- Покупка паков
- Открытие паков

**Ключевые endpoints:**
- `GET /collections/series` - Серии
- `POST /collections/buy-pack` - Купить пак
- `POST /collections/open-pack/{id}` - Открыть пак

### 9. Events - События

**Основные операции:**
- Создание событий
- Система ставок
- Участие в событиях

**Ключевые endpoints:**
- `GET /events` - Список событий
- `POST /events/{id}/join` - Присоединиться
- `POST /bets/{id}/place` - Сделать ставку

### 10. Crafting - Крафт

**Основные операции:**
- Просмотр рецептов
- Крафт синки

**Ключевые endpoints:**
- `GET /crafting/recipes` - Рецепты
- `POST /crafting/craft` - Скрафтить

## 📝 Примеры использования

### Создание персонажа

```bash
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -d '{
    "vk_id": 123456789,
    "character_name": "Дмитрий Волков",
    "age": 25,
    "rank": "C",
    "faction": "Гильдия Проводников",
    "faction_position": "Проводник 3-го класса",
    "home_island": "Новый Эдем",
    "personality": "Спокойный и рассудительный",
    "biography": "Родился в Новом Эдеме...",
    "attributes": {
      "Сила": "Опытный",
      "Ловкость": "Эксперт"
    },
    "contracts": [
      {
        "contract_name": "Теневой страж",
        "creature_name": "Умбра",
        "creature_rank": "B",
        "creature_spectrum": "Тень",
        "sync_level": 45,
        "gift": "Слияние с тенями",
        "abilities": {
          "main": "Теневой шаг"
        }
      }
    ]
  }'
```

### Одобрение анкеты (Админ)

```bash
curl -X POST http://localhost:3000/api/admin/characters/5/approve \
  -H "Content-Type: application/json" \
  -H "x-admin-id: 1" \
  -d '{
    "admin_password": "heartattack"
  }'
```

### Покупка акций

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

### Игра в слоты

```bash
curl -X POST http://localhost:3000/api/casino/slots/start \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "bet_amount": 50
  }'
```

Ответ:
```json
{
  "symbols": ["🍒", "🍒", "🍒"],
  "winnings": 150,
  "multiplier": 3,
  "new_balance": 5100
}
```

### Крафт синки

```bash
curl -X POST http://localhost:3000/api/crafting/craft \
  -H "Content-Type: application/json" \
  -d '{
    "character_id": 5,
    "recipe_id": 3
  }'
```

Ответ:
```json
{
  "success": true,
  "sinki": {
    "name": "Теневой Клинок",
    "rank": "B",
    "type": "weapon",
    "properties": {
      "damage": 45,
      "special": "shadow_strike"
    }
  },
  "message": "Crafting successful!"
}
```

## 📊 Коды ответов

### Успешные ответы

- `200 OK` - Запрос выполнен успешно
- `201 Created` - Ресурс создан
- `204 No Content` - Операция выполнена, тело ответа пустое

### Ошибки клиента

- `400 Bad Request` - Некорректный запрос (отсутствуют обязательные поля)
  ```json
  {
    "error": "Отсутствуют обязательные поля",
    "missing": ["character_name", "age"]
  }
  ```

- `401 Unauthorized` - Не авторизован
  ```json
  {
    "error": "Admin authentication required"
  }
  ```

- `403 Forbidden` - Доступ запрещён
  ```json
  {
    "error": "Insufficient permissions"
  }
  ```

- `404 Not Found` - Ресурс не найден
  ```json
  {
    "error": "Character not found"
  }
  ```

### Ошибки сервера

- `500 Internal Server Error` - Внутренняя ошибка сервера
  ```json
  {
    "error": "Не удалось выполнить операцию",
    "details": "Database connection error"
  }
  ```

## 🎯 Бизнес-логика

### Создание персонажа

1. **Обязательные поля**: `vk_id`, `character_name`, `age`, `rank`, `faction`, `faction_position`, `home_island`, `contracts`
2. **Автоматические действия**:
   - Статус устанавливается в "на рассмотрении"
   - Рассчитываются ячейки ауры на основе ранга и контрактов
   - Рассчитываются потраченные очки атрибутов
   - Валюта по умолчанию = 0
   - Life status = "Жив"

### Одобрение анкеты

1. Статус меняется на "Принято"
2. Персонажу выдаётся **10,000 кредитов**
3. Создаётся портфолио для биржи

### Обновление персонажа

- **Если статус "Принято"**: Создаётся запрос на обновление
- **Если статус "на рассмотрении"**: Обновление применяется напрямую
- **Админ**: Может обновлять любого персонажа напрямую

### Система рангов

Ранги (от низшего к высшему):
- **F** - 10 очков атрибутов
- **E** - 14 очков
- **D** - 16 очков
- **C** - 20 очков
- **B** - 30 очков
- **A** - 40 очков
- **S** - 50 очков
- **SS** - 60 очков
- **SSS** - 70 очков

### Ячейки ауры по рангам

| Ранг | Малые (I) | Значительные (II) | Предельные (III) |
|------|-----------|-------------------|------------------|
| F    | 2         | 0                 | 0                |
| E    | 4         | 0                 | 0                |
| D    | 8         | 2                 | 0                |
| C    | 16        | 4                 | 0                |
| B    | 32        | 8                 | 1                |
| A    | ∞         | 16                | 2                |
| S    | ∞         | ∞                 | 4                |
| SS   | ∞         | ∞                 | 8                |
| SSS  | ∞         | ∞                 | 16               |

**Бонусы от контрактов**:
- Малые: +1 за каждые 10 уровней sync
- Значительные: +1 за каждые 25 уровней sync
- Предельные: +1 за каждые 100 уровней sync

### Стоимость атрибутов

| Уровень  | Стоимость |
|----------|-----------|
| Дилетант | 1 очко    |
| Новичок  | 2 очка    |
| Опытный  | 4 очка    |
| Эксперт  | 7 очков   |
| Мастер   | 10 очков  |

## 🛠️ Инструменты разработки

### Просмотр документации

1. **Swagger UI**: После запуска сервера откройте `http://localhost:3000/api-docs`
2. **OpenAPI файл**: `backend/docs/openapi-full.yaml`

### Тестирование API

```bash
# Коллекция Postman
# Импортируйте openapi-full.yaml в Postman

# Или используйте curl
curl http://localhost:3000/api/health-check
```

### Валидация OpenAPI

```bash
# Установите swagger-cli
npm install -g @apidevtools/swagger-cli

# Валидация спецификации
swagger-cli validate backend/docs/openapi-full.yaml
```

## 📚 Дополнительные ресурсы

- **Refactoring Guide**: `backend/REFACTORING.md`
- **Next Steps**: `backend/NEXT_STEPS.md`
- **TypeScript Types**: `backend/src/types/index.ts`

## 🔄 Версионирование

Текущая версия API: **1.0.0**

API следует принципам семантического версионирования:
- **MAJOR** - несовместимые изменения API
- **MINOR** - обратно совместимые новые функции
- **PATCH** - обратно совместимые исправления

## 📞 Поддержка

При возникновении вопросов или проблем:
1. Проверьте документацию
2. Изучите примеры использования
3. Проверьте логи сервера
4. Обратитесь к команде разработки

---

**Последнее обновление**: Октябрь 2025  
**Версия документации**: 1.0.0

