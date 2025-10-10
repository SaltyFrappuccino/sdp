# Шаги для завершения рефакторинга Backend

## ✅ Что уже сделано

Полностью реализована новая архитектура:

- ✅ **Controllers** - HTTP handlers для всех модулей
- ✅ **Services** - Бизнес-логика (character, admin, game, market)
- ✅ **Repositories** - Работа с БД (base, character, game, market)
- ✅ **Routes** - Express роутинг с объединением в index
- ✅ **Database** - Connection management и migrations
- ✅ **Utils** - Errors, calculations, validators
- ✅ **Types** - Централизованные TypeScript типы
- ✅ **Engines** - Background tasks (market, crypto)
- ✅ **Новый index** - `index.new.ts` для запуска рефакторенного бэкенда

## 📋 Следующие шаги

### 1. Переместить оставшиеся файлы logic (опционально)

Из-за проблем с PowerShell, нужно вручную переместить:

```bash
# В Git Bash или CMD:
cp backend/src/horseLogic.ts backend/src/logic/horse.logic.ts
cp backend/src/pokerLogic.ts backend/src/logic/poker.logic.ts
```

### 2. Обновить импорты в новых файлах

Если переместили logic файлы, обновите импорты:

**В index.new.ts добавьте (если нужно):**
```typescript
// import { ... } from './logic/horse.logic.js';
// import { ... } from './logic/poker.logic.js';
```

### 3. Проверить компиляцию

```bash
cd backend
npm run build
```

Если есть ошибки:
- Проверьте импорты в новых файлах
- Убедитесь что все .js расширения добавлены к импортам (для ES modules)

### 4. Тестирование

**Вариант A: Протестировать рефакторенную версию параллельно**

1. В `package.json` добавьте новый скрипт:
```json
{
  "scripts": {
    "start:new": "node dist/index.new.js",
    "start:old": "node dist/index.js"
  }
}
```

2. Запустите новую версию на другом порту:
```bash
PORT=3001 npm run start:new
```

3. Протестируйте endpoints:
```bash
# Health check
curl http://localhost:3001/api/health-check

# Get characters
curl http://localhost:3001/api/characters

# Create character (с данными из frontend)
curl -X POST http://localhost:3001/api/characters \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Вариант B: Переключиться на новую версию сразу**

1. В `package.json`:
```json
{
  "main": "dist/index.new.js"
}
```

2. Пересобрать и запустить:
```bash
npm run build
npm start
```

### 5. Переключение на новую версию (после тестирования)

Когда всё работает:

```bash
# Переименовать старые файлы (для backup)
mv backend/src/index.ts backend/src/index.old.ts
mv backend/src/api.ts backend/src/api.old.ts
mv backend/src/database.ts backend/src/database.old.ts

# Переименовать новый index
mv backend/src/index.new.ts backend/src/index.ts

# Обновить package.json
# "main": "dist/index.js"

# Пересобрать
npm run build
npm start
```

### 6. Удаление старых файлов (финальный шаг)

После **полного тестирования** и уверенности, что всё работает:

```bash
rm backend/src/index.old.ts
rm backend/src/api.old.ts
rm backend/src/database.old.ts
rm backend/src/cryptoEngine.ts
rm backend/src/marketEngine.ts
```

## 🔍 Чек-лист тестирования

- [ ] Создание персонажа (POST /api/characters)
- [ ] Получение персонажа (GET /api/characters/:id)
- [ ] Обновление персонажа (PUT /api/characters/:id)
- [ ] Удаление персонажа (DELETE /api/characters/:id)
- [ ] Одобрение анкеты админом (POST /api/admin/characters/:id/approve)
- [ ] Отклонение анкеты (POST /api/admin/characters/:id/reject)
- [ ] Получение обновлений (GET /api/admin/updates)
- [ ] Одобрение обновления (POST /api/admin/updates/:id/approve)
- [ ] Получение акций (GET /api/market/stocks)
- [ ] Покупка акций (POST /api/market/stocks/buy)
- [ ] Получение крипты (GET /api/market/crypto)
- [ ] Покупка крипты (POST /api/market/crypto/buy)
- [ ] Background engines работают (market price updates)

## 🐛 Возможные проблемы и решения

### Проблема: Ошибки импорта
**Решение:** Убедитесь, что все импорты заканчиваются на `.js` (не `.ts`)
```typescript
// ❌ Неправильно
import { something } from './module';

// ✅ Правильно
import { something } from './module.js';
```

### Проблема: Database connection errors
**Решение:** Убедитесь, что `anketi.db` находится в корне backend:
```bash
ls backend/anketi.db
```

### Проблема: Swagger не загружается
**Решение:** Проверьте paths в swaggerOptions (index.new.ts), они должны указывать на скомпилированные .js файлы или исходные .ts

## 📚 Дополнительная информация

- API документация: `http://localhost:3000/api-docs`
- Все endpoints остались идентичными
- Бизнес-логика не изменилась
- База данных не изменилась

## ✨ Преимущества новой архитектуры

1. **Maintainability**: Каждый файл < 300 строк vs 7725 в api.ts
2. **Testability**: Легко тестировать отдельные компоненты
3. **Scalability**: Легко добавлять новую функциональность
4. **Type Safety**: Сильная типизация во всех слоях
5. **Separation of Concerns**: Чёткое разделение ответственности

---

**Вопросы?** Проверьте `backend/REFACTORING.md` для деталей реализации.

