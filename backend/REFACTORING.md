# Backend Refactoring Documentation

## Completed Refactoring (Layered Architecture)

### New Structure

```
backend/src/
├── controllers/          # HTTP handlers
│   ├── character.controller.ts
│   ├── admin.controller.ts
│   ├── game.controller.ts
│   └── market.controller.ts
├── services/            # Business logic
│   ├── character.service.ts
│   ├── admin.service.ts
│   ├── game.service.ts
│   └── market.service.ts
├── repositories/        # Database operations
│   ├── base.repository.ts
│   ├── character.repository.ts
│   ├── game.repository.ts
│   └── market.repository.ts
├── routes/             # Express routing
│   ├── character.routes.ts
│   ├── admin.routes.ts
│   ├── game.routes.ts
│   ├── market.routes.ts
│   └── index.ts
├── database/
│   ├── connection.ts   # DB connection management
│   └── migrations.ts   # Schema creation
├── utils/
│   ├── errors.ts      # Error handling
│   ├── calculations.ts # Utility calculations
│   └── validators.ts   # Validation functions
├── types/
│   └── index.ts       # TypeScript types
├── engines/           # Background tasks
│   ├── market.engine.ts
│   └── crypto.engine.ts
└── index.new.ts       # New entry point
```

### Key Improvements

1. **Separation of Concerns**
   - Controllers handle HTTP requests/responses
   - Services contain business logic
   - Repositories manage database operations

2. **Type Safety**
   - Centralized type definitions in `types/index.ts`
   - Strong typing throughout the codebase

3. **Error Handling**
   - Custom error classes (ValidationError, NotFoundError, etc.)
   - Centralized error handling utility

4. **Code Reusability**
   - BaseRepository with common CRUD operations
   - Shared utility functions for calculations and validation

5. **Database Management**
   - Connection pooling with `getDbConnection()`
   - Migration system for schema management

### Migration Guide

#### To use the refactored code:

1. **Update `package.json`:**
   ```json
   {
     "main": "dist/index.new.js"
   }
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

#### API Endpoints (Unchanged for compatibility)

All existing API endpoints remain the same:

- `POST /api/characters` - Create character
- `GET /api/characters/:id` - Get character
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character
- `GET /api/admin/characters/pending` - Get pending characters
- `POST /api/admin/characters/:id/approve` - Approve character
- `POST /api/admin/updates/:id/approve` - Approve update
- `GET /api/market/stocks` - Get stocks
- `POST /api/market/stocks/buy` - Buy stock
- etc.

### Files to Remove (After Testing)

Once the refactored version is confirmed working:

- `src/api.ts` (7725 lines → split into multiple files)
- `src/database.ts` (2715 lines → database/migrations.ts)
- `src/marketEngine.ts` → `engines/market.engine.ts`
- `src/cryptoEngine.ts` → `engines/crypto.engine.ts`

### Testing Checklist

- [ ] Character creation and updates
- [ ] Admin approval/rejection workflows
- [ ] Market operations (stocks/crypto)
- [ ] Game operations (casino, fishing, hunting)
- [ ] Background engines (market, crypto price updates)

### Notes

- All business logic remains identical
- API contracts are preserved
- Database schema unchanged
- Background engines refactored for better connection management

