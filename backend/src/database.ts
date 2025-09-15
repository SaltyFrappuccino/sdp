import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDB() {
  try {
    const db = await open({
      filename: './anketi.db',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id INTEGER UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS Characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vk_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        character_name TEXT NOT NULL,
        nickname TEXT,
        age INTEGER,
        rank TEXT,
        faction TEXT,
        faction_position TEXT,
        home_island TEXT,
        appearance TEXT,
        character_images TEXT,
        personality TEXT,
        biography TEXT,
        life_status TEXT DEFAULT 'Жив',
        archetypes TEXT,
        attributes TEXT,
        attribute_points_total INTEGER DEFAULT 20,
        attribute_points_spent INTEGER DEFAULT 0,
        aura_cells TEXT,
        inventory TEXT,
        currency INTEGER,
        admin_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS CharacterVersions (
        version_id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        version_number INTEGER DEFAULT 1,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );

      CREATE TRIGGER IF NOT EXISTS after_character_update
      AFTER UPDATE ON Characters
      BEGIN
        INSERT INTO CharacterVersions (character_id, data, version_number)
        VALUES (
          OLD.id,
          JSON_OBJECT(
            'vk_id', IFNULL(OLD.vk_id, ''),
            'status', IFNULL(OLD.status, ''),
            'character_name', IFNULL(OLD.character_name, ''),
            'nickname', IFNULL(OLD.nickname, ''),
            'age', IFNULL(OLD.age, 0),
            'rank', IFNULL(OLD.rank, ''),
            'faction', IFNULL(OLD.faction, ''),
            'faction_position', IFNULL(OLD.faction_position, ''),
            'home_island', IFNULL(OLD.home_island, ''),
            'appearance', IFNULL(OLD.appearance, ''),
            'character_images', IFNULL(OLD.character_images, '[]'),
            'personality', IFNULL(OLD.personality, ''),
            'biography', IFNULL(OLD.biography, ''),
            'life_status', IFNULL(OLD.life_status, 'Жив'),
            'archetypes', IFNULL(OLD.archetypes, '[]'),
            'attributes', IFNULL(OLD.attributes, '{}'),
            'aura_cells', IFNULL(OLD.aura_cells, '{}'),
            'inventory', IFNULL(OLD.inventory, '[]'),
            'currency', IFNULL(OLD.currency, 0),
            'admin_note', IFNULL(OLD.admin_note, '')
          ),
          (SELECT IFNULL(MAX(version_number), 0) + 1
           FROM CharacterVersions
           WHERE character_id = OLD.id)
        );
      END;
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS Contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        contract_name TEXT,
        creature_name TEXT,
        creature_rank TEXT,
        creature_spectrum TEXT,
        creature_description TEXT,
        creature_images TEXT,
        gift TEXT,
        sync_level INTEGER,
        unity_stage TEXT,
        abilities TEXT,
        manifestation TEXT,
        dominion TEXT,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    try {
      await db.exec('ALTER TABLE Contracts RENAME COLUMN creature_image TO creature_images');
    } catch (error) {
      // Игнорируем ошибку, если колонка уже переименована или ее не было
      if (!(error instanceof Error && (error.message.includes('no such column: creature_image') || error.message.includes('duplicate column name: creature_images')))) {
        // Также можно добавить проверку на уже существующую колонку creature_images
      }
    }

    await db.exec(`
      CREATE TABLE IF NOT EXISTS MarketItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        item_type TEXT NOT NULL,
        item_data TEXT,
        image_url TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        seller_character_id INTEGER,
        FOREIGN KEY(seller_character_id) REFERENCES Characters(id) ON DELETE SET NULL
      );
    `);


    await db.exec(`
      CREATE TABLE IF NOT EXISTS ai_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        result TEXT NOT NULL,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS CharacterUpdates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER,
        updated_data TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id)
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ActivityRequests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        vk_id INTEGER NOT NULL,
        request_type TEXT NOT NULL CHECK (request_type IN ('quest', 'gate')),
        quest_rank TEXT,
        gate_rank TEXT,
        character_rank TEXT NOT NULL,
        faction TEXT NOT NULL,
        team_members TEXT DEFAULT '[]',
        rank_promotion TEXT,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        reward TEXT,
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    // Создаем таблицы для новой системы ивентов
    await db.exec(`
      CREATE TABLE IF NOT EXISTS Events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        estimated_start_date DATETIME NOT NULL,
        registration_end_date DATETIME,
        min_rank TEXT,
        max_rank TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS EventBranches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        branch_name TEXT NOT NULL,
        description TEXT,
        min_rank TEXT,
        max_rank TEXT,
        max_participants INTEGER,
        rewards TEXT, -- JSON строка с наградами
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(event_id) REFERENCES Events(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS EventParticipants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        vk_id INTEGER NOT NULL,
        branch_id INTEGER, -- может быть NULL для старых записей
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(event_id) REFERENCES Events(id) ON DELETE CASCADE,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY(branch_id) REFERENCES EventBranches(id) ON DELETE SET NULL
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS EventBets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        bet_text TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled')),
        result TEXT CHECK (result IN ('believers_win', 'unbelievers_win')),
        believers_total_pool REAL DEFAULT 0,
        unbelievers_total_pool REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        settled_at DATETIME,
        FOREIGN KEY(event_id) REFERENCES Events(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS EventBetPlacements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bet_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        vk_id INTEGER NOT NULL,
        bet_type TEXT NOT NULL CHECK (bet_type IN ('believer', 'unbeliever')),
        amount REAL NOT NULL,
        odds_at_placement REAL NOT NULL,
        potential_payout REAL NOT NULL,
        actual_payout REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(bet_id) REFERENCES EventBets(id) ON DELETE CASCADE,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS Stocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        ticker_symbol TEXT NOT NULL UNIQUE,
        description TEXT,
        current_price REAL NOT NULL,
        market_cap REAL,
        volume INTEGER,
        exchange TEXT NOT NULL CHECK (exchange IN ('IGX', 'KSM', 'MCM', 'OSB')),
        base_trend REAL DEFAULT 0.0,
        total_shares INTEGER DEFAULT 1000000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS StockPriceHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_id INTEGER NOT NULL,
        price REAL NOT NULL,
        timestamp TEXT, -- ISO 8601 format with milliseconds (YYYY-MM-DDTHH:mm:ss.sssZ)
        FOREIGN KEY(stock_id) REFERENCES Stocks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS Portfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL UNIQUE,
        cash_balance REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS PortfolioAssets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        average_purchase_price REAL NOT NULL,
        FOREIGN KEY(portfolio_id) REFERENCES Portfolios(id) ON DELETE CASCADE,
        FOREIGN KEY(stock_id) REFERENCES Stocks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ShortPositions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        short_price REAL NOT NULL,
        margin_requirement REAL NOT NULL,
        interest_rate REAL DEFAULT 0.05,
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'margin_call')),
        FOREIGN KEY(portfolio_id) REFERENCES Portfolios(id) ON DELETE CASCADE,
        FOREIGN KEY(stock_id) REFERENCES Stocks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS OptionsContracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        contract_type TEXT NOT NULL CHECK (contract_type IN ('call', 'put')),
        strike_price REAL NOT NULL,
        expiry_date DATETIME NOT NULL,
        premium_paid REAL NOT NULL,
        quantity INTEGER NOT NULL,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'exercised', 'expired')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(portfolio_id) REFERENCES Portfolios(id) ON DELETE CASCADE,
        FOREIGN KEY(stock_id) REFERENCES Stocks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS FuturesContracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        contract_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        expiry_date DATETIME NOT NULL,
        margin_requirement REAL NOT NULL,
        position_type TEXT CHECK (position_type IN ('long', 'short')),
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(portfolio_id) REFERENCES Portfolios(id) ON DELETE CASCADE,
        FOREIGN KEY(stock_id) REFERENCES Stocks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS TradingOrders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portfolio_id INTEGER NOT NULL,
        stock_id INTEGER NOT NULL,
        order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
        side TEXT NOT NULL CHECK (side IN ('buy', 'sell', 'short', 'cover')),
        quantity INTEGER NOT NULL,
        price REAL,
        stop_price REAL,
        instrument_type TEXT DEFAULT 'stock' CHECK (instrument_type IN ('stock', 'option', 'future')),
        time_in_force TEXT DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'DAY')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'rejected')),
        filled_quantity INTEGER DEFAULT 0,
        avg_fill_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(portfolio_id) REFERENCES Portfolios(id) ON DELETE CASCADE,
        FOREIGN KEY(stock_id) REFERENCES Stocks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS MarketEvents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        impacted_stock_id INTEGER,
        impact_strength REAL NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        created_by_admin_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(impacted_stock_id) REFERENCES Stocks(id) ON DELETE CASCADE
      );


      CREATE TABLE IF NOT EXISTS CasinoGames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        game_type TEXT NOT NULL CHECK (game_type IN ('blackjack', 'slots', 'dice')),
        bet_amount REAL NOT NULL,
        win_amount REAL DEFAULT 0,
        game_data TEXT DEFAULT '{}',
        result TEXT NOT NULL CHECK (result IN ('win', 'lose', 'push')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    // Миграция для CasinoGames - проверяем и пересоздаем таблицу если нужно
    try {
      // Проверяем есть ли колонка game_type
      const tableInfo = await db.all("PRAGMA table_info(CasinoGames)");
      const hasGameType = tableInfo.some((col: any) => col.name === 'game_type');
      const hasGameState = tableInfo.some((col: any) => col.name === 'game_state');
      
      if (!hasGameType || hasGameState) {
        console.log('CasinoGames table needs migration (missing game_type or has game_state), recreating table...');
        
        // Создаем временную таблицу с правильной схемой
        await db.exec(`
          CREATE TABLE IF NOT EXISTS CasinoGames_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            game_type TEXT NOT NULL CHECK (game_type IN ('blackjack', 'slots', 'dice')),
            bet_amount REAL NOT NULL,
            win_amount REAL DEFAULT 0,
            game_data TEXT DEFAULT '{}',
            result TEXT NOT NULL CHECK (result IN ('win', 'lose', 'push')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
          );
        `);
        
        // Копируем данные из старой таблицы (если есть)
        // Проверяем какие поля есть в старой таблице
        const oldTableInfo = await db.all("PRAGMA table_info(CasinoGames)");
        const oldColumns = oldTableInfo.map((col: any) => col.name);
        
        // Строим список полей для копирования
        const columnsToCopy = ['id', 'character_id', 'created_at'];
        if (oldColumns.includes('bet_amount')) columnsToCopy.push('bet_amount');
        if (oldColumns.includes('win_amount')) columnsToCopy.push('win_amount');
        if (oldColumns.includes('game_data')) columnsToCopy.push('game_data');
        if (oldColumns.includes('result')) columnsToCopy.push('result');
        
        const selectColumns = columnsToCopy.join(', ');
        const insertColumns = columnsToCopy.join(', ');
        
        await db.exec(`
          INSERT INTO CasinoGames_new (${insertColumns})
          SELECT ${selectColumns} FROM CasinoGames;
        `);
        
        // Удаляем старую таблицу и переименовываем новую
        await db.exec('DROP TABLE IF EXISTS CasinoGames;');
        await db.exec('ALTER TABLE CasinoGames_new RENAME TO CasinoGames;');
        
        console.log('CasinoGames table recreated successfully');
      }
    } catch (error) {
      console.error('Error migrating CasinoGames table:', error);
    }

    // Безопасная миграция для StockPriceHistory
    try {
      // Проверяем существует ли колонка legacy_timestamp
      const stockHistoryColumns = await db.all("PRAGMA table_info(StockPriceHistory)");
      const hasLegacyTimestamp = stockHistoryColumns.some((col: any) => col.name === 'legacy_timestamp');
      
      if (!hasLegacyTimestamp) {
        // Добавляем legacy_timestamp колонку без DEFAULT CURRENT_TIMESTAMP (SQLite ограничение)
        await db.run('ALTER TABLE StockPriceHistory ADD COLUMN legacy_timestamp DATETIME');
        console.log('Added legacy_timestamp column to StockPriceHistory');
        
        // Заполняем legacy_timestamp текущим временем для всех записей
        await db.run(`
          UPDATE StockPriceHistory 
          SET legacy_timestamp = CURRENT_TIMESTAMP 
          WHERE legacy_timestamp IS NULL
        `);
        console.log('Updated legacy_timestamp for existing records');
      }
    } catch (error: any) {
      console.warn('Warning in StockPriceHistory migration:', error.message);
    }

    try {
      // Миграция существующих записей на новый формат timestamp
      await db.run(`
        UPDATE StockPriceHistory 
        SET timestamp = datetime(IFNULL(legacy_timestamp, CURRENT_TIMESTAMP) || 'Z')
        WHERE timestamp IS NULL OR timestamp = ''
      `);
      console.log('Migrated StockPriceHistory timestamp format');
    } catch (error: any) {
      console.warn('Warning migrating timestamp format:', error.message);
    }

    // Безопасная миграция для PortfolioAssets
    try {
      // Проверяем существует ли колонка position_type
      const portfolioColumns = await db.all("PRAGMA table_info(PortfolioAssets)");
      const hasPositionType = portfolioColumns.some((col: any) => col.name === 'position_type');
      
      if (!hasPositionType) {
        // Добавляем position_type колонку без DEFAULT (SQLite ограничение)
        await db.run("ALTER TABLE PortfolioAssets ADD COLUMN position_type TEXT");
        console.log('Added position_type column to PortfolioAssets');
        
        // Обновляем все существующие записи как 'long'
        await db.run(`
          UPDATE PortfolioAssets 
          SET position_type = 'long' 
          WHERE position_type IS NULL OR position_type = ''
        `);
        console.log('Updated position_type for existing assets');
      }
    } catch (error: any) {
      console.warn('Warning in PortfolioAssets migration:', error.message);
    }

    // Безопасная миграция для Stocks - добавляем total_shares
    try {
      // Проверяем существует ли колонка total_shares
      const stocksColumns = await db.all("PRAGMA table_info(Stocks)");
      const hasTotalShares = stocksColumns.some((col: any) => col.name === 'total_shares');
      
      if (!hasTotalShares) {
        // Добавляем total_shares колонку
        await db.run("ALTER TABLE Stocks ADD COLUMN total_shares INTEGER DEFAULT 1000000");
        console.log('Added total_shares column to Stocks');
        
        // Обновляем существующие акции с разными значениями для реализма
        const stockUpdates = [
          { ticker: 'ARSK', shares: 2500000000 }, // Крупная корпорация
          { ticker: 'SBER', shares: 1800000000 }, // Банк 
          { ticker: 'OSS', shares: 500000000 },   // Религиозная организация
          { ticker: 'ORD-B', shares: 10000000000 }, // Государственные облигации
          { ticker: 'BLK-L', shares: 100000000 },  // Криминальный индекс
          { ticker: 'MDZ-H', shares: 50000000 }    // Редкие товары
        ];
        
        for (const update of stockUpdates) {
          await db.run(`
            UPDATE Stocks 
            SET total_shares = ? 
            WHERE ticker_symbol = ?
          `, [update.shares, update.ticker]);
        }
        console.log('Updated total_shares for existing stocks');
      }
    } catch (error: any) {
      console.warn('Warning in Stocks migration:', error.message);
    }

    await seedStocks(db);

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function seedStocks(db: any) {
  const stocks = [
    { name: 'Arasaka', ticker_symbol: 'ARSK', description: 'Промышленный и военный гигант, производитель оружия, роботов и имплантов.', current_price: 150.75, exchange: 'IGX', total_shares: 2500000000 },
    { name: 'Sber', ticker_symbol: 'SBER', description: 'Цифровой гигант, контролирующий информацию, финансы и логистику.', current_price: 280.50, exchange: 'IGX', total_shares: 1800000000 },
    { name: 'Отражённый Свет Солнца', ticker_symbol: 'OSS', description: 'Религиозная и бизнес-сеть с огромным влиянием.', current_price: 120.00, exchange: 'IGX', total_shares: 500000000 },
    { name: 'Стабилизационные Облигации Порядка', ticker_symbol: 'ORD-B', description: 'Надежные государственные облигации, поддерживаемые Порядком.', current_price: 100.00, exchange: 'OSB', total_shares: 10000000000 },
    { name: 'Индекс Влияния "Чёрной Лилии"', ticker_symbol: 'BLK-L', description: 'Высокорисковый индекс, отражающий успех теневых операций.', current_price: 50.25, exchange: 'KSM', total_shares: 100000000 },
    { name: 'Редкие травы с Мидзу', ticker_symbol: 'MDZ-H', description: 'Товарный фьючерс на поставку уникальных лекарственных растений.', current_price: 3500.00, exchange: 'MCM', total_shares: 50000000 }
  ];

  const stmt = await db.prepare('INSERT OR IGNORE INTO Stocks (name, ticker_symbol, description, current_price, exchange, total_shares) VALUES (?, ?, ?, ?, ?, ?)');
  for (const stock of stocks) {
    await stmt.run(stock.name, stock.ticker_symbol, stock.description, stock.current_price, stock.exchange, stock.total_shares);
  }
  await stmt.finalize();
}