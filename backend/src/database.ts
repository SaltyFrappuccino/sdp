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

    // Принудительная миграция для CasinoGames - добавляем новые типы игр
    try {
      await db.exec('PRAGMA foreign_keys=off;');
      await db.exec('BEGIN TRANSACTION;');
      
      // Проверяем существование таблицы CasinoGames
      const tableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='CasinoGames'`);
      
      if (tableExists) {
        // Всегда пересоздаем таблицу для обеспечения корректности constraint
        console.log('Force migrating CasinoGames table to include new game types...');

        // Создаем временную таблицу с правильными constraint
        await db.exec(`
          CREATE TABLE CasinoGames_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id INTEGER NOT NULL,
            game_type TEXT NOT NULL CHECK (game_type IN ('blackjack', 'slots', 'dice', 'roulette', 'horseracing')),
            bet_amount REAL NOT NULL,
            win_amount REAL DEFAULT 0,
            game_data TEXT DEFAULT '{}',
            result TEXT NOT NULL CHECK (result IN ('win', 'lose', 'push')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
          );
        `);
        
        // Копируем данные из старой таблицы
        await db.exec(`INSERT OR IGNORE INTO CasinoGames_new SELECT * FROM CasinoGames;`);
        
        // Удаляем старую таблицу и переименовываем новую
        await db.exec(`DROP TABLE CasinoGames;`);
        await db.exec(`ALTER TABLE CasinoGames_new RENAME TO CasinoGames;`);
        
        console.log('CasinoGames table force migrated successfully.');
      }
      
      await db.exec('COMMIT;');
      await db.exec('PRAGMA foreign_keys=on;');
    } catch (error) {
      await db.exec('ROLLBACK;');
      await db.exec('PRAGMA foreign_keys=on;');
      console.warn('Could not force migrate CasinoGames table:', error);
    }

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