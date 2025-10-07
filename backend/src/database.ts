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

    // Миграция для CasinoGames - проверяем и обновляем constraint для новых типов игр
    try {
      // Проверяем существующую структуру таблицы
      const tableInfo = await db.all("PRAGMA table_info(CasinoGames)");
      const hasGameType = tableInfo.some((col: any) => col.name === 'game_type');
      
      if (!hasGameType) {
        console.log('CasinoGames table needs migration (missing game_type column)');
        // Если нет game_type, значит таблица создана правильно выше, ничего делать не нужно
      } else {
        // Проверяем, нужно ли обновить constraint для типов игр
        // Это безопасная операция, не требующая блокировки
        console.log('CasinoGames table exists with correct structure');
      }
    } catch (error: any) {
      // Игнорируем ошибки блокировки БД при миграции - таблица уже существует
      if (error.code === 'SQLITE_BUSY') {
        console.log('CasinoGames migration skipped - database busy (table likely already migrated)');
      } else {
        console.warn('Error checking CasinoGames table structure:', error.message);
      }
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

    // Создаем таблицы для покера
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PokerRooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL,
        creator_id INTEGER NOT NULL,
        max_players INTEGER DEFAULT 6,
        buy_in INTEGER NOT NULL,
        small_blind INTEGER NOT NULL,
        big_blind INTEGER NOT NULL,
        status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
        current_hand_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(creator_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS PokerPlayers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        seat_position INTEGER NOT NULL,
        chips INTEGER NOT NULL,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'folded', 'eliminated', 'disconnected')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(room_id) REFERENCES PokerRooms(id) ON DELETE CASCADE,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        UNIQUE(room_id, seat_position),
        UNIQUE(room_id, character_id)
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS PokerHands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        hand_number INTEGER NOT NULL,
        dealer_position INTEGER NOT NULL,
        small_blind_position INTEGER NOT NULL,
        big_blind_position INTEGER NOT NULL,
        community_cards TEXT DEFAULT '[]', -- JSON массив карт
        deck_state TEXT DEFAULT '[]', -- JSON массив оставшихся карт в колоде
        pot INTEGER DEFAULT 0,
        current_bet INTEGER DEFAULT 0,
        current_player_position INTEGER,
        round_stage TEXT DEFAULT 'preflop' CHECK (round_stage IN ('preflop', 'flop', 'turn', 'river', 'showdown', 'finished')),
        winner_id INTEGER,
        side_pots TEXT DEFAULT '[]', -- JSON для side pots
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        turn_timeout_at DATETIME, -- Когда истекает время хода текущего игрока
        FOREIGN KEY(room_id) REFERENCES PokerRooms(id) ON DELETE CASCADE
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS PokerPlayerCards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hand_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        card1 TEXT NOT NULL, -- например "As" (туз пик)
        card2 TEXT NOT NULL,
        FOREIGN KEY(hand_id) REFERENCES PokerHands(id) ON DELETE CASCADE,
        FOREIGN KEY(player_id) REFERENCES PokerPlayers(id) ON DELETE CASCADE,
        UNIQUE(hand_id, player_id)
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS PokerActions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hand_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        action_type TEXT NOT NULL CHECK (action_type IN ('fold', 'call', 'raise', 'check', 'all_in', 'small_blind', 'big_blind')),
        amount INTEGER DEFAULT 0,
        round_stage TEXT NOT NULL CHECK (round_stage IN ('preflop', 'flop', 'turn', 'river')),
        action_order INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(hand_id) REFERENCES PokerHands(id) ON DELETE CASCADE,
        FOREIGN KEY(player_id) REFERENCES PokerPlayers(id) ON DELETE CASCADE
      );
    `);

    // Таблица лошадей для Horse Racing
    await db.exec(`
      CREATE TABLE IF NOT EXISTS Horses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        emoji TEXT NOT NULL,
        personality TEXT NOT NULL,
        speed INTEGER NOT NULL,
        stamina INTEGER NOT NULL,
        luck INTEGER NOT NULL,
        total_races INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        second_places INTEGER DEFAULT 0,
        third_places INTEGER DEFAULT 0,
        total_winnings INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Таблица результатов скачек
    await db.exec(`
      CREATE TABLE IF NOT EXISTS HorseRaceResults (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        horse_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        final_time REAL NOT NULL,
        distance_covered REAL NOT NULL,
        race_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(game_id) REFERENCES CasinoGames(id) ON DELETE CASCADE,
        FOREIGN KEY(horse_id) REFERENCES Horses(id) ON DELETE CASCADE
      );
    `);

    // Миграция для добавления deck_state в PokerHands
    try {
      const pokerHandsColumns = await db.all("PRAGMA table_info(PokerHands)");
      const hasDeckState = pokerHandsColumns.some((col: any) => col.name === 'deck_state');
      
      if (!hasDeckState) {
        console.log('Adding deck_state column to PokerHands table...');
        await db.run('ALTER TABLE PokerHands ADD COLUMN deck_state TEXT DEFAULT "[]"');
        console.log('deck_state column added successfully');
      }
    } catch (error) {
      console.warn('Could not add deck_state column:', error);
    }

    // Миграция для добавления turn_timeout_at в PokerHands
    try {
      const pokerHandsColumns = await db.all("PRAGMA table_info(PokerHands)");
      const hasTurnTimeout = pokerHandsColumns.some((col: any) => col.name === 'turn_timeout_at');
      
      if (!hasTurnTimeout) {
        console.log('Adding turn_timeout_at column to PokerHands table...');
        await db.run('ALTER TABLE PokerHands ADD COLUMN turn_timeout_at DATETIME');
        console.log('turn_timeout_at column added successfully');
      }
    } catch (error) {
      console.warn('Could not add turn_timeout_at column:', error);
    }

    // ========================================
    // КРИПТОВАЛЮТЫ (Блокчейн Биржа)
    // ========================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS CryptoCurrencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        ticker_symbol TEXT NOT NULL UNIQUE,
        description TEXT,
        current_price REAL NOT NULL,
        base_volatility REAL DEFAULT 0.15,
        total_supply BIGINT DEFAULT 1000000000,
        circulating_supply BIGINT DEFAULT 1000000000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS CryptoPortfolios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL UNIQUE,
        crypto_balances TEXT DEFAULT '{}', -- JSON с балансами {crypto_id: {quantity, average_purchase_price}}
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS CryptoTransactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        crypto_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
        quantity REAL NOT NULL,
        price_per_coin REAL NOT NULL,
        total_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY(crypto_id) REFERENCES CryptoCurrencies(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS CryptoPriceHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crypto_id INTEGER NOT NULL,
        price REAL NOT NULL,
        timestamp TEXT NOT NULL, -- ISO 8601 format
        FOREIGN KEY(crypto_id) REFERENCES CryptoCurrencies(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS CryptoEvents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        impacted_crypto_id INTEGER,
        impact_strength REAL NOT NULL, -- от -1 до 1
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        created_by_admin_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(impacted_crypto_id) REFERENCES CryptoCurrencies(id) ON DELETE CASCADE
      );
    `);

    // ========================================
    // ПОКУПКИ (Расширенный маркетплейс)
    // ========================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PurchaseCategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS PurchaseItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        base_price INTEGER NOT NULL,
        island TEXT, -- Кага, Ичи, Хоши, и т.д.
        rank_required TEXT, -- минимальный ранг для покупки
        image_url TEXT,
        rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
        properties TEXT DEFAULT '{}', -- JSON с характеристиками
        is_collectible INTEGER DEFAULT 0,
        available INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES PurchaseCategories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS CharacterPurchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        purchase_price INTEGER NOT NULL,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY(item_id) REFERENCES PurchaseItems(id) ON DELETE CASCADE
      );
    `);

    // ========================================
    // КОЛЛЕКЦИИ
    // ========================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS CollectionSeries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        total_items INTEGER NOT NULL,
        season INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS CollectionItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
        image_url TEXT,
        lore_text TEXT,
        drop_rate REAL NOT NULL, -- от 0 до 1
        properties TEXT DEFAULT '{}', -- JSON
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(series_id) REFERENCES CollectionSeries(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS CharacterCollection (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY(item_id) REFERENCES CollectionItems(id) ON DELETE CASCADE,
        UNIQUE(character_id, item_id)
      );

      CREATE TABLE IF NOT EXISTS CollectionPacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        guaranteed_rarity TEXT, -- минимальная гарантированная редкость
        items_count INTEGER DEFAULT 5, -- количество предметов в паке
        series_id INTEGER, -- NULL если пак содержит предметы из всех серий
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(series_id) REFERENCES CollectionSeries(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS CollectionTradeOffers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        offered_item_id INTEGER NOT NULL,
        requested_item_id INTEGER,
        requested_rarity TEXT, -- если хочет любой предмет определенной редкости
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY(offered_item_id) REFERENCES CollectionItems(id) ON DELETE CASCADE,
        FOREIGN KEY(requested_item_id) REFERENCES CollectionItems(id) ON DELETE SET NULL
      );
    `);

    // ========================================
    // ФРАКЦИИ
    // ========================================
    await db.exec(`
      CREATE TABLE IF NOT EXISTS Factions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        creator_vk_id INTEGER,
        is_canon INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await seedStocks(db);
    await seedHorses(db);
    await seedCryptoCurrencies(db);
    await seedPurchaseCategories(db);
    await seedCollectionSeries(db);
    await seedFactions(db);

    // Создание таблиц для Бестиария
    await db.exec(`
      CREATE TABLE IF NOT EXISTS BestiaryTaxonomy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id INTEGER,
        level TEXT NOT NULL CHECK(level IN ('kingdom', 'type', 'class', 'family')),
        name TEXT NOT NULL,
        name_latin TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES BestiaryTaxonomy(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS BestiarySpecies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        name_latin TEXT,
        mutation_class TEXT NOT NULL CHECK(mutation_class IN ('Затронутые', 'Искажённые', 'Бестии')),
        danger_rank TEXT NOT NULL CHECK(danger_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
        habitat_type TEXT NOT NULL CHECK(habitat_type IN ('Наземные', 'Водные', 'Воздушные', 'Подземные', 'Амфибии')),
        description TEXT,
        appearance TEXT,
        behavior TEXT,
        abilities TEXT,
        size_category TEXT CHECK(size_category IN ('Мелкие', 'Средние', 'Крупные', 'Гигантские')),
        weight_min REAL,
        weight_max REAL,
        tags TEXT,
        image_url TEXT,
        is_hostile BOOLEAN DEFAULT 1,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES BestiaryTaxonomy(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS BestiaryLocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        species_id INTEGER NOT NULL,
        island TEXT NOT NULL CHECK(island IN ('Кага', 'Хоши', 'Ичи', 'Куро', 'Мидзу', 'Сора')),
        region TEXT,
        biome TEXT,
        is_echo_zone BOOLEAN DEFAULT 0,
        rarity TEXT CHECK(rarity IN ('Обычный', 'Необычный', 'Редкий', 'Очень редкий', 'Легендарный')),
        population_density TEXT CHECK(population_density IN ('Единичные', 'Малая', 'Средняя', 'Высокая', 'Массовая')),
        seasonal_availability TEXT,
        FOREIGN KEY (species_id) REFERENCES BestiarySpecies(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS BestiaryCharacteristics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        species_id INTEGER NOT NULL,
        strength_tag TEXT,
        speed_tag TEXT,
        defense_tag TEXT,
        special_tag TEXT,
        aura_signature TEXT,
        drop_items TEXT,
        credit_value_min INTEGER,
        credit_value_max INTEGER,
        FOREIGN KEY (species_id) REFERENCES BestiarySpecies(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS BestiaryResearchNotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        species_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        note_text TEXT,
        discovery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (species_id) REFERENCES BestiarySpecies(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    await seedBestiary(db);

    // Создание таблиц для Рыбалки и Охоты
    await db.exec(`
      -- Локации для рыбалки
      CREATE TABLE IF NOT EXISTS FishingLocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        island TEXT NOT NULL CHECK(island IN ('Кага', 'Хоши', 'Ичи', 'Куро', 'Мидзу', 'Сора')),
        region TEXT,
        water_type TEXT CHECK(water_type IN ('Река', 'Озеро', 'Море', 'Болото', 'Эхо-Зона')),
        min_rank TEXT CHECK(min_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
        description TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT 1
      );

      -- Виды рыб
      CREATE TABLE IF NOT EXISTS FishSpecies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        name_latin TEXT,
        rarity TEXT CHECK(rarity IN ('Обычная', 'Необычная', 'Редкая', 'Очень редкая', 'Легендарная')),
        size_category TEXT CHECK(size_category IN ('Мелкая', 'Средняя', 'Крупная', 'Трофейная')),
        weight_min REAL,
        weight_max REAL,
        description TEXT,
        appearance TEXT,
        mutation_type TEXT,
        base_price INTEGER,
        is_active BOOLEAN DEFAULT 1
      );

      -- Связь рыб с локациями
      CREATE TABLE IF NOT EXISTS FishLocationSpawns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fish_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        spawn_chance REAL,
        FOREIGN KEY (fish_id) REFERENCES FishSpecies(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES FishingLocations(id) ON DELETE CASCADE
      );

      -- Снаряжение для рыбалки
      CREATE TABLE IF NOT EXISTS FishingGear (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('Удочка', 'Наживка', 'Улучшение')),
        quality TEXT CHECK(quality IN ('Базовое', 'Обычное', 'Хорошее', 'Отличное', 'Эпическое', 'Легендарное')),
        price INTEGER,
        bonus_chance REAL,
        bonus_rarity REAL,
        description TEXT,
        min_rank TEXT CHECK(min_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
        is_basic BOOLEAN DEFAULT 0,
        is_consumable BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1
      );

      -- Локации для охоты
      CREATE TABLE IF NOT EXISTS HuntingLocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        island TEXT NOT NULL CHECK(island IN ('Кага', 'Хоши', 'Ичи', 'Куро', 'Мидзу', 'Сора')),
        region TEXT,
        terrain_type TEXT CHECK(terrain_type IN ('Лес', 'Горы', 'Равнина', 'Болото', 'Эхо-Зона')),
        min_rank TEXT CHECK(min_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
        description TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT 1
      );

      -- Связь существ с охотничьими локациями
      CREATE TABLE IF NOT EXISTS HuntingLocationSpawns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        species_id INTEGER NOT NULL,
        location_id INTEGER NOT NULL,
        spawn_chance REAL,
        FOREIGN KEY (species_id) REFERENCES BestiarySpecies(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES HuntingLocations(id) ON DELETE CASCADE
      );

      -- Снаряжение для охоты
      CREATE TABLE IF NOT EXISTS HuntingGear (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('Оружие', 'Ловушка', 'Приманка', 'Броня', 'Наземная ловушка', 'Воздушная ловушка')),
        quality TEXT CHECK(quality IN ('Базовое', 'Обычное', 'Хорошее', 'Отличное', 'Эпическое', 'Легендарное')),
        price INTEGER,
        bonus_damage REAL,
        bonus_defense REAL,
        bonus_success REAL,
        description TEXT,
        min_rank TEXT CHECK(min_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
        is_basic BOOLEAN DEFAULT 0,
        is_consumable BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1
      );

      -- Инвентарь рыбалки персонажа
      CREATE TABLE IF NOT EXISTS CharacterFishInventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        fish_id INTEGER NOT NULL,
        weight REAL,
        caught_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        location_id INTEGER,
        is_sold BOOLEAN DEFAULT 0,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY (fish_id) REFERENCES FishSpecies(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES FishingLocations(id)
      );

      -- Инвентарь охоты персонажа
      CREATE TABLE IF NOT EXISTS CharacterHuntInventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        species_id INTEGER NOT NULL,
        loot_items TEXT,
        hunted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        location_id INTEGER,
        is_sold BOOLEAN DEFAULT 0,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY (species_id) REFERENCES BestiarySpecies(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES HuntingLocations(id)
      );

      -- Снаряжение персонажа для рыбалки
      CREATE TABLE IF NOT EXISTS CharacterFishingGear (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        gear_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        is_equipped BOOLEAN DEFAULT 0,
        condition REAL DEFAULT 1.0,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY (gear_id) REFERENCES FishingGear(id) ON DELETE CASCADE
      );

      -- Снаряжение персонажа для охоты
      CREATE TABLE IF NOT EXISTS CharacterHuntingGear (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        gear_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        is_equipped BOOLEAN DEFAULT 0,
        condition REAL DEFAULT 1.0,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
        FOREIGN KEY (gear_id) REFERENCES HuntingGear(id) ON DELETE CASCADE
      );
    `);

    // Проверяем, нужна ли миграция
    let needsMigration = false;
    
    try {
      // Проверяем, есть ли колонка is_consumable в FishingGear
      const fishingColumns = await db.all(`PRAGMA table_info(FishingGear)`);
      const hasConsumableColumn = fishingColumns.some((col: any) => col.name === 'is_consumable');
      
      if (!hasConsumableColumn) {
        console.log('FishingGear missing is_consumable column, migration needed');
        needsMigration = true;
      }
    } catch (error) {
      console.log('FishingGear table does not exist, migration needed');
      needsMigration = true;
    }

    // Всегда выполняем очистку дублирующихся записей
    console.log('Cleaning duplicate records...');
    await cleanDuplicateRecords(db);

    if (needsMigration) {
      console.log('Starting migration for FishingGear and HuntingGear...');
      
      // Сохраняем данные из существующих таблиц
      let existingFishingGear = [];
      let existingHuntingGear = [];
      
      try {
        existingFishingGear = await db.all(`SELECT * FROM FishingGear`);
        console.log('Backed up FishingGear data:', existingFishingGear.length, 'items');
      } catch (error) {
        console.log('No existing FishingGear data to backup');
      }
      
      try {
        existingHuntingGear = await db.all(`SELECT * FROM HuntingGear`);
        console.log('Backed up HuntingGear data:', existingHuntingGear.length, 'items');
      } catch (error) {
        console.log('No existing HuntingGear data to backup');
      }

      // Удаляем старые таблицы
      try {
        await db.run(`DROP TABLE IF EXISTS FishingGear`);
        await db.run(`DROP TABLE IF EXISTS HuntingGear`);
        console.log('Dropped old tables');
      } catch (error) {
        console.log('Error dropping tables:', error);
      }

      // Создаем новые таблицы с полной схемой
      await db.run(`
        CREATE TABLE FishingGear (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT CHECK(type IN ('Удочка', 'Наживка')),
          quality TEXT CHECK(quality IN ('Базовое', 'Обычное', 'Хорошее', 'Отличное', 'Эпическое', 'Легендарное')),
          price INTEGER,
          bonus_chance REAL,
          bonus_rarity REAL,
          description TEXT,
          min_rank TEXT CHECK(min_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
          is_basic BOOLEAN DEFAULT 0,
          is_consumable BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      await db.run(`
        CREATE TABLE HuntingGear (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          type TEXT CHECK(type IN ('Оружие', 'Ловушка', 'Приманка', 'Броня', 'Наземная ловушка', 'Воздушная ловушка')),
          quality TEXT CHECK(quality IN ('Базовое', 'Обычное', 'Хорошее', 'Отличное', 'Эпическое', 'Легендарное')),
          price INTEGER,
          bonus_damage REAL,
          bonus_defense REAL,
          bonus_success REAL,
          description TEXT,
          min_rank TEXT CHECK(min_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
          is_basic BOOLEAN DEFAULT 0,
          is_consumable BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1
        )
      `);

      console.log('Created new tables with full schema');

      // Восстанавливаем данные только если они есть
      if (existingFishingGear.length > 0) {
        for (const item of existingFishingGear) {
          await db.run(`
            INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic, is_consumable, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            item.name, item.type, item.quality, item.price, 
            item.bonus_chance || 0, item.bonus_rarity || 0, item.description, 
            item.min_rank || 'F', item.is_basic || 0, item.is_consumable || 0, item.is_active || 1
          ]);
        }
        console.log('Restored FishingGear data');
      }

      if (existingHuntingGear.length > 0) {
        for (const item of existingHuntingGear) {
          await db.run(`
            INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            item.name, item.type, item.quality, item.price,
            item.bonus_damage || 0, item.bonus_defense || 0, item.bonus_success || 0,
            item.description, item.min_rank || 'F', item.is_basic || 0, item.is_consumable || 0, item.is_active || 1
          ]);
        }
        console.log('Restored HuntingGear data');
      }

      // Обновляем типы ловушек в существующих записях
      try {
        await db.run(`UPDATE HuntingGear SET type = 'Наземная ловушка' WHERE type = 'Ловушка'`);
        console.log('Updated trap types in HuntingGear');
      } catch (error) {
        console.log('Could not update trap types:', error);
      }

      // Пересоздаем таблицы CharacterFishingGear и CharacterHuntingGear
      console.log('Recreating CharacterFishingGear and CharacterHuntingGear tables...');
      
      // Сохраняем данные
      let existingCharacterFishingGear = [];
      let existingCharacterHuntingGear = [];
      
      try {
        existingCharacterFishingGear = await db.all(`SELECT * FROM CharacterFishingGear`);
        console.log('Backed up CharacterFishingGear data:', existingCharacterFishingGear.length, 'items');
      } catch (error) {
        console.log('No existing CharacterFishingGear data to backup');
      }
      
      try {
        existingCharacterHuntingGear = await db.all(`SELECT * FROM CharacterHuntingGear`);
        console.log('Backed up CharacterHuntingGear data:', existingCharacterHuntingGear.length, 'items');
      } catch (error) {
        console.log('No existing CharacterHuntingGear data to backup');
      }

      // Удаляем старые таблицы
      try {
        await db.run(`DROP TABLE IF EXISTS CharacterFishingGear`);
        await db.run(`DROP TABLE IF EXISTS CharacterHuntingGear`);
        console.log('Dropped old character gear tables');
      } catch (error) {
        console.log('Error dropping character gear tables:', error);
      }

      // Создаем новые таблицы с полной схемой
      await db.run(`
        CREATE TABLE CharacterFishingGear (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          character_id INTEGER NOT NULL,
          gear_id INTEGER NOT NULL,
          is_equipped BOOLEAN DEFAULT 0,
          quantity INTEGER DEFAULT 1,
          condition REAL DEFAULT 1.0,
          FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
          FOREIGN KEY (gear_id) REFERENCES FishingGear(id) ON DELETE CASCADE
        )
      `);

      await db.run(`
        CREATE TABLE CharacterHuntingGear (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          character_id INTEGER NOT NULL,
          gear_id INTEGER NOT NULL,
          is_equipped BOOLEAN DEFAULT 0,
          quantity INTEGER DEFAULT 1,
          condition REAL DEFAULT 1.0,
          FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
          FOREIGN KEY (gear_id) REFERENCES HuntingGear(id) ON DELETE CASCADE
        )
      `);

      console.log('Created new character gear tables with full schema');

      // Восстанавливаем данные
      if (existingCharacterFishingGear.length > 0) {
        for (const item of existingCharacterFishingGear) {
          await db.run(`
            INSERT INTO CharacterFishingGear (character_id, gear_id, is_equipped, quantity, condition)
            VALUES (?, ?, ?, ?, ?)
          `, [
            item.character_id, item.gear_id, item.is_equipped || 0,
            item.quantity || 1, item.condition || 1.0
          ]);
        }
        console.log('Restored CharacterFishingGear data');
      }

      if (existingCharacterHuntingGear.length > 0) {
        for (const item of existingCharacterHuntingGear) {
          await db.run(`
            INSERT INTO CharacterHuntingGear (character_id, gear_id, is_equipped, quantity, condition)
            VALUES (?, ?, ?, ?, ?)
          `, [
            item.character_id, item.gear_id, item.is_equipped || 0,
            item.quantity || 1, item.condition || 1.0
          ]);
        }
        console.log('Restored CharacterHuntingGear data');
      }

    // Заполняем данные только если таблицы пустые
    console.log('Seeding fishing and hunting data...');
    await seedFishingData(db);
    await seedHuntingData(db);
    
    // Проверяем, есть ли связи между локациями и существами
    const huntingSpawnsCount = await db.get(`SELECT COUNT(*) as count FROM HuntingLocationSpawns`);
    if (huntingSpawnsCount.count === 0) {
      console.log('No hunting spawns found, force seeding hunting data...');
      await seedHuntingData(db);
    }
      
      console.log('Migration completed successfully');
    } else {
      console.log('No migration needed, tables are up to date');
      
      // Проверяем, есть ли связи между локациями и существами
      const huntingSpawnsCount = await db.get(`SELECT COUNT(*) as count FROM HuntingLocationSpawns`);
      console.log('HuntingLocationSpawns count:', huntingSpawnsCount.count);
      
      if (huntingSpawnsCount.count === 0) {
        console.log('No hunting spawns found, force seeding hunting data...');
        await seedHuntingData(db);
      }
      
      // Дополнительная проверка - принудительно заполняем данные охоты
      console.log('Force seeding hunting data to ensure spawns exist...');
      
      // Принудительно заполняем существа и их связи с локациями
      console.log('Force seeding hunting creatures and spawns...');
      await seedHuntingCreatures(db);
    }

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

export async function seedHorses(db: any) {
  // Проверяем, есть ли уже лошади в базе
  const existingHorses = await db.get('SELECT COUNT(*) as count FROM Horses');
  if (existingHorses.count > 0) {
    console.log('Horses already exist, skipping seed');
    return;
  }

  const { ALL_HORSES } = await import('./horseLogic.js');
  
  console.log('Seeding horses...');
  const stmt = await db.prepare(`
    INSERT INTO Horses (name, emoji, personality, speed, stamina, luck)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (const horse of ALL_HORSES) {
    await stmt.run(horse.name, horse.emoji, horse.description, horse.baseSpeed, horse.baseStamina, horse.baseLuck);
  }
  
  await stmt.finalize();
  console.log('Horses seeded successfully');
}

export async function seedCryptoCurrencies(db: any) {
  const existingCryptos = await db.get('SELECT COUNT(*) as count FROM CryptoCurrencies');
  if (existingCryptos.count > 0) {
    console.log('CryptoCurrencies already exist, skipping seed');
    return;
  }

  const cryptos = [
    { name: 'GOGOL', ticker: 'GOGOL', description: 'Официальная криптовалюта литературных энтузиастов. Очень волатильная.', price: 1000, volatility: 0.15, supply: 21000000 },
    { name: 'Kazakh Coin', ticker: 'KAZAH', description: 'Народная криптовалюта степей. Известна своей непредсказуемостью.', price: 500, volatility: 0.20, supply: 100000000 },
    { name: 'TOG RP', ticker: 'TOGRP', description: 'Престижная крипта для элиты. Стабильная и дорогая.', price: 5000, volatility: 0.10, supply: 10000000 },
    { name: 'AntiCat Token', ticker: 'ICAT', description: 'Мемная крипта для собачников. Очень рискованная инвестиция!', price: 100, volatility: 0.25, supply: 500000000 },
    { name: 'DogeCoin+', ticker: 'DOGEP', description: 'Крипта лучших друзей человека. К луне!', price: 150, volatility: 0.18, supply: 420690000 },
    { name: 'PainCoin', ticker: 'PAIN', description: 'Для тех, кто любит боль... финансовую боль. Экстремальная волатильность!', price: 666, volatility: 0.30, supply: 66600000 }
  ];

  console.log('Seeding cryptocurrencies...');
  const stmt = await db.prepare(`
    INSERT INTO CryptoCurrencies (name, ticker_symbol, description, current_price, base_volatility, total_supply, circulating_supply)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const crypto of cryptos) {
    await stmt.run(crypto.name, crypto.ticker, crypto.description, crypto.price, crypto.volatility, crypto.supply, crypto.supply);
  }
  
  await stmt.finalize();
  console.log('CryptoCurrencies seeded successfully');
}

export async function seedPurchaseCategories(db: any) {
  const existingCategories = await db.get('SELECT COUNT(*) as count FROM PurchaseCategories');
  if (existingCategories.count > 0) {
    console.log('PurchaseCategories already exist, skipping seed');
    return;
  }

  const categories = [
    { name: 'Транспорт', icon: '🚗', description: 'Автомобили, мотоциклы и другие средства передвижения', order: 1 },
    { name: 'Недвижимость', icon: '🏠', description: 'Квартиры, виллы и коммерческая недвижимость', order: 2 },
    { name: 'Предметы роскоши', icon: '💎', description: 'Эксклюзивные товары для элиты', order: 3 },
    { name: 'Особое снаряжение', icon: '⚔️', description: 'Уникальное боевое и тактическое снаряжение', order: 4 },
    { name: 'Эксклюзивы', icon: '🎭', description: 'Уникальные предметы и услуги', order: 5 }
  ];

  console.log('Seeding purchase categories...');
  const stmt = await db.prepare(`
    INSERT INTO PurchaseCategories (name, icon, description, display_order)
    VALUES (?, ?, ?, ?)
  `);
  
  for (const category of categories) {
    await stmt.run(category.name, category.icon, category.description, category.order);
  }
  
  await stmt.finalize();
  console.log('PurchaseCategories seeded successfully');

  // Добавляем начальные предметы
  await seedInitialPurchaseItems(db);
}

async function seedInitialPurchaseItems(db: any) {
  const items = [
    // Транспорт (category_id: 1)
    { category: 1, name: 'Магнитный автомобиль Sber AI', description: 'Роскошный автомобиль с автопилотом и голографическим интерфейсом. Разгон до 200 км/ч за 3 секунды.', price: 500000000, island: 'Кага', rank: 'C', rarity: 'rare', properties: JSON.stringify({ speed: 200, autopilot: true }) },
    { category: 1, name: 'Скоростной мотоцикл Arasaka', description: 'Боевой мотоцикл с усиленной броней и встроенным оружием. Для настоящих безумцев.', price: 250000000, island: 'Кага', rank: 'D', rarity: 'epic', properties: JSON.stringify({ speed: 250, armor: 'medium', weapons: true }) },
    { category: 1, name: 'Традиционная лодка', description: 'Изящная деревянная лодка ручной работы. Идеально для медитации на воде.', price: 10000000, island: 'Хоши', rank: 'F', rarity: 'common', properties: JSON.stringify({ capacity: 4 }) },
    
    // Недвижимость (category_id: 2)
    { category: 2, name: 'Квартира в Неон-Сити', description: 'Современная квартира 80 кв.м. с панорамным видом на город. 45 этаж.', price: 250000000, island: 'Кага', rank: 'C', rarity: 'rare', properties: JSON.stringify({ area: 80, floor: 45, view: 'city' }) },
    { category: 2, name: 'Вилла в Зелёном Плаце', description: 'Роскошная вилла с садом, бассейном и личной охраной. Символ статуса.', price: 10000000000, island: 'Кага', rank: 'A', rarity: 'legendary', properties: JSON.stringify({ area: 500, garden: true, pool: true, security: 'premium' }) },
    { category: 2, name: 'Дом в Предгорье Лотоса', description: 'Уютный дом в традиционном стиле у подножия священных гор. Идеально для уединения.', price: 100000000, island: 'Хоши', rank: 'D', rarity: 'rare', properties: JSON.stringify({ area: 120, style: 'traditional' }) },
    { category: 2, name: 'Склад в Порту "Могила"', description: 'Большой склад в портовой зоне. Отлично подходит для... легальных операций.', price: 150000000, island: 'Куро', rank: 'C', rarity: 'common', properties: JSON.stringify({ area: 500, location: 'port' }) },
    
    // Предметы роскоши (category_id: 3)
    { category: 3, name: 'Членство в клубе "Диско Элизиум"', description: 'Годовой VIP-абонемент в самый престижный клуб мира. Доступ в закрытые зоны.', price: 500000000, island: 'Кага', rank: 'B', rarity: 'epic', properties: JSON.stringify({ duration: '1 year', vip: true }) },
    { category: 3, name: 'Имплант от Arasaka', description: 'Кибернетический имплант, улучшающий рефлексы и восприятие. Эксклюзивная модель.', price: 1000000000, island: 'Кага', rank: 'A', rarity: 'legendary', properties: JSON.stringify({ type: 'neural', enhancement: 'reflexes' }) },
    { category: 3, name: 'Абонемент в Онсэн "Уходящего Тумана"', description: 'Годовой доступ к легендарным горячим источникам. Углубляет связь с Существами.', price: 50000000, island: 'Хоши', rank: 'C', rarity: 'rare', properties: JSON.stringify({ duration: '1 year', benefit: 'spirit_connection' }) },
    
    // Особое снаряжение (category_id: 4)
    { category: 4, name: 'Бронекостюм Arasaka Type-7', description: 'Легкий, но прочный бронекостюм с активной камуфляжной системой.', price: 750000000, island: 'Кага', rank: 'B', rarity: 'epic', properties: JSON.stringify({ defense: 'high', camouflage: true, weight: 'light' }) },
    { category: 4, name: 'Тактический дрон-разведчик', description: 'Миниатюрный дрон для разведки с термальным зрением и глушилкой сигналов.', price: 200000000, island: 'Кага', rank: 'C', rarity: 'rare', properties: JSON.stringify({ range: '5km', thermal: true, jammer: true }) },
    
    // Эксклюзивы (category_id: 5)
    { category: 5, name: 'Приглашение на закрытый аукцион', description: 'Разовое приглашение на элитный аукцион "Ракудзати". Что там продают? Всё.', price: 1000000000, island: 'Ичи', rank: 'A', rarity: 'legendary', properties: JSON.stringify({ uses: 1, access: 'auction' }) },
    { category: 5, name: 'Персональная консультация мастера', description: 'Час времени с легендарным мастером. Выберите: кузнец, стратег или мудрец.', price: 500000000, island: null, rank: 'B', rarity: 'epic', properties: JSON.stringify({ duration: '1 hour', type: 'consultation' }) }
  ];

  console.log('Seeding initial purchase items...');
  const stmt = await db.prepare(`
    INSERT INTO PurchaseItems (category_id, name, description, base_price, island, rank_required, rarity, properties)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const item of items) {
    await stmt.run(item.category, item.name, item.description, item.price, item.island, item.rank, item.rarity, item.properties);
  }
  
  await stmt.finalize();
  console.log('Initial purchase items seeded successfully');
}

export async function seedCollectionSeries(db: any) {
  const existingSeries = await db.get('SELECT COUNT(*) as count FROM CollectionSeries');
  if (existingSeries.count > 0) {
    console.log('CollectionSeries already exist, skipping seed');
    return;
  }

  const series = [
    { name: 'Легендарные Проводники', description: 'Коллекция карточек величайших Проводников в истории', total: 12, season: 1 },
    { name: 'Острова мира', description: 'Красивые иллюстрации шести главных островов', total: 6, season: 1 },
    { name: 'Существа', description: 'Редкие и могущественные Существа из разных измерений', total: 20, season: 1 },
    { name: 'Фракции', description: 'История и символы трёх великих фракций', total: 15, season: 1 }
  ];

  console.log('Seeding collection series...');
  const seriesStmt = await db.prepare(`
    INSERT INTO CollectionSeries (name, description, total_items, season)
    VALUES (?, ?, ?, ?)
  `);
  
  for (const s of series) {
    await seriesStmt.run(s.name, s.description, s.total, s.season);
  }
  
  await seriesStmt.finalize();
  console.log('CollectionSeries seeded successfully');

  // Добавляем предметы коллекций
  await seedCollectionItems(db);
  
  // Добавляем паки
  await seedCollectionPacks(db);
}

async function seedCollectionItems(db: any) {
  const items = [
    // Легендарные Проводники (series_id: 1)
    { series: 1, name: 'Арбитр', desc: 'Глава Отражённого Света Солнца', rarity: 'legendary', drop: 0.01, lore: 'Живое воплощение идеалов фракции, ближайший к божественному свету.' },
    { series: 1, name: 'Дон Чёрной Лилии', desc: 'Глава криминальной империи', rarity: 'legendary', drop: 0.01, lore: 'Его слово - абсолютный закон в теневом мире.' },
    { series: 1, name: 'Верховный Судья', desc: 'Глава Порядка', rarity: 'legendary', drop: 0.01, lore: 'Высшая судебная инстанция для всех Проводников.' },
    { series: 1, name: 'Зодиак: Овен', desc: 'Командир первого отряда', rarity: 'epic', drop: 0.05, lore: 'Живая легенда, чья сила непререкаема.' },
    { series: 1, name: 'Паладин Света', desc: 'Почётный титул воина ОСС', rarity: 'rare', drop: 0.10, lore: 'Проявил невероятную доблесть и силу духа.' },
    { series: 1, name: 'Капо Лилии', desc: 'Глава боевой бригады', rarity: 'rare', drop: 0.10, lore: 'Контролирует территорию и криминальный бизнес.' },
    { series: 1, name: 'Высший Офицер', desc: 'Элита Порядка', rarity: 'rare', drop: 0.10, lore: 'Проводник ранга A+ на службе закона.' },
    { series: 1, name: 'Инквизитор', desc: 'Старший следователь', rarity: 'uncommon', drop: 0.15, lore: 'Расследует самые сложные дела.' },
    { series: 1, name: 'Нова', desc: 'Рядовой боец Зодиака', rarity: 'uncommon', drop: 0.15, lore: 'Член элитного военного отряда.' },
    { series: 1, name: 'Солдат', desc: 'Посвящённый член Семьи', rarity: 'common', drop: 0.20, lore: 'Принёс клятву верности Чёрной Лилии.' },
    { series: 1, name: 'Детектив', desc: 'Следователь Порядка', rarity: 'common', drop: 0.20, lore: 'Занимается рутинными расследованиями.' },
    { series: 1, name: 'Аурит', desc: 'Рядовой член ОСС', rarity: 'common', drop: 0.20, lore: 'Начинающий, но преданный последователь.' },

    // Острова мира (series_id: 2)
    { series: 2, name: 'Кага - Столица прогресса', desc: 'Глобальная столица мира', rarity: 'epic', drop: 0.08, lore: 'Воплощение технологического прогресса и порядка.' },
    { series: 2, name: 'Хоши - Духовный центр', desc: 'Остров гармонии', rarity: 'epic', drop: 0.08, lore: 'Здесь время течёт иначе, духовность важнее материального.' },
    { series: 2, name: 'Ичи - Торговая столица', desc: 'Остров капитализма', rarity: 'rare', drop: 0.12, lore: 'Здесь кредиты решают всё.' },
    { series: 2, name: 'Куро - Теневой остров', desc: 'Владение Чёрной Лилии', rarity: 'rare', drop: 0.12, lore: 'Мир ржавого металла и вечных теней.' },
    { series: 2, name: 'Мидзу - Дикие земли', desc: 'Нетронутая природа', rarity: 'uncommon', drop: 0.15, lore: 'Первозданный мир древних лесов.' },
    { series: 2, name: 'Сора - Нейтральная зона', desc: 'Дипломатическая столица', rarity: 'uncommon', drop: 0.15, lore: 'Островок здравомыслия в безумном мире.' },

    // Существа - первые 10 для примера (series_id: 3)
    { series: 3, name: 'Дракон Бездны', desc: 'Существо SSS ранга', rarity: 'mythic', drop: 0.001, lore: 'Воплощение первичного хаоса.' },
    { series: 3, name: 'Феникс Возрождения', desc: 'Существо SS ранга', rarity: 'legendary', drop: 0.01, lore: 'Рождается из пепла снова и снова.' },
    { series: 3, name: 'Левиафан', desc: 'Существо S ранга', rarity: 'epic', drop: 0.05, lore: 'Повелитель глубин океана.' },
    { series: 3, name: 'Кицунэ Девяти Хвостов', desc: 'Существо A ранга', rarity: 'rare', drop: 0.10, lore: 'Мудрый дух-оборотень.' },
    { series: 3, name: 'Грифон', desc: 'Существо B ранга', rarity: 'rare', drop: 0.12, lore: 'Благородный страж.' },
    { series: 3, name: 'Теневой Волк', desc: 'Существо C ранга', rarity: 'uncommon', drop: 0.15, lore: 'Охотник в темноте.' },
    { series: 3, name: 'Элементаль Огня', desc: 'Существо D ранга', rarity: 'uncommon', drop: 0.15, lore: 'Живое пламя.' },
    { series: 3, name: 'Лесной Дух', desc: 'Существо E ранга', rarity: 'common', drop: 0.20, lore: 'Хранитель природы.' },

    // Фракции - первые 10 (series_id: 4)
    { series: 4, name: 'Эмблема ОСС', desc: 'Символ Отражённого Света Солнца', rarity: 'epic', drop: 0.06, lore: 'Солнечный диск, излучающий свет.' },
    { series: 4, name: 'Знак Чёрной Лилии', desc: 'Символ криминальной империи', rarity: 'epic', drop: 0.06, lore: 'Чёрная лилия на алом фоне.' },
    { series: 4, name: 'Печать Порядка', desc: 'Символ закона', rarity: 'epic', drop: 0.06, lore: 'Весы правосудия.' },
    { series: 4, name: 'Великий Храм Рассвета', desc: 'Святыня ОСС', rarity: 'rare', drop: 0.10, lore: 'Расположен у Lux Aeterna.' },
    { series: 4, name: 'Цитадель Лилии', desc: 'Крепость Дона', rarity: 'rare', drop: 0.10, lore: 'Неприступная резиденция главы.' },
    { series: 4, name: 'Шпиль Порядка', desc: 'Штаб-квартира', rarity: 'rare', drop: 0.10, lore: 'Монолит высотой два километра.' }
  ];

  console.log('Seeding collection items...');
  const stmt = await db.prepare(`
    INSERT INTO CollectionItems (series_id, name, description, rarity, drop_rate, lore_text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (const item of items) {
    await stmt.run(item.series, item.name, item.desc, item.rarity, item.drop, item.lore);
  }
  
  await stmt.finalize();
  console.log('Collection items seeded successfully');
}

async function seedCollectionPacks(db: any) {
  const packs = [
    { name: 'Стандартный пак', desc: 'Базовый набор из 5 случайных карточек', price: 50000, guaranteed: 'common', items: 5, series: null },
    { name: 'Премиум пак', desc: 'Набор из 5 карточек с гарантированной редкой', price: 150000, guaranteed: 'rare', items: 5, series: null },
    { name: 'Легендарный пак', desc: 'Набор из 5 карточек с гарантированной эпической', price: 500000, guaranteed: 'epic', items: 5, series: null },
    { name: 'Пак "Проводники"', desc: 'Специализированный пак с карточками Проводников', price: 200000, guaranteed: 'uncommon', items: 5, series: 1 },
    { name: 'Пак "Острова"', desc: 'Коллекция всех островов мира', price: 300000, guaranteed: 'rare', items: 6, series: 2 },
    { name: 'Пак "Существа"', desc: 'Могущественные Существа', price: 250000, guaranteed: 'rare', items: 5, series: 3 },
    { name: 'Пак "Фракции"', desc: 'История трёх великих фракций', price: 200000, guaranteed: 'uncommon', items: 5, series: 4 }
  ];

  console.log('Seeding collection packs...');
  const stmt = await db.prepare(`
    INSERT INTO CollectionPacks (name, description, price, guaranteed_rarity, items_count, series_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  for (const pack of packs) {
    await stmt.run(pack.name, pack.desc, pack.price, pack.guaranteed, pack.items, pack.series);
  }
  
  await stmt.finalize();
  console.log('Collection packs seeded successfully');
}

export async function seedFactions(db: any) {
  const existingFactions = await db.get('SELECT COUNT(*) as count FROM Factions');
  if (existingFactions.count > 0) {
    console.log('Factions already exist, skipping seed');
    return;
  }

  const factions = [
    { name: 'Порядок', description: 'Закон и справедливость, поддерживаемые силой. Официальная власть в мире.', is_canon: 1, status: 'approved' },
    { name: 'Отражённый Свет Солнца', description: 'Религиозная организация, стремящаяся к духовному просветлению и контролю.', is_canon: 1, status: 'approved' },
    { name: 'Чёрная Лилия', description: 'Криминальная империя, управляющая теневой экономикой и нелегальной деятельностью.', is_canon: 1, status: 'approved' },
    { name: 'Нейтрал', description: 'Те, кто не примкнул ни к одной из великих фракций, преследуя свои цели.', is_canon: 1, status: 'approved' }
  ];

  console.log('Seeding factions...');
  const stmt = await db.prepare(`
    INSERT INTO Factions (name, description, is_canon, status, creator_vk_id)
    VALUES (?, ?, ?, ?, NULL)
  `);
  
  for (const faction of factions) {
    await stmt.run(faction.name, faction.description, faction.is_canon, faction.status);
  }
  
  await stmt.finalize();
  console.log('Factions seeded successfully');
}

export async function seedBestiary(db: any) {
  try {
    const count = await db.get('SELECT COUNT(*) as count FROM BestiaryTaxonomy');
    if (count.count > 0) {
      console.log('Bestiary already seeded, skipping...');
      return;
    }

    console.log('Seeding bestiary taxonomy...');

    // Царства (Kingdoms)
    const kingdomAnimalia = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description) 
      VALUES (NULL, 'kingdom', 'Животные', 'Animalia', 'Искажённая фауна - все животные мира, подвергшиеся мутации из-за Ауры')`);
    
    // Типы (Types) - по среде обитания
    const typeTerrestrial = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${kingdomAnimalia.lastID}, 'type', 'Наземные', 'Terrestria', 'Существа, обитающие на суше')`);
    
    const typeAquatic = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${kingdomAnimalia.lastID}, 'type', 'Водные', 'Aquatica', 'Существа, обитающие в водной среде')`);
    
    const typeAerial = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${kingdomAnimalia.lastID}, 'type', 'Воздушные', 'Aeria', 'Крылатые и летающие существа')`);

    // Классы (Classes) - по уровню мутации
    const classTouched = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeTerrestrial.lastID}, 'class', 'Затронутые Наземные', 'Terrestria Tactus', 'Наземные животные с незначительными мутациями')`);
    
    const classDistorted = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeTerrestrial.lastID}, 'class', 'Искажённые Наземные', 'Terrestria Distortus', 'Наземные животные со средними мутациями и способностями')`);
    
    const classBeasts = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeTerrestrial.lastID}, 'class', 'Бестии Наземные', 'Terrestria Bestia', 'Высшие наземные хищники из Эхо-Зон')`);

    // Водные классы
    const classAquaTouched = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeAquatic.lastID}, 'class', 'Затронутые Водные', 'Aquatica Tactus', 'Водные животные с незначительными мутациями')`);
    
    const classAquaDistorted = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeAquatic.lastID}, 'class', 'Искажённые Водные', 'Aquatica Distortus', 'Водные животные со средними мутациями')`);
    
    const classAquaBeasts = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeAquatic.lastID}, 'class', 'Бестии Водные', 'Aquatica Bestia', 'Высшие водные хищники из Эхо-Зон')`);

    // Воздушные классы
    const classAerialTouched = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeAerial.lastID}, 'class', 'Затронутые Воздушные', 'Aeria Tactus', 'Крылатые существа с незначительными мутациями')`);
    
    const classAerialDistorted = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeAerial.lastID}, 'class', 'Искажённые Воздушные', 'Aeria Distortus', 'Крылатые существа со средними мутациями')`);
    
    const classAerialBeasts = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${typeAerial.lastID}, 'class', 'Бестии Воздушные', 'Aeria Bestia', 'Высшие воздушные хищники')`);

    // Семейства (Families) - конкретные группы
    // Наземные Затронутые
    const familyBoar = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classTouched.lastID}, 'family', 'Каменные Кабаны', 'Sus Petraeus', 'Кабаны с укреплённой шкурой')`);
    
    const familyWolf = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classTouched.lastID}, 'family', 'Стальные Волки', 'Lupus Ferreus', 'Волки с металлизированными когтями')`);

    // Наземные Искажённые
    const familyVoltFox = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classDistorted.lastID}, 'family', 'Вольт-Лисы', 'Vulpes Electricus', 'Лисы с электрическими способностями')`);
    
    const familyMirrorCrab = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classDistorted.lastID}, 'family', 'Зеркальные Крабы', 'Cancer Reflectus', 'Крабы с отражающим панцирем')`);

    // Наземные Бестии
    const familyCrystalWolf = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classBeasts.lastID}, 'family', 'Кристальные Волки', 'Lupus Crystallis', 'Волки покрытые кристаллами')`);
    
    const familyRootStrangle = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classBeasts.lastID}, 'family', 'Корневики-Душители', 'Radix Strangulans', 'Растительные хищники')`);

    // Водные
    const familyDeepPike = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classAquaTouched.lastID}, 'family', 'Глубоководные Щуки', 'Esox Profundus', 'Щуки с металлическими зубами')`);
    
    const familyMistEel = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classAquaBeasts.lastID}, 'family', 'Туманные Угри', 'Anguilla Nebula', 'Гигантские угри, источающие токсичный туман')`);

    // Воздушные
    const familyRazorFalcon = await db.run(`INSERT INTO BestiaryTaxonomy (parent_id, level, name, name_latin, description)
      VALUES (${classAerialTouched.lastID}, 'family', 'Бритвенные Соколы', 'Falco Novacula', 'Соколы с острыми как бритва перьями')`);

    console.log('Seeding bestiary species...');

    // Виды - Каменные Кабаны
    await db.run(`INSERT INTO BestiarySpecies (family_id, name, name_latin, mutation_class, danger_rank, habitat_type, description, appearance, behavior, abilities, size_category, weight_min, weight_max, tags, is_hostile, is_active)
      VALUES (
        ${familyBoar.lastID},
        'Каменный Кабан',
        'Sus Petraeus Vulgaris',
        'Затронутые',
        'D',
        'Наземные',
        'Кабан, чья щетина и кожа приобрели прочность твёрдой древесины. Обитает в лесных зонах всех островов.',
        'Массивный кабан с серо-коричневой шкурой, покрытой твёрдыми шипами вместо обычной щетины. Клыки имеют каменный оттенок.',
        'Территориальное животное. Агрессивно при угрозе. Передвигается небольшими группами до 5 особей.',
        'Усиленная защита, таран',
        'Средние',
        150,
        250,
        '[{"tag": "Защитный", "rank": "D"}]',
        1,
        1
      )`);

    await db.run(`INSERT INTO BestiarySpecies (family_id, name, name_latin, mutation_class, danger_rank, habitat_type, description, appearance, behavior, abilities, size_category, weight_min, weight_max, tags, is_hostile, is_active)
      VALUES (
        ${familyBoar.lastID},
        'Горный Каменный Кабан',
        'Sus Petraeus Montanus',
        'Затронутые',
        'C',
        'Наземные',
        'Подвид каменного кабана, адаптированный к горной местности. Более агрессивен и крупнее.',
        'Крупнее обычного каменного кабана, с более тёмной, почти чёрной шкурой. Клыки длиннее и острее.',
        'Одиночка или пары. Крайне территориален. Способен сбросить противника со скалы.',
        'Усиленный таран, прыжок на 3-4 метра',
        'Крупные',
        250,
        400,
        '[{"tag": "Защитный", "rank": "C"}, {"tag": "Пробивающий", "rank": "D"}]',
        1,
        1
      )`);

    // Виды - Вольт-Лисы
    await db.run(`INSERT INTO BestiarySpecies (family_id, name, name_latin, mutation_class, danger_rank, habitat_type, description, appearance, behavior, abilities, size_category, weight_min, weight_max, tags, is_hostile, is_active)
      VALUES (
        ${familyVoltFox.lastID},
        'Вольт-Лиса',
        'Vulpes Electricus',
        'Искажённые',
        'C',
        'Наземные',
        'Лиса, чей мех накапливает статическое электричество, позволяя выпускать разряды для оглушения добычи.',
        'Изящная лиса с серебристо-синим мехом, который слегка искрится. Глаза светятся голубым.',
        'Хитрый охотник. Использует засады. Избегает прямого боя, предпочитая оглушать цель.',
        'Электрический разряд (оглушение), ускорение',
        'Мелкие',
        8,
        15,
        '[{"tag": "Контроль", "rank": "C"}, {"tag": "Неотвратимый", "rank": "D"}]',
        1,
        1
      )`);

    // Виды - Кристальные Волки (Бестия)
    await db.run(`INSERT INTO BestiarySpecies (family_id, name, name_latin, mutation_class, danger_rank, habitat_type, description, appearance, behavior, abilities, size_category, weight_min, weight_max, tags, is_hostile, is_active)
      VALUES (
        ${familyCrystalWolf.lastID},
        'Кристальный Волк',
        'Lupus Crystallis',
        'Бестии',
        'B',
        'Наземные',
        'Хищник размером с медведя, чья шкура покрыта острыми кристаллическими наростами. Способен на короткое время становиться невидимым.',
        'Огромный волк с прозрачно-белой шкурой, усеянной острыми кристаллами. Глаза светятся ледяным светом.',
        'Верховный хищник. Охотится стаями до 3 особей. Использует невидимость для засад.',
        'Камуфляж (невидимость), кристальные клыки, ледяное дыхание',
        'Крупные',
        300,
        500,
        '[{"tag": "Пробивающий", "rank": "B"}, {"tag": "Контроль", "rank": "C"}, {"tag": "Неотвратимый", "rank": "C"}]',
        1,
        1
      )`);

    // Водные виды
    await db.run(`INSERT INTO BestiarySpecies (family_id, name, name_latin, mutation_class, danger_rank, habitat_type, description, appearance, behavior, abilities, size_category, weight_min, weight_max, tags, is_hostile, is_active)
      VALUES (
        ${familyDeepPike.lastID},
        'Глубоководная Щука',
        'Esox Profundus',
        'Затронутые',
        'D',
        'Водные',
        'Щука, чьи зубы способны прокусить тонкий листовой металл. Обитает в глубоких водах.',
        'Крупная щука с металлическим отливом чешуи. Зубы блестят как сталь.',
        'Агрессивный хищник. Атакует из засады. Способна перекусить стальной трос.',
        'Металлические зубы, быстрый рывок',
        'Средние',
        20,
        40,
        '[{"tag": "Пробивающий", "rank": "D"}, {"tag": "Неотвратимый", "rank": "D"}]',
        1,
        1
      )`);

    await db.run(`INSERT INTO BestiarySpecies (family_id, name, name_latin, mutation_class, danger_rank, habitat_type, description, appearance, behavior, abilities, size_category, weight_min, weight_max, tags, is_hostile, is_active)
      VALUES (
        ${familyMistEel.lastID},
        'Туманный Угорь',
        'Anguilla Nebula',
        'Бестии',
        'A',
        'Водные',
        'Гигантский змей, обитающий в болотах и реках Эхо-Зон. Его тело источает густой едкий туман.',
        'Змееподобное существо длиной до 15 метров. Чёрная чешуя постоянно источает серый туман.',
        'Территориальный хищник. Использует туман для дезориентации жертвы перед атакой.',
        'Токсичный туман, сжимающие кольца, регенерация',
        'Гигантские',
        800,
        1500,
        '[{"tag": "Контроль", "rank": "A"}, {"tag": "Пробивающий", "rank": "B"}, {"tag": "Область", "rank": "C"}]',
        1,
        1
      )`);

    // Воздушные виды
    await db.run(`INSERT INTO BestiarySpecies (family_id, name, name_latin, mutation_class, danger_rank, habitat_type, description, appearance, behavior, abilities, size_category, weight_min, weight_max, tags, is_hostile, is_active)
      VALUES (
        ${familyRazorFalcon.lastID},
        'Бритвенный Сокол',
        'Falco Novacula',
        'Затронутые',
        'E',
        'Воздушные',
        'Сокол, чьи маховые перья на крыльях остры как лезвия. Способен рассекать цели в полёте.',
        'Элегантный сокол с серебристым оперением. Перья крыльев блестят как отполированные клинки.',
        'Быстрый охотник. Атакует на высокой скорости, рассекая жертву крыльями.',
        'Режущие перья, пикирование',
        'Мелкие',
        3,
        6,
        '[{"tag": "Пробивающий", "rank": "E"}, {"tag": "Неотвратимый", "rank": "E"}]',
        1,
        1
      )`);

    console.log('Seeding bestiary locations...');

    // Получаем ID видов для привязки локаций
    const stoneBoar = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Каменный Кабан'`);
    const mountainBoar = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Горный Каменный Кабан'`);
    const voltFox = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Вольт-Лиса'`);
    const crystalWolf = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Кристальный Волк'`);
    const deepPike = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Глубоководная Щука'`);
    const mistEel = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Туманный Угорь'`);
    const razorFalcon = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Бритвенный Сокол'`);

    // Локации для Каменного Кабана (повсеместный)
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${stoneBoar.id}, 'Хоши', 'Заповедник Муши', 'Лес', 0, 'Обычный', 'Высокая')`);
    
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${stoneBoar.id}, 'Мидзу', 'Сердце Леса', 'Древний лес', 0, 'Обычный', 'Средняя')`);

    // Горный Кабан
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${mountainBoar.id}, 'Хоши', 'Обитель Тихого Ветра', 'Горы', 0, 'Необычный', 'Малая')`);
    
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${mountainBoar.id}, 'Мидзу', 'Горы Каменного Кулака', 'Горы', 0, 'Редкий', 'Малая')`);

    // Вольт-Лиса (Искажённые - нужна Резидуальная Аура)
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${voltFox.id}, 'Куро', 'Ржавый Пояс', 'Промзона', 0, 'Необычный', 'Средняя')`);
    
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${voltFox.id}, 'Кага', 'Фронтир', 'Промзона', 0, 'Редкий', 'Малая')`);

    // Кристальный Волк (Бестия - только Эхо-Зоны)
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${crystalWolf.id}, 'Куро', 'Тёмный Континент', 'Аномальная зона', 1, 'Очень редкий', 'Единичные')`);
    
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${crystalWolf.id}, 'Хоши', 'Долина Хэйан', 'Аномальная зона', 1, 'Легендарный', 'Единичные')`);

    // Глубоководная Щука
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${deepPike.id}, 'Ичи', 'Порт-де-Люн', 'Морские воды', 0, 'Обычный', 'Средняя')`);

    // Туманный Угорь (Бестия)
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${mistEel.id}, 'Мидзу', 'Болота у Сердца Леса', 'Болото', 1, 'Легендарный', 'Единичные')`);

    // Бритвенный Сокол
    await db.run(`INSERT INTO BestiaryLocations (species_id, island, region, biome, is_echo_zone, rarity, population_density)
      VALUES (${razorFalcon.id}, 'Хоши', 'Горные пики', 'Горы', 0, 'Обычный', 'Средняя')`);

    console.log('Seeding bestiary characteristics...');

    // Характеристики для видов
    await db.run(`INSERT INTO BestiaryCharacteristics (species_id, strength_tag, speed_tag, defense_tag, special_tag, drop_items, credit_value_min, credit_value_max)
      VALUES (
        ${stoneBoar.id},
        'D',
        'E',
        'D',
        NULL,
        '["Каменная шкура", "Твёрдая щетина", "Мясо кабана"]',
        50000,
        150000
      )`);

    await db.run(`INSERT INTO BestiaryCharacteristics (species_id, strength_tag, speed_tag, defense_tag, special_tag, drop_items, credit_value_min, credit_value_max)
      VALUES (
        ${mountainBoar.id},
        'C',
        'D',
        'C',
        NULL,
        '["Горная шкура", "Каменные клыки", "Редкое мясо"]',
        200000,
        500000
      )`);

    await db.run(`INSERT INTO BestiaryCharacteristics (species_id, strength_tag, speed_tag, defense_tag, special_tag, aura_signature, drop_items, credit_value_min, credit_value_max)
      VALUES (
        ${voltFox.id},
        'D',
        'C',
        'E',
        'Электричество',
        'Статический заряд',
        '["Электромех", "Заряженный хвост", "Искажённое мясо"]',
        500000,
        1500000
      )`);

    await db.run(`INSERT INTO BestiaryCharacteristics (species_id, strength_tag, speed_tag, defense_tag, special_tag, aura_signature, drop_items, credit_value_min, credit_value_max)
      VALUES (
        ${crystalWolf.id},
        'B',
        'B',
        'B',
        'Камуфляж, Лёд',
        'Кристаллическая Аура',
        '["Кристалл невидимости", "Ледяное сердце", "Шкура Бестии"]',
        50000000,
        150000000
      )`);

    await db.run(`INSERT INTO BestiaryCharacteristics (species_id, strength_tag, speed_tag, defense_tag, special_tag, drop_items, credit_value_min, credit_value_max)
      VALUES (
        ${deepPike.id},
        'D',
        'D',
        'E',
        NULL,
        '["Металлические зубы", "Рыбье мясо", "Прочная чешуя"]',
        100000,
        300000
      )`);

    await db.run(`INSERT INTO BestiaryCharacteristics (species_id, strength_tag, speed_tag, defense_tag, special_tag, aura_signature, drop_items, credit_value_min, credit_value_max)
      VALUES (
        ${mistEel.id},
        'A',
        'B',
        'A',
        'Туман, Регенерация',
        'Токсичная Аура',
        '["Туманное сердце", "Ядовитая чешуя", "Эссенция регенерации"]',
        200000000,
        500000000
      )`);

    await db.run(`INSERT INTO BestiaryCharacteristics (species_id, strength_tag, speed_tag, defense_tag, special_tag, drop_items, credit_value_min, credit_value_max)
      VALUES (
        ${razorFalcon.id},
        'E',
        'D',
        'F',
        NULL,
        '["Режущие перья", "Лёгкие кости", "Мясо птицы"]',
        30000,
        80000
      )`);

    console.log('Bestiary seeded successfully!');
  } catch (error) {
    console.error('Error seeding bestiary:', error);
    throw error;
  }
}

export async function seedFishingData(db: any) {
  try {
    const gearCount = await db.get('SELECT COUNT(*) as count FROM FishingGear');
    if (gearCount.count > 0) {
      console.log('Fishing gear already seeded, skipping...');
      return;
    }

    console.log('Seeding fishing locations...');

    // Локации рыбалки по островам из лора
    const kagaRiver = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Река в Неон-Сити', 'Кага', 'Неон-Сити', 'Река', 'F', 'Урбанистическая река, текущая через город. Слабо загрязнена, но рыба адаптировалась.')`);

    const kagaSea = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Порт Титан', 'Кага', 'Фронтир', 'Море', 'E', 'Прибрежные воды промышленного порта. Обитает затронутая морская фауна.')`);

    const hoshiLake = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Священное озеро Амара', 'Хоши', 'Амара', 'Озеро', 'D', 'Чистейшее озеро у подножия Великого Солнечного Древа. Рыба здесь благословлена Аурой.')`);

    const hoshiEcho = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Пруды Долины Хэйан', 'Хоши', 'Долина Хэйан', 'Эхо-Зона', 'B', 'Аномальная зона с искажённой водной фауной. Опасно, но прибыльно.')`);

    const ichiPort = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Порт-де-Люн', 'Ичи', 'Порт-де-Люн', 'Море', 'E', 'Оживлённый торговый порт. Разнообразная рыба со всего мира.')`);

    const kuroSwamp = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Ржавые болота', 'Куро', 'Ржавый Пояс', 'Болото', 'C', 'Токсичные болота промзоны. Искажённая рыба с мутациями.')`);

    const kuroEcho = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Чёрные воды Континента', 'Куро', 'Тёмный Континент', 'Эхо-Зона', 'A', 'Смертельно опасная Эхо-Зона. Бестии водных глубин.')`);

    const midzuRiver = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Кристальная река Мидзу', 'Мидзу', 'Сердце Леса', 'Река', 'D', 'Первозданная река древнего леса. Редкие виды.')`);

    const soraLake = await db.run(`INSERT INTO FishingLocations (name, island, region, water_type, min_rank, description)
      VALUES ('Озеро Равновесия', 'Сора', 'Район Равновесия', 'Озеро', 'F', 'Спокойное городское озеро. Идеально для новичков.')`);

    console.log('Seeding fish species...');

    // Обычная рыба (Затронутая)
    const carpF = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Обычный Карп', 'Cyprinus Carpio', 'Обычная', 'Средняя', 1, 3, 'Базовый карп с незначительными мутациями', 'Серебристая чешуя с лёгким металлическим отливом', 'Затронутая', 5000)`);

    const pikeE = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Металлическая Щука', 'Esox Metallicus', 'Необычная', 'Крупная', 3, 8, 'Щука с укреплённой чешуёй', 'Тёмная чешуя с металлическим блеском, острые зубы', 'Затронутая', 15000)`);

    // Искажённая рыба
    const voltEel = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Вольт-Угорь', 'Anguilla Electricus', 'Редкая', 'Крупная', 5, 12, 'Угорь, накапливающий электричество', 'Тело искрится голубыми разрядами', 'Искажённая', 50000)`);

    const crystalFish = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Кристальная Рыба', 'Pisces Crystallis', 'Очень редкая', 'Средняя', 2, 5, 'Рыба с прозрачным кристаллическим телом', 'Полупрозрачное тело, похожее на живой кристалл', 'Искажённая', 150000)`);

    // Легендарная рыба (Бестии)
    const dragonKoi = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Драконий Кои', 'Cyprinus Draco', 'Легендарная', 'Трофейная', 15, 30, 'Легендарная рыба из Эхо-Зон. Говорят, она приносит удачу', 'Огромный карп с чешуёй всех цветов радуги и драконьими усами', 'Бестия', 500000)`);

    const voidLeviathan = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Пустотный Левиафан', 'Leviathan Nihilus', 'Легендарная', 'Трофейная', 50, 100, 'Чудовищная рыба из глубин Эхо-Зон', 'Массивное существо с чёрной чешуёй, поглощающей свет', 'Бестия', 2000000)`);

    console.log('Linking fish to locations...');

    // Привязываем рыбу к локациям
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${carpF.lastID}, ${kagaRiver.lastID}, 0.7)`);
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${carpF.lastID}, ${soraLake.lastID}, 0.8)`);
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${pikeE.lastID}, ${hoshiLake.lastID}, 0.4)`);
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${pikeE.lastID}, ${midzuRiver.lastID}, 0.5)`);
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${voltEel.lastID}, ${kuroSwamp.lastID}, 0.3)`);
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${crystalFish.lastID}, ${hoshiEcho.lastID}, 0.15)`);
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${dragonKoi.lastID}, ${hoshiEcho.lastID}, 0.05)`);
    await db.run(`INSERT INTO FishLocationSpawns (fish_id, location_id, spawn_chance) VALUES (${voidLeviathan.lastID}, ${kuroEcho.lastID}, 0.02)`);

    console.log('Seeding fishing gear...');

    // Базовое снаряжение (бесплатное для всех)
    const basicRod = await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic)
      VALUES ('Палка с леской', 'Удочка', 'Базовое', 0, 0, 0, 'Примитивная удочка из палки и лески', 'F', 1)`);

    const basicBait = await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic)
      VALUES ('Кусок хлеба', 'Наживка', 'Базовое', 0, 0, 0, 'Обычный хлеб для приманки', 'F', 1)`);

    // Покупаемое снаряжение (цены согласно лору)
    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic)
      VALUES ('Бамбуковая удочка', 'Удочка', 'Обычное', 50000, 0.05, 0, 'Простая удочка для новичков', 'F', 0)`);

    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic)
      VALUES ('Карбоновое удилище', 'Удочка', 'Хорошее', 250000, 0.1, 0.05, 'Лёгкая и прочная удочка', 'E', 0)`);

    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic)
      VALUES ('Удочка Мастера', 'Удочка', 'Отличное', 1000000, 0.15, 0.1, 'Профессиональная удочка с усиленной леской', 'D', 0)`);

    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic)
      VALUES ('Аурическая удочка', 'Удочка', 'Эпическое', 5000000, 0.25, 0.2, 'Удочка, пропитанная Аурой. Привлекает редкую рыбу', 'C', 0)`);

    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic)
      VALUES ('Посох Повелителя Вод', 'Удочка', 'Легендарное', 50000000, 0.4, 0.35, 'Легендарная удочка из Эхо-Зон', 'A', 0)`);

    // Наживки (расходуемые)
    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic, is_consumable)
      VALUES ('Червяк', 'Наживка', 'Обычное', 5000, 0.02, 0, 'Обычная наживка', 'F', 0, 1)`);

    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic, is_consumable)
      VALUES ('Светящаяся приманка', 'Наживка', 'Хорошее', 25000, 0.05, 0.03, 'Привлекает хищников', 'E', 0, 1)`);

    await db.run(`INSERT INTO FishingGear (name, type, quality, price, bonus_chance, bonus_rarity, description, min_rank, is_basic, is_consumable)
      VALUES ('Ауральная эссенция', 'Наживка', 'Эпическое', 500000, 0.1, 0.15, 'Приманка из концентрированной Ауры', 'C', 0, 1)`);

    // Добавляем водных существ из бестиария
    console.log('Adding aquatic creatures from bestiary...');
    
    // Водные Затронутые
    const aquaticTouched1 = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Ауральный Лосось', 'Salmo Aura', 'Необычная', 'Крупная', 4, 10, 'Лосось, впитавший Ауру из священных вод', 'Розовое мясо с золотистыми прожилками', 'Затронутая', 25000)`);
    
    const aquaticTouched2 = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Металлический Окунь', 'Perca Metallica', 'Обычная', 'Средняя', 1.5, 4, 'Окунь с укреплённой чешуёй', 'Серебристая чешуя с металлическим отливом', 'Затронутая', 8000)`);

    // Водные Искажённые
    const aquaticDistorted1 = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Фантомная Медуза', 'Medusa Phantasma', 'Редкая', 'Средняя', 2, 6, 'Прозрачная медуза, способная становиться невидимой', 'Полупрозрачное тело, мерцающее в воде', 'Искажённая', 75000)`);
    
    const aquaticDistorted2 = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Кристальный Краб', 'Cancer Crystallis', 'Очень редкая', 'Крупная', 3, 8, 'Краб с панцирем из живого кристалла', 'Прозрачный панцирь, переливающийся всеми цветами', 'Искажённая', 200000)`);

    // Водные Бестии
    const aquaticBeast1 = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Морской Дракон', 'Draco Marinus', 'Легендарная', 'Трофейная', 20, 50, 'Древний морской дракон из глубин Эхо-Зон', 'Массивное существо с чешуёй цвета морской пены и драконьими плавниками', 'Бестия', 1000000)`);
    
    const aquaticBeast2 = await db.run(`INSERT INTO FishSpecies (name, name_latin, rarity, size_category, weight_min, weight_max, description, appearance, mutation_type, base_price)
      VALUES ('Ауральный Кит', 'Cetus Aura', 'Легендарная', 'Трофейная', 100, 200, 'Гигантский кит, пропитанный чистой Аурой', 'Огромное существо, светящееся изнутри мягким золотым светом', 'Бестия', 5000000)`);

    // Привязываем водных существ к локациям
    const aquaticTouched1Id = aquaticTouched1.lastInsertRowid || aquaticTouched1.lastID;
    const aquaticTouched2Id = aquaticTouched2.lastInsertRowid || aquaticTouched2.lastID;
    const aquaticDistorted1Id = aquaticDistorted1.lastInsertRowid || aquaticDistorted1.lastID;
    const aquaticDistorted2Id = aquaticDistorted2.lastInsertRowid || aquaticDistorted2.lastID;
    const aquaticBeast1Id = aquaticBeast1.lastInsertRowid || aquaticBeast1.lastID;
    const aquaticBeast2Id = aquaticBeast2.lastInsertRowid || aquaticBeast2.lastID;
    
    const kagaRiverId = kagaRiver.lastInsertRowid || kagaRiver.lastID;
    const hoshiLakeId = hoshiLake.lastInsertRowid || hoshiLake.lastID;
    const soraLakeId = soraLake.lastInsertRowid || soraLake.lastID;
    const hoshiEchoId = hoshiEcho.lastInsertRowid || hoshiEcho.lastID;
    
    const aquaticFishIds = [aquaticTouched1Id, aquaticTouched2Id, aquaticDistorted1Id, aquaticDistorted2Id, aquaticBeast1Id, aquaticBeast2Id];
    
    for (const fishId of aquaticFishIds) {
      // Обычные локации для затронутых
      if (fishId <= aquaticTouched2Id) {
        await db.run(`INSERT INTO FishLocationSpawns (location_id, fish_id, spawn_chance) VALUES (?, ?, ?)`, kagaRiverId, fishId, 0.3);
        await db.run(`INSERT INTO FishLocationSpawns (location_id, fish_id, spawn_chance) VALUES (?, ?, ?)`, hoshiLakeId, fishId, 0.4);
        await db.run(`INSERT INTO FishLocationSpawns (location_id, fish_id, spawn_chance) VALUES (?, ?, ?)`, soraLakeId, fishId, 0.2);
      }
      // Редкие локации для искажённых
      else if (fishId <= aquaticDistorted2Id) {
        await db.run(`INSERT INTO FishLocationSpawns (location_id, fish_id, spawn_chance) VALUES (?, ?, ?)`, hoshiEchoId, fishId, 0.2);
        await db.run(`INSERT INTO FishLocationSpawns (location_id, fish_id, spawn_chance) VALUES (?, ?, ?)`, soraLakeId, fishId, 0.1);
      }
      // Легендарные локации для бестий
      else {
        await db.run(`INSERT INTO FishLocationSpawns (location_id, fish_id, spawn_chance) VALUES (?, ?, ?)`, hoshiEchoId, fishId, 0.05);
        await db.run(`INSERT INTO FishLocationSpawns (location_id, fish_id, spawn_chance) VALUES (?, ?, ?)`, soraLakeId, fishId, 0.03);
      }
    }

    console.log('Fishing data seeded successfully!');
  } catch (error) {
    console.error('Error seeding fishing data:', error);
    throw error;
  }
}

export async function seedHuntingCreatures(db: any) {
  try {
    console.log('Force seeding hunting creatures and spawns...');
    
    // Создаем таблицу для существ охоты, как у рыбалки
    await db.run(`
      CREATE TABLE IF NOT EXISTS HuntingSpecies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        habitat_type TEXT NOT NULL CHECK (habitat_type IN ('Воздушный', 'Наземный')),
        danger_rank TEXT NOT NULL CHECK (danger_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S')),
        drop_items TEXT,
        credit_value_min INTEGER DEFAULT 0,
        credit_value_max INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1
      )
    `);
    
    // Проверяем, есть ли уже существа
    const existingCount = await db.get(`SELECT COUNT(*) as count FROM HuntingSpecies`);
    if (existingCount.count > 0) {
      console.log('Hunting species already exist, using existing data...');
    } else {
      console.log('Creating basic hunting creatures...');
      
      // Создаем базовых существ для охоты
      const basicCreatures = [
        // Воздушные существа
        { name: 'Ауральный Сокол', habitat: 'Воздушный', rank: 'F', description: 'Мелкая птица, затронутая Аурой' },
        { name: 'Металлический Ворон', habitat: 'Воздушный', rank: 'E', description: 'Ворон с металлическими перьями' },
        { name: 'Фантомный Орёл', habitat: 'Воздушный', rank: 'D', description: 'Полупрозрачный орёл-призрак' },
        { name: 'Кристальная Ласточка', habitat: 'Воздушный', rank: 'C', description: 'Ласточка из чистого кристалла' },
        { name: 'Громовой Дракон', habitat: 'Воздушный', rank: 'B', description: 'Дракон, управляющий молниями' },
        { name: 'Ауральный Феникс', habitat: 'Воздушный', rank: 'A', description: 'Легендарная птица из чистой Ауры' },
        
        // Наземные существа
        { name: 'Ауральный Волк', habitat: 'Наземный', rank: 'F', description: 'Волк, затронутый Аурой' },
        { name: 'Металлический Медведь', habitat: 'Наземный', rank: 'E', description: 'Медведь с металлической шерстью' },
        { name: 'Фантомный Тигр', habitat: 'Наземный', rank: 'D', description: 'Полупрозрачный тигр-призрак' },
        { name: 'Кристальный Лев', habitat: 'Наземный', rank: 'C', description: 'Лев из чистого кристалла' },
        { name: 'Земной Дракон', habitat: 'Наземный', rank: 'B', description: 'Дракон, управляющий землёй' },
        { name: 'Ауральный Единорог', habitat: 'Наземный', rank: 'A', description: 'Легендарный единорог из чистой Ауры' }
      ];
      
      for (const creature of basicCreatures) {
        await db.run(`
          INSERT INTO HuntingSpecies (name, description, habitat_type, danger_rank, 
                                     drop_items, credit_value_min, credit_value_max, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, 
          creature.name,
          creature.description,
          creature.habitat,
          creature.rank,
          JSON.stringify(['Мясо', 'Шкура', 'Кость']),
          creature.rank === 'F' ? 10 : creature.rank === 'E' ? 25 : creature.rank === 'D' ? 50 : creature.rank === 'C' ? 100 : creature.rank === 'B' ? 250 : 500,
          creature.rank === 'F' ? 20 : creature.rank === 'E' ? 50 : creature.rank === 'D' ? 100 : creature.rank === 'C' ? 200 : creature.rank === 'B' ? 500 : 1000,
          1
        );
      }
      
      console.log(`Created ${basicCreatures.length} hunting creatures`);
    }
    
    // Получаем ID существ из HuntingSpecies
    const aerialCreatures = await db.all(`
      SELECT id FROM HuntingSpecies 
      WHERE habitat_type = 'Воздушный' AND is_active = 1
      ORDER BY id
    `);
    
    const terrestrialCreatures = await db.all(`
      SELECT id FROM HuntingSpecies 
      WHERE habitat_type = 'Наземный' AND is_active = 1
      ORDER BY id
    `);
    
    console.log('Aerial creatures found:', aerialCreatures.length);
    console.log('Terrestrial creatures found:', terrestrialCreatures.length);
    
    // Получаем ID локаций охоты
    const locations = await db.all(`
      SELECT id, name FROM HuntingLocations 
      WHERE is_active = 1 
      ORDER BY id
    `);
    
    console.log('Hunting locations found:', locations.length);
    
    // Очищаем существующие связи
    await db.run(`DELETE FROM HuntingLocationSpawns`);
    console.log('Cleared existing HuntingLocationSpawns');
    
    // Привязываем воздушных существ к локациям
    for (const creature of aerialCreatures) {
      for (const location of locations) {
        let spawnChance = 0.1; // Базовая вероятность
        
        // Увеличиваем вероятность для лесных локаций
        if (location.name.includes('Лес')) {
          spawnChance = 0.3;
        }
        // Уменьшаем для эхо-зон
        else if (location.name.includes('Эхо')) {
          spawnChance = 0.05;
        }
        
        await db.run(`
          INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) 
          VALUES (?, ?, ?)
        `, location.id, creature.id, spawnChance);
      }
    }
    
    // Привязываем земных существ к локациям
    for (const creature of terrestrialCreatures) {
      for (const location of locations) {
        let spawnChance = 0.15; // Базовая вероятность
        
        // Увеличиваем вероятность для лесных локаций
        if (location.name.includes('Лес')) {
          spawnChance = 0.4;
        }
        // Уменьшаем для эхо-зон
        else if (location.name.includes('Эхо')) {
          spawnChance = 0.08;
        }
        
        await db.run(`
          INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) 
          VALUES (?, ?, ?)
        `, location.id, creature.id, spawnChance);
      }
    }
    
    const finalCount = await db.get(`SELECT COUNT(*) as count FROM HuntingLocationSpawns`);
    console.log(`Created ${finalCount.count} hunting spawns`);
    
  } catch (error) {
    console.error('Error force seeding hunting creatures:', error);
  }
}

export async function seedHuntingData(db: any) {
  try {
    const gearCount = await db.get('SELECT COUNT(*) as count FROM HuntingGear');
    if (gearCount.count > 0) {
      console.log('Hunting gear already seeded, skipping...');
      return;
    }

    console.log('Seeding hunting locations...');

    // Охотничьи локации по островам
    const kagaForest = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Городской парк Эвербрайт', 'Кага', 'Эвербрайт', 'Равнина', 'F', 'Безопасный парк для тренировки. Мелкая дичь.')`);

    const hoshiForest = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Заповедник Муши', 'Хоши', 'Заповедник Муши', 'Лес', 'D', 'Священный лес под защитой ОСС. Разнообразная фауна.')`);

    const hoshiMountain = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Пики Тихого Ветра', 'Хоши', 'Обитель Тихого Ветра', 'Горы', 'C', 'Высокогорье с опасными хищниками.')`);

    const hoshiEcho = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Долина Хэйан', 'Хоши', 'Долина Хэйан', 'Эхо-Зона', 'B', 'Аномальная зона с Бестиями. Крайне опасно.')`);

    const kuroWasteland = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Ржавые пустоши', 'Куро', 'Ржавый Пояс', 'Равнина', 'C', 'Промышленные пустоши с искажённой фауной.')`);

    const kuroEcho = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Тёмный Континент', 'Куро', 'Тёмный Континент', 'Эхо-Зона', 'A', 'Самая опасная зона охоты. Только для элиты.')`);

    const midzuForest = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Сердце Леса', 'Мидзу', 'Сердце Леса', 'Лес', 'D', 'Древний первозданный лес. Богат дичью.')`);

    const midzuMountain = await db.run(`INSERT INTO HuntingLocations (name, island, region, terrain_type, min_rank, description)
      VALUES ('Горы Каменного Кулака', 'Мидзу', 'Горы Каменного Кулака', 'Горы', 'C', 'Суровые горы с мощными зверями.')`);

    console.log('Linking creatures to hunting locations...');

    // Получаем ID существ из бестиария
    const stoneBoar = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Каменный Кабан'`);
    const mountainBoar = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Горный Каменный Кабан'`);
    const voltFox = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Вольт-Лиса'`);
    const crystalWolf = await db.get(`SELECT id FROM BestiarySpecies WHERE name = 'Кристальный Волк'`);

    // Привязываем существ к локациям
    if (stoneBoar) {
      await db.run(`INSERT INTO HuntingLocationSpawns (species_id, location_id, spawn_chance) VALUES (?, ?, ?)`, stoneBoar.id, hoshiForest.lastInsertRowid || hoshiForest.lastID, 0.6);
      await db.run(`INSERT INTO HuntingLocationSpawns (species_id, location_id, spawn_chance) VALUES (?, ?, ?)`, stoneBoar.id, midzuForest.lastInsertRowid || midzuForest.lastID, 0.5);
    }

    if (mountainBoar) {
      await db.run(`INSERT INTO HuntingLocationSpawns (species_id, location_id, spawn_chance) VALUES (?, ?, ?)`, mountainBoar.id, hoshiMountain.lastInsertRowid || hoshiMountain.lastID, 0.4);
      await db.run(`INSERT INTO HuntingLocationSpawns (species_id, location_id, spawn_chance) VALUES (?, ?, ?)`, mountainBoar.id, midzuMountain.lastInsertRowid || midzuMountain.lastID, 0.3);
    }

    if (voltFox) {
      await db.run(`INSERT INTO HuntingLocationSpawns (species_id, location_id, spawn_chance) VALUES (?, ?, ?)`, voltFox.id, kuroWasteland.lastInsertRowid || kuroWasteland.lastID, 0.35);
    }

    if (crystalWolf) {
      await db.run(`INSERT INTO HuntingLocationSpawns (species_id, location_id, spawn_chance) VALUES (?, ?, ?)`, crystalWolf.id, hoshiEcho.lastInsertRowid || hoshiEcho.lastID, 0.1);
      await db.run(`INSERT INTO HuntingLocationSpawns (species_id, location_id, spawn_chance) VALUES (?, ?, ?)`, crystalWolf.id, kuroEcho.lastInsertRowid || kuroEcho.lastID, 0.15);
    }

    console.log('Seeding hunting gear...');

    // Базовое снаряжение (бесплатное для всех)
    const basicWeapon = await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Деревянная дубина', 'Оружие', 'Базовое', 0, 0, 0, 0, 'Примитивное оружие из дерева', 'F', 1)`);

    const basicArmor = await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Тряпки', 'Броня', 'Базовое', 0, 0, 0, 0, 'Обычная одежда без защиты', 'F', 1)`);

    // Базовые ловушки
    const basicGroundTrap = await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Простая яма', 'Наземная ловушка', 'Базовое', 0, 0, 0, 0.05, 'Примитивная яма для наземных существ', 'F', 1, 1)`);

    const basicAerialTrap = await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Простая сеть', 'Воздушная ловушка', 'Базовое', 0, 0, 0, 0.05, 'Примитивная сеть для воздушных существ', 'F', 1, 1)`);

    // Покупаемое оружие (цены согласно лору)
    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Охотничий нож', 'Оружие', 'Обычное', 250000, 0.1, 0, 0.05, 'Базовый нож охотника', 'F', 0)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Арбалет', 'Оружие', 'Хорошее', 1000000, 0.2, 0, 0.1, 'Дальнобойное оружие', 'E', 0)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Винтовка Охотника', 'Оружие', 'Отличное', 5000000, 0.3, 0, 0.15, 'Современная винтовка для крупной дичи', 'D', 0)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Ауральный клинок', 'Оружие', 'Эпическое', 25000000, 0.45, 0, 0.25, 'Меч, пропитанный Аурой', 'C', 0)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Убийца Бестий', 'Оружие', 'Легендарное', 100000000, 0.6, 0, 0.4, 'Легендарное оружие для охоты на Бестий', 'A', 0)`);

    // Покупаемая броня
    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Кожаная куртка', 'Броня', 'Обычное', 1000000, 0, 0.1, 0, 'Базовая защита', 'F', 0)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Укреплённый доспех', 'Броня', 'Хорошее', 5000000, 0, 0.2, 0.05, 'Прочная броня охотника', 'E', 0)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic)
      VALUES ('Ауральный щит', 'Броня', 'Эпическое', 50000000, 0, 0.4, 0.1, 'Щит из концентрированной Ауры', 'C', 0)`);

    // Наземные ловушки (расходуемые)
    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Капкан', 'Наземная ловушка', 'Обычное', 50000, 0, 0, 0.1, 'Простая ловушка для наземных существ', 'F', 0, 1)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Шоковая сеть', 'Наземная ловушка', 'Хорошее', 250000, 0, 0, 0.2, 'Электрифицированная сеть для наземных существ', 'E', 0, 1)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Ауральная клетка', 'Наземная ловушка', 'Эпическое', 5000000, 0, 0, 0.35, 'Ловушка из Ауры для мощных наземных существ', 'C', 0, 1)`);

    // Воздушные ловушки (расходуемые)
    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Воздушная сеть', 'Воздушная ловушка', 'Обычное', 75000, 0, 0, 0.1, 'Сеть для ловли воздушных существ', 'F', 0, 1)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Молниевая ловушка', 'Воздушная ловушка', 'Хорошее', 350000, 0, 0, 0.2, 'Электрическая ловушка для воздушных существ', 'E', 0, 1)`);

    await db.run(`INSERT INTO HuntingGear (name, type, quality, price, bonus_damage, bonus_defense, bonus_success, description, min_rank, is_basic, is_consumable)
      VALUES ('Ауральная ловушка', 'Воздушная ловушка', 'Эпическое', 7500000, 0, 0, 0.35, 'Ловушка из Ауры для мощных воздушных существ', 'C', 0, 1)`);

    // Добавляем воздушных и земных существ из бестиария
    console.log('Adding aerial and terrestrial creatures from bestiary...');
    
    // Воздушные Затронутые
    const aerialTouched1 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Ауральный Сокол', 'Falco Aura', 'Затронутая', 'D', 'Воздух', 'Сокол, впитавший Ауру из высокогорных ветров', 'Золотистое оперение с серебристыми кончиками крыльев', 'Парящий охотник, использующий Ауру для полёта', 'Средняя', 1)`);
    
    const aerialTouched2 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Металлический Ворон', 'Corvus Metallicus', 'Затронутая', 'E', 'Воздух', 'Ворон с укреплёнными костями и клювом', 'Чёрное оперение с металлическим блеском', 'Умный и осторожный, предпочитает высоту', 'Низкая', 1)`);

    // Воздушные Искажённые
    const aerialDistorted1 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Фантомный Орёл', 'Aquila Phantasma', 'Искажённая', 'C', 'Воздух', 'Орёл, способный становиться невидимым в полёте', 'Прозрачные крылья, мерцающие в воздухе', 'Невидимый хищник, атакующий из ниоткуда', 'Высокая', 1)`);
    
    const aerialDistorted2 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Кристальная Ласточка', 'Hirundo Crystallis', 'Искажённая', 'B', 'Воздух', 'Ласточка с телом из живого кристалла', 'Прозрачное тело, переливающееся всеми цветами', 'Быстрый и манёвренный, оставляет кристаллический след', 'Очень высокая', 1)`);

    // Воздушные Бестии
    const aerialBeast1 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Громовой Дракон', 'Draco Tonitrus', 'Бестия', 'A', 'Воздух', 'Древний дракон, повелитель гроз и ветров', 'Массивное существо с крыльями из молний', 'Создаёт бури и управляет погодой', 'Экстремальная', 1)`);
    
    const aerialBeast2 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Ауральный Феникс', 'Phoenix Aura', 'Бестия', 'S', 'Воздух', 'Бессмертная птица, воплощение чистой Ауры', 'Огромное существо, светящееся золотым пламенем', 'Возрождается из пепла, исцеляет раненых', 'Легендарная', 1)`);

    // Земные Затронутые
    const terrestrialTouched1 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Ауральный Волк', 'Lupus Aura', 'Затронутая', 'D', 'Земля', 'Волк, впитавший Ауру из священных лесов', 'Серебристая шерсть с золотистыми глазами', 'Стайный охотник, использующий Ауру для координации', 'Средняя', 1)`);
    
    const terrestrialTouched2 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Металлический Медведь', 'Ursus Metallicus', 'Затронутая', 'C', 'Земля', 'Медведь с укреплёнными костями и когтями', 'Бурая шерсть с металлическими полосами', 'Мощный и медленный, но очень сильный', 'Высокая', 1)`);

    // Земные Искажённые
    const terrestrialDistorted1 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Фантомный Тигр', 'Panthera Phantasma', 'Искажённая', 'B', 'Земля', 'Тигр, способный становиться невидимым', 'Полупрозрачная шкура с полосами, мерцающими в тени', 'Невидимый хищник, атакующий из засады', 'Очень высокая', 1)`);
    
    const terrestrialDistorted2 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Кристальный Лев', 'Leo Crystallis', 'Искажённая', 'A', 'Земля', 'Лев с гривой из живого кристалла', 'Золотистая шкура с кристаллической гривой', 'Король зверей, излучающий кристаллическую энергию', 'Экстремальная', 1)`);

    // Земные Бестии
    const terrestrialBeast1 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Земной Дракон', 'Draco Terra', 'Бестия', 'A', 'Земля', 'Древний дракон, повелитель гор и пещер', 'Массивное существо с чешуёй цвета земли и камня', 'Создаёт землетрясения и управляет камнями', 'Экстремальная', 1)`);
    
    const terrestrialBeast2 = await db.run(`INSERT INTO BestiarySpecies (name, name_latin, mutation_class, rank, habitat, description, appearance, behavior, danger_level, is_active)
      VALUES ('Ауральный Единорог', 'Unicornis Aura', 'Бестия', 'S', 'Земля', 'Благородное существо, воплощение чистой Ауры', 'Белоснежное тело с золотым рогом', 'Исцеляет раненых и очищает загрязнённые места', 'Легендарная', 1)`);

    // Получаем ID существ
    const aerialTouched1Id = aerialTouched1.lastInsertRowid || aerialTouched1.lastID;
    const aerialTouched2Id = aerialTouched2.lastInsertRowid || aerialTouched2.lastID;
    const aerialDistorted1Id = aerialDistorted1.lastInsertRowid || aerialDistorted1.lastID;
    const aerialDistorted2Id = aerialDistorted2.lastInsertRowid || aerialDistorted2.lastID;
    const aerialBeast1Id = aerialBeast1.lastInsertRowid || aerialBeast1.lastID;
    const aerialBeast2Id = aerialBeast2.lastInsertRowid || aerialBeast2.lastID;
    
    const terrestrialTouched1Id = terrestrialTouched1.lastInsertRowid || terrestrialTouched1.lastID;
    const terrestrialTouched2Id = terrestrialTouched2.lastInsertRowid || terrestrialTouched2.lastID;
    const terrestrialDistorted1Id = terrestrialDistorted1.lastInsertRowid || terrestrialDistorted1.lastID;
    const terrestrialDistorted2Id = terrestrialDistorted2.lastInsertRowid || terrestrialDistorted2.lastID;
    const terrestrialBeast1Id = terrestrialBeast1.lastInsertRowid || terrestrialBeast1.lastID;
    const terrestrialBeast2Id = terrestrialBeast2.lastInsertRowid || terrestrialBeast2.lastID;

    // Привязываем существ к охотничьим локациям
    const aerialCreatures = [aerialTouched1Id, aerialTouched2Id, aerialDistorted1Id, aerialDistorted2Id, aerialBeast1Id, aerialBeast2Id];
    const terrestrialCreatures = [terrestrialTouched1Id, terrestrialTouched2Id, terrestrialDistorted1Id, terrestrialDistorted2Id, terrestrialBeast1Id, terrestrialBeast2Id];
    
    // Получаем ID локаций
    const kagaForestId = kagaForest.lastInsertRowid || kagaForest.lastID;
    const hoshiForestId = hoshiForest.lastInsertRowid || hoshiForest.lastID;
    const hoshiEchoId = hoshiEcho.lastInsertRowid || hoshiEcho.lastID;
    const kuroEchoId = kuroEcho.lastInsertRowid || kuroEcho.lastID;

    console.log('Linking aerial creatures to locations...');
    console.log('Aerial creatures count:', aerialCreatures.length);
    console.log('Location IDs:', { kagaForestId, hoshiForestId, hoshiEchoId, kuroEchoId });
    
    // Привязываем воздушных существ к локациям
    for (const creatureId of aerialCreatures) {
      if (creatureId <= aerialTouched2Id) {
        // Обычные локации для затронутых
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, kagaForestId, creatureId, 0.3);
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, hoshiForestId, creatureId, 0.4);
        console.log(`Linked aerial creature ${creatureId} to forest locations`);
      } else if (creatureId <= aerialDistorted2Id) {
        // Редкие локации для искажённых
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, hoshiEchoId, creatureId, 0.2);
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, kuroEchoId, creatureId, 0.15);
        console.log(`Linked aerial creature ${creatureId} to echo locations`);
      } else {
        // Легендарные локации для бестий
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, hoshiEchoId, creatureId, 0.05);
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, kuroEchoId, creatureId, 0.03);
        console.log(`Linked aerial creature ${creatureId} to legendary locations`);
      }
    }

    console.log('Linking terrestrial creatures to locations...');
    console.log('Terrestrial creatures count:', terrestrialCreatures.length);
    
    // Привязываем земных существ к локациям
    for (const creatureId of terrestrialCreatures) {
      if (creatureId <= terrestrialTouched2Id) {
        // Обычные локации для затронутых
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, kagaForestId, creatureId, 0.4);
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, hoshiForestId, creatureId, 0.5);
        console.log(`Linked terrestrial creature ${creatureId} to forest locations`);
      } else if (creatureId <= terrestrialDistorted2Id) {
        // Редкие локации для искажённых
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, hoshiEchoId, creatureId, 0.25);
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, kuroEchoId, creatureId, 0.2);
        console.log(`Linked terrestrial creature ${creatureId} to echo locations`);
      } else {
        // Легендарные локации для бестий
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, hoshiEchoId, creatureId, 0.08);
        await db.run(`INSERT INTO HuntingLocationSpawns (location_id, species_id, spawn_chance) VALUES (?, ?, ?)`, kuroEchoId, creatureId, 0.05);
        console.log(`Linked terrestrial creature ${creatureId} to legendary locations`);
      }
    }

    // Добавляем характеристики для новых существ
    console.log('Adding characteristics for new creatures...');
    
    // Характеристики для воздушных существ
    const aerialCharacteristics = [
      { species_id: aerialTouched1.lastInsertRowid, characteristic_type: 'drop_items', value: '["Перо Аурального Сокола", "Коготь Сокола", "Ауральная энергия"]' },
      { species_id: aerialTouched1.lastInsertRowid, characteristic_type: 'credit_value_min', value: '15000' },
      { species_id: aerialTouched1.lastInsertRowid, characteristic_type: 'credit_value_max', value: '25000' },
      
      { species_id: aerialTouched2.lastInsertRowid, characteristic_type: 'drop_items', value: '["Металлическое перо", "Клюв Ворона", "Металлическая пыль"]' },
      { species_id: aerialTouched2.lastInsertRowid, characteristic_type: 'credit_value_min', value: '8000' },
      { species_id: aerialTouched2.lastInsertRowid, characteristic_type: 'credit_value_max', value: '15000' },
      
      { species_id: aerialDistorted1.lastInsertRowid, characteristic_type: 'drop_items', value: '["Фантомное перо", "Коготь Орла", "Эссенция невидимости"]' },
      { species_id: aerialDistorted1.lastInsertRowid, characteristic_type: 'credit_value_min', value: '50000' },
      { species_id: aerialDistorted1.lastInsertRowid, characteristic_type: 'credit_value_max', value: '80000' },
      
      { species_id: aerialDistorted2.lastInsertRowid, characteristic_type: 'drop_items', value: '["Кристальное перо", "Кристальный клюв", "Кристальная пыль"]' },
      { species_id: aerialDistorted2.lastInsertRowid, characteristic_type: 'credit_value_min', value: '100000' },
      { species_id: aerialDistorted2.lastInsertRowid, characteristic_type: 'credit_value_max', value: '150000' },
      
      { species_id: aerialBeast1.lastInsertRowid, characteristic_type: 'drop_items', value: '["Чешуя Громового Дракона", "Коготь Дракона", "Молниевая эссенция", "Сердце Дракона"]' },
      { species_id: aerialBeast1.lastInsertRowid, characteristic_type: 'credit_value_min', value: '500000' },
      { species_id: aerialBeast1.lastInsertRowid, characteristic_type: 'credit_value_max', value: '800000' },
      
      { species_id: aerialBeast2.lastInsertRowid, characteristic_type: 'drop_items', value: '["Перо Феникса", "Слеза Феникса", "Ауральная эссенция", "Сердце Феникса"]' },
      { species_id: aerialBeast2.lastInsertRowid, characteristic_type: 'credit_value_min', value: '1000000' },
      { species_id: aerialBeast2.lastInsertRowid, characteristic_type: 'credit_value_max', value: '2000000' }
    ];

    // Характеристики для земных существ
    const terrestrialCharacteristics = [
      { species_id: terrestrialTouched1.lastInsertRowid, characteristic_type: 'drop_items', value: '["Шерсть Аурального Волка", "Клык Волка", "Ауральная энергия"]' },
      { species_id: terrestrialTouched1.lastInsertRowid, characteristic_type: 'credit_value_min', value: '20000' },
      { species_id: terrestrialTouched1.lastInsertRowid, characteristic_type: 'credit_value_max', value: '35000' },
      
      { species_id: terrestrialTouched2.lastInsertRowid, characteristic_type: 'drop_items', value: '["Металлическая шерсть", "Коготь Медведя", "Металлическая кость"]' },
      { species_id: terrestrialTouched2.lastInsertRowid, characteristic_type: 'credit_value_min', value: '30000' },
      { species_id: terrestrialTouched2.lastInsertRowid, characteristic_type: 'credit_value_max', value: '50000' },
      
      { species_id: terrestrialDistorted1.lastInsertRowid, characteristic_type: 'drop_items', value: '["Фантомная шкура", "Клык Тигра", "Эссенция невидимости"]' },
      { species_id: terrestrialDistorted1.lastInsertRowid, characteristic_type: 'credit_value_min', value: '75000' },
      { species_id: terrestrialDistorted1.lastInsertRowid, characteristic_type: 'credit_value_max', value: '120000' },
      
      { species_id: terrestrialDistorted2.lastInsertRowid, characteristic_type: 'drop_items', value: '["Кристальная грива", "Кристальный коготь", "Кристальная пыль", "Сердце Льва"]' },
      { species_id: terrestrialDistorted2.lastInsertRowid, characteristic_type: 'credit_value_min', value: '200000' },
      { species_id: terrestrialDistorted2.lastInsertRowid, characteristic_type: 'credit_value_max', value: '300000' },
      
      { species_id: terrestrialBeast1.lastInsertRowid, characteristic_type: 'drop_items', value: '["Чешуя Земного Дракона", "Коготь Дракона", "Земная эссенция", "Сердце Дракона"]' },
      { species_id: terrestrialBeast1.lastInsertRowid, characteristic_type: 'credit_value_min', value: '600000' },
      { species_id: terrestrialBeast1.lastInsertRowid, characteristic_type: 'credit_value_max', value: '1000000' },
      
      { species_id: terrestrialBeast2.lastInsertRowid, characteristic_type: 'drop_items', value: '["Рог Единорога", "Слеза Единорога", "Ауральная эссенция", "Сердце Единорога"]' },
      { species_id: terrestrialBeast2.lastInsertRowid, characteristic_type: 'credit_value_min', value: '1500000' },
      { species_id: terrestrialBeast2.lastInsertRowid, characteristic_type: 'credit_value_max', value: '3000000' }
    ];

    // Сохраняем характеристики
    for (const char of [...aerialCharacteristics, ...terrestrialCharacteristics]) {
      await db.run(`INSERT INTO BestiaryCharacteristics (species_id, characteristic_type, value) VALUES (?, ?, ?)`, 
        char.species_id, char.characteristic_type, char.value);
    }

    console.log('Hunting data seeded successfully!');
  } catch (error) {
    console.error('Error seeding hunting data:', error);
    throw error;
  }
}


// Функция для очистки дублирующихся записей
export async function cleanDuplicateRecords(db: any) {
  try {
    console.log('Starting cleanup of duplicate records...');

    // Очищаем дублирующиеся записи FishingGear
    console.log('Cleaning FishingGear duplicates...');
    try {
      const fishingDuplicates = await db.all(`
        SELECT name, type, quality, price, COUNT(*) as count 
        FROM FishingGear 
        GROUP BY name, type, quality, price 
        HAVING COUNT(*) > 1
      `);
      
      for (const duplicate of fishingDuplicates) {
        console.log(`Found ${duplicate.count} duplicates of ${duplicate.name} (${duplicate.type}, ${duplicate.quality})`);
        
        // Оставляем только одну запись, удаляем остальные
        await db.run(`
          DELETE FROM FishingGear 
          WHERE name = ? AND type = ? AND quality = ? AND price = ?
          AND id NOT IN (
            SELECT MIN(id) FROM FishingGear 
            WHERE name = ? AND type = ? AND quality = ? AND price = ?
          )
        `, [
          duplicate.name, duplicate.type, duplicate.quality, duplicate.price,
          duplicate.name, duplicate.type, duplicate.quality, duplicate.price
        ]);
      }
    } catch (error) {
      console.log('FishingGear table does not exist or has no duplicates, skipping...');
    }

    // Очищаем дублирующиеся записи HuntingGear
    console.log('Cleaning HuntingGear duplicates...');
    try {
      const huntingDuplicates = await db.all(`
        SELECT name, type, quality, price, COUNT(*) as count 
        FROM HuntingGear 
        GROUP BY name, type, quality, price 
        HAVING COUNT(*) > 1
      `);
      
      for (const duplicate of huntingDuplicates) {
        console.log(`Found ${duplicate.count} duplicates of ${duplicate.name} (${duplicate.type}, ${duplicate.quality})`);
        
        // Оставляем только одну запись, удаляем остальные
        await db.run(`
          DELETE FROM HuntingGear 
          WHERE name = ? AND type = ? AND quality = ? AND price = ?
          AND id NOT IN (
            SELECT MIN(id) FROM HuntingGear 
            WHERE name = ? AND type = ? AND quality = ? AND price = ?
          )
        `, [
          duplicate.name, duplicate.type, duplicate.quality, duplicate.price,
          duplicate.name, duplicate.type, duplicate.quality, duplicate.price
        ]);
      }
    } catch (error) {
      console.log('HuntingGear table does not exist or has no duplicates, skipping...');
    }

    // Очищаем дублирующиеся записи FishingLocations
    console.log('Cleaning FishingLocations duplicates...');
    try {
      const fishingLocationDuplicates = await db.all(`
        SELECT name, island, region, water_type, COUNT(*) as count 
        FROM FishingLocations 
        GROUP BY name, island, region, water_type 
        HAVING COUNT(*) > 1
      `);
      
      for (const duplicate of fishingLocationDuplicates) {
        console.log(`Found ${duplicate.count} duplicates of ${duplicate.name} (${duplicate.island}, ${duplicate.region})`);
        
        // Оставляем только одну запись, удаляем остальные
        await db.run(`
          DELETE FROM FishingLocations 
          WHERE name = ? AND island = ? AND region = ? AND water_type = ?
          AND id NOT IN (
            SELECT MIN(id) FROM FishingLocations 
            WHERE name = ? AND island = ? AND region = ? AND water_type = ?
          )
        `, [
          duplicate.name, duplicate.island, duplicate.region, duplicate.water_type,
          duplicate.name, duplicate.island, duplicate.region, duplicate.water_type
        ]);
      }
    } catch (error) {
      console.log('FishingLocations table does not exist or has no duplicates, skipping...');
    }

    // Очищаем дублирующиеся записи HuntingLocations
    console.log('Cleaning HuntingLocations duplicates...');
    try {
      const huntingLocationDuplicates = await db.all(`
        SELECT name, island, region, terrain_type, COUNT(*) as count 
        FROM HuntingLocations 
        GROUP BY name, island, region, terrain_type 
        HAVING COUNT(*) > 1
      `);
      
      for (const duplicate of huntingLocationDuplicates) {
        console.log(`Found ${duplicate.count} duplicates of ${duplicate.name} (${duplicate.island}, ${duplicate.region})`);
        
        // Оставляем только одну запись, удаляем остальные
        await db.run(`
          DELETE FROM HuntingLocations 
          WHERE name = ? AND island = ? AND region = ? AND terrain_type = ?
          AND id NOT IN (
            SELECT MIN(id) FROM HuntingLocations 
            WHERE name = ? AND island = ? AND region = ? AND terrain_type = ?
          )
        `, [
          duplicate.name, duplicate.island, duplicate.region, duplicate.terrain_type,
          duplicate.name, duplicate.island, duplicate.region, duplicate.terrain_type
        ]);
      }
    } catch (error) {
      console.log('HuntingLocations table does not exist or has no duplicates, skipping...');
    }

    // Очищаем дублирующиеся записи FishSpecies
    console.log('Cleaning FishSpecies duplicates...');
    try {
      const fishDuplicates = await db.all(`
        SELECT name, rarity, COUNT(*) as count 
        FROM FishSpecies 
        GROUP BY name, rarity 
        HAVING COUNT(*) > 1
      `);
      
      for (const duplicate of fishDuplicates) {
        console.log(`Found ${duplicate.count} duplicates of ${duplicate.name} (${duplicate.rarity})`);
        
        // Оставляем только одну запись, удаляем остальные
        await db.run(`
          DELETE FROM FishSpecies 
          WHERE name = ? AND rarity = ?
          AND id NOT IN (
            SELECT MIN(id) FROM FishSpecies 
            WHERE name = ? AND rarity = ?
          )
        `, [duplicate.name, duplicate.rarity, duplicate.name, duplicate.rarity]);
      }
    } catch (error) {
      console.log('FishSpecies table does not exist or has no duplicates, skipping...');
    }

    // Очищаем дублирующиеся записи BestiarySpecies
    console.log('Cleaning BestiarySpecies duplicates...');
    try {
      // Проверяем, есть ли колонка habitat
      const bestiaryColumns = await db.all(`PRAGMA table_info(BestiarySpecies)`);
      const hasHabitatColumn = bestiaryColumns.some((col: any) => col.name === 'habitat');
      
      if (hasHabitatColumn) {
        const bestiaryDuplicates = await db.all(`
          SELECT name, habitat, COUNT(*) as count 
          FROM BestiarySpecies 
          GROUP BY name, habitat 
          HAVING COUNT(*) > 1
        `);
        
        for (const duplicate of bestiaryDuplicates) {
          console.log(`Found ${duplicate.count} duplicates of ${duplicate.name} (${duplicate.habitat})`);
          
          // Оставляем только одну запись, удаляем остальные
          await db.run(`
            DELETE FROM BestiarySpecies 
            WHERE name = ? AND habitat = ?
            AND id NOT IN (
              SELECT MIN(id) FROM BestiarySpecies 
              WHERE name = ? AND habitat = ?
            )
          `, [duplicate.name, duplicate.habitat, duplicate.name, duplicate.habitat]);
        }
      } else {
        // Если нет колонки habitat, используем только name
        const bestiaryDuplicates = await db.all(`
          SELECT name, COUNT(*) as count 
          FROM BestiarySpecies 
          GROUP BY name 
          HAVING COUNT(*) > 1
        `);
        
        for (const duplicate of bestiaryDuplicates) {
          console.log(`Found ${duplicate.count} duplicates of ${duplicate.name}`);
          
          // Оставляем только одну запись, удаляем остальные
          await db.run(`
            DELETE FROM BestiarySpecies 
            WHERE name = ?
            AND id NOT IN (
              SELECT MIN(id) FROM BestiarySpecies 
              WHERE name = ?
            )
          `, [duplicate.name, duplicate.name]);
        }
      }
    } catch (error) {
      console.log('BestiarySpecies table does not exist or has no duplicates, skipping...');
    }

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning duplicate records:', error);
    throw error;
  }
}

// Функция для выдачи базового снаряжения новому персонажу
export async function giveBasicGear(db: any, characterId: number) {
  try {
    // Получаем базовое снаряжение
    const basicFishingGear = await db.all(`SELECT id FROM FishingGear WHERE is_basic = 1`);
    const basicHuntingGear = await db.all(`SELECT id FROM HuntingGear WHERE is_basic = 1`);

    // Выдаём базовое снаряжение для рыбалки
    for (const gear of basicFishingGear) {
      await db.run(`INSERT INTO CharacterFishingGear (character_id, gear_id, is_equipped) VALUES (?, ?, 1)`, characterId, gear.id);
    }

    // Выдаём базовое снаряжение для охоты
    for (const gear of basicHuntingGear) {
      await db.run(`INSERT INTO CharacterHuntingGear (character_id, gear_id, is_equipped) VALUES (?, ?, 1)`, characterId, gear.id);
    }

    console.log(`Basic gear given to character ${characterId}`);
  } catch (error) {
    console.error('Error giving basic gear:', error);
    throw error;
  }
}