# API Documentation Index

Навигация по полной документации API проекта "Salty's Dream Project".

## 📚 Основные документы

### 1. [Quick Reference](./QUICK_REFERENCE.md) ⚡
**Для быстрого доступа**  
Краткая таблица всех endpoints, сгруппированных по модулям. Идеально для быстрого поиска нужного endpoint.

### 2. [README - Полное руководство](./README.md) 📖
**Для изучения API**  
Подробное руководство по использованию API включая:
- Быстрый старт
- Аутентификация
- Бизнес-логика
- Примеры использования
- Коды ответов

### 3. [OpenAPI Specification](./openapi-full.yaml) 📋
**Для интеграции**  
Полная OpenAPI 3.0 спецификация со всеми endpoints, схемами данных и примерами. 
- Можно импортировать в Postman/Insomnia
- Используется Swagger UI
- Валидация запросов

### 4. [Curl Examples](./examples/curl-examples.md) 💻
**Для тестирования**  
Готовые curl команды для всех основных операций. Копируй и запускай!

## 🎯 Быстрый старт

### 1. Запустить сервер
```bash
cd backend
npm run build
npm start
```

### 2. Проверить работоспособность
```bash
curl http://localhost:3000/api/health-check
```

### 3. Открыть Swagger UI
```
http://localhost:3000/api-docs
```

## 📦 Структура документации

```
backend/docs/
├── INDEX.md                    # Этот файл - навигация
├── README.md                   # Полное руководство
├── QUICK_REFERENCE.md          # Быстрый справочник
├── openapi-full.yaml           # OpenAPI спецификация (полная)
├── openapi.yaml                # OpenAPI спецификация (детальная)
├── admin-endpoints.yaml        # Admin endpoints (reference)
├── examples/
│   └── curl-examples.md        # Примеры curl команд
└── schemas/                    # (зарезервировано для схем)
```

## 🔍 Как найти нужный endpoint?

### По модулю
1. Откройте [Quick Reference](./QUICK_REFERENCE.md)
2. Найдите нужный модуль (Characters, Admin, Market, и т.д.)
3. Выберите endpoint из таблицы

### По функциональности
1. Откройте [README](./README.md)
2. Прочитайте раздел "Основные модули"
3. Найдите описание нужной операции

### Интерактивно
1. Откройте Swagger UI: `http://localhost:3000/api-docs`
2. Выберите модуль из тегов
3. Разверните endpoint и протестируйте

## 📊 Статистика API

- **Всего endpoints**: 190+
- **Модулей**: 16
- **Схем данных**: 30+
- **Примеров curl**: 80+

## 🎯 Основные модули

### Управление контентом
- **Characters** (20+ endpoints) - Создание и управление персонажами
- **Admin** (30+ endpoints) - Административные функции

### Экономика
- **Market** (15+ endpoints) - Биржа акций
- **Crypto** (12+ endpoints) - Криптовалюты
- **Purchases** (10+ endpoints) - Маркетплейс

### Игры
- **Casino** (15+ endpoints) - Азартные игры
- **Poker** (10+ endpoints) - Покерные комнаты
- **Fishing** (8+ endpoints) - Рыбалка
- **Hunting** (8+ endpoints) - Охота

### Прогрессия
- **Collections** (12+ endpoints) - Коллекционирование
- **Crafting** (5+ endpoints) - Крафт предметов
- **Events** (15+ endpoints) - Игровые события

### Контент
- **Bestiary** (8+ endpoints) - Существа и бестиарий
- **Echo Zones** (5+ endpoints) - Специальные зоны

## 🔐 Аутентификация

### Администратор
```bash
# Получить админ ID
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password": "heartattack"}'

# Использовать в запросах
curl -H "x-admin-id: 1" http://localhost:3000/api/admin/stats
```

### Пользователь
```bash
# Использовать VK ID в header
curl -H "x-user-vk-id: 123456789" http://localhost:3000/api/my-anketas/123456789
```

## 📝 Примеры использования

### Создать персонажа
См. [curl-examples.md](./examples/curl-examples.md#создать-персонажа)

### Одобрить анкету (Админ)
См. [curl-examples.md](./examples/curl-examples.md#одобрить-анкету)

### Купить акции
См. [curl-examples.md](./examples/curl-examples.md#купить-акции)

### Играть в казино
См. [curl-examples.md](./examples/curl-examples.md#слоты)

## 🛠️ Инструменты разработки

### Swagger UI
```
http://localhost:3000/api-docs
```
Интерактивная документация с возможностью тестирования

### Postman
1. Импортировать `openapi-full.yaml`
2. Настроить environment variables
3. Тестировать endpoints

### Insomnia
1. Импортировать `openapi-full.yaml`
2. Использовать встроенные примеры

## 🔄 Связанные документы

В корне backend:
- `REFACTORING.md` - Документация рефакторинга
- `NEXT_STEPS.md` - Следующие шаги развития
- `package.json` - Конфигурация проекта
- `tsconfig.json` - TypeScript конфигурация

В src:
- `types/index.ts` - TypeScript типы
- `controllers/` - HTTP контроллеры
- `services/` - Бизнес-логика
- `repositories/` - Работа с БД

## 💡 Советы по использованию

### Для фронтенд разработчиков
1. Начните с [Quick Reference](./QUICK_REFERENCE.md)
2. Используйте примеры из [curl-examples.md](./examples/curl-examples.md)
3. Проверяйте схемы в `openapi-full.yaml`

### Для бэкенд разработчиков
1. Изучите [README](./README.md) для понимания бизнес-логики
2. Смотрите реализацию в `src/`
3. Обновляйте OpenAPI при изменениях

### Для тестировщиков
1. Используйте Swagger UI для ручного тестирования
2. Копируйте примеры из [curl-examples.md](./examples/curl-examples.md)
3. Проверяйте коды ответов по документации

## 📞 Получить помощь

1. **Изучите документацию** - 90% вопросов здесь
2. **Примеры использования** - Готовые рабочие примеры
3. **Swagger UI** - Интерактивное тестирование
4. **Команда разработки** - Если ничего не помогло

## 🎓 Дополнительные ресурсы

- [OpenAPI Specification](https://swagger.io/specification/)
- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)

---

**Версия документации**: 1.0.0  
**Последнее обновление**: Октябрь 2025  
**Автор**: SaltyFrappuccino

Удачной разработки! 🚀

