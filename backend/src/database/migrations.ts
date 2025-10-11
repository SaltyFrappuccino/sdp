// Database schema migrations

import { Database } from 'sqlite';

export async function runMigrations(db: Database): Promise<void> {
  console.log('Running database migrations...');

  // Core tables
  await createUsersTables(db);
  await createCharactersTables(db);
  await createContractsTables(db);
  await createUpdatesTables(db);
  await createActivityTables(db);
  await createEventsTables(db);
  
  // Market and trading
  await createMarketTables(db);
  await createStocksTables(db);
  
  // Games
  await createCasinoTables(db);
  await createPokerTables(db);
  await createHorsesTables(db);
  
  // Crypto
  await createCryptoTables(db);
  
  // Purchases and collections
  await createPurchasesTables(db);
  await createCollectionsTables(db);
  
  // Factions
  await createFactionsTables(db);
  
  // Bestiary
  await createBestiaryTables(db);
  
  // Fishing and hunting
  await createFishingTables(db);
  await createHuntingTables(db);
  
  // Advanced hunting/fishing systems
  await createEchoZonesTables(db);
  await createAdvancedGearTables(db);
  await createCraftingTables(db);
  await createHuntingEventsTables(db);
  
  // Migrations
  await runColumnMigrations(db);

  console.log('Database migrations completed successfully!');
}

async function createUsersTables(db: Database): Promise<void> {
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
}

async function createCharactersTables(db: Database): Promise<void> {
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
}

async function createContractsTables(db: Database): Promise<void> {
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
}

async function createUpdatesTables(db: Database): Promise<void> {
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

    CREATE TABLE IF NOT EXISTS ai_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      result TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CharacterUpdates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER,
      updated_data TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(character_id) REFERENCES Characters(id)
    );
  `);
}

async function createActivityTables(db: Database): Promise<void> {
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
}

async function createEventsTables(db: Database): Promise<void> {
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

    CREATE TABLE IF NOT EXISTS EventBranches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      branch_name TEXT NOT NULL,
      description TEXT,
      min_rank TEXT,
      max_rank TEXT,
      max_participants INTEGER,
      rewards TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(event_id) REFERENCES Events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS EventParticipants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      vk_id INTEGER NOT NULL,
      branch_id INTEGER,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(event_id) REFERENCES Events(id) ON DELETE CASCADE,
      FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY(branch_id) REFERENCES EventBranches(id) ON DELETE SET NULL
    );

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
}

async function createMarketTables(db: Database): Promise<void> {
  await db.exec(`
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
  `);
}

async function createStocksTables(db: Database): Promise<void> {
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
      timestamp TEXT,
      legacy_timestamp DATETIME,
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
      position_type TEXT,
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
  `);
}

async function createCasinoTables(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS CasinoGames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      game_type TEXT NOT NULL CHECK (game_type IN ('blackjack', 'slots', 'dice', 'roulette', 'horse_racing')),
      bet_amount REAL NOT NULL,
      win_amount REAL DEFAULT 0,
      game_data TEXT DEFAULT '{}',
      result TEXT NOT NULL CHECK (result IN ('win', 'lose', 'push')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
    );
  `);
}

async function createPokerTables(db: Database): Promise<void> {
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

    CREATE TABLE IF NOT EXISTS PokerHands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      hand_number INTEGER NOT NULL,
      dealer_position INTEGER NOT NULL,
      small_blind_position INTEGER NOT NULL,
      big_blind_position INTEGER NOT NULL,
      community_cards TEXT DEFAULT '[]',
      deck_state TEXT DEFAULT '[]',
      pot INTEGER DEFAULT 0,
      current_bet INTEGER DEFAULT 0,
      current_player_position INTEGER,
      round_stage TEXT DEFAULT 'preflop' CHECK (round_stage IN ('preflop', 'flop', 'turn', 'river', 'showdown', 'finished')),
      winner_id INTEGER,
      side_pots TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      turn_timeout_at DATETIME,
      FOREIGN KEY(room_id) REFERENCES PokerRooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS PokerPlayerCards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hand_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      card1 TEXT NOT NULL,
      card2 TEXT NOT NULL,
      FOREIGN KEY(hand_id) REFERENCES PokerHands(id) ON DELETE CASCADE,
      FOREIGN KEY(player_id) REFERENCES PokerPlayers(id) ON DELETE CASCADE,
      UNIQUE(hand_id, player_id)
    );

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
}

async function createHorsesTables(db: Database): Promise<void> {
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
}

async function createCryptoTables(db: Database): Promise<void> {
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
      crypto_balances TEXT DEFAULT '{}',
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
      timestamp TEXT NOT NULL,
      FOREIGN KEY(crypto_id) REFERENCES CryptoCurrencies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CryptoEvents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      impacted_crypto_id INTEGER,
      impact_strength REAL NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      created_by_admin_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(impacted_crypto_id) REFERENCES CryptoCurrencies(id) ON DELETE CASCADE
    );
  `);
}

async function createPurchasesTables(db: Database): Promise<void> {
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
      island TEXT,
      rank_required TEXT,
      image_url TEXT,
      rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
      properties TEXT DEFAULT '{}',
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
}

async function createCollectionsTables(db: Database): Promise<void> {
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
      drop_rate REAL NOT NULL,
      properties TEXT DEFAULT '{}',
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
      guaranteed_rarity TEXT,
      items_count INTEGER DEFAULT 5,
      series_id INTEGER,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(series_id) REFERENCES CollectionSeries(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS CollectionTradeOffers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      offered_item_id INTEGER NOT NULL,
      requested_item_id INTEGER,
      requested_rarity TEXT,
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY(offered_item_id) REFERENCES CollectionItems(id) ON DELETE CASCADE,
      FOREIGN KEY(requested_item_id) REFERENCES CollectionItems(id) ON DELETE SET NULL
    );
  `);
}

async function createFactionsTables(db: Database): Promise<void> {
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
}

async function createBestiaryTables(db: Database): Promise<void> {
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
}

async function createFishingTables(db: Database): Promise<void> {
  await db.exec(`
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

    CREATE TABLE IF NOT EXISTS CharacterFishInventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      species_id INTEGER NOT NULL,
      weight REAL,
      caught_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      location_id INTEGER,
      is_sold BOOLEAN DEFAULT 0,
      quality_modifier REAL DEFAULT 1.0,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY (species_id) REFERENCES BestiarySpecies(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES FishingLocations(id)
    );

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
  `);
}

async function createHuntingTables(db: Database): Promise<void> {
  await db.exec(`
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

    CREATE TABLE IF NOT EXISTS HuntingGear (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('Броня', 'Воздушное оружие', 'Наземное оружие', 'Воздушная ловушка', 'Наземная ловушка')),
      quality TEXT CHECK(quality IN ('Базовое', 'Обычное', 'Хорошее', 'Отличное', 'Эпическое', 'Легендарное')),
      habitat_category TEXT CHECK(habitat_category IN ('Наземное', 'Воздушное', 'Универсальное')) DEFAULT 'Универсальное',
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

    CREATE TABLE IF NOT EXISTS CharacterHuntInventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      species_id INTEGER NOT NULL,
      loot_items TEXT,
      hunted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      location_id INTEGER,
      is_sold BOOLEAN DEFAULT 0,
      quality_modifier REAL DEFAULT 1.0,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY (species_id) REFERENCES BestiarySpecies(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES HuntingLocations(id)
    );

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
}

async function createEchoZonesTables(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS EchoZones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('fishing', 'hunting_ground', 'hunting_aerial')),
      intensity INTEGER NOT NULL CHECK(intensity BETWEEN 1 AND 5),
      residual_aura_level REAL DEFAULT 0.0 CHECK(residual_aura_level BETWEEN 0.0 AND 1.0),
      last_beast_migration DATETIME,
      active_until DATETIME,
      spawned_mutations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_echo_zones_location ON EchoZones(location_id, activity_type);
    CREATE INDEX IF NOT EXISTS idx_echo_zones_active ON EchoZones(active_until);
  `);
}

async function createAdvancedGearTables(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS AdvancedGear (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gear_type TEXT NOT NULL CHECK(gear_type IN ('rod', 'bait', 'trap', 'weapon', 'armor', 'enhancement')),
      activity_type TEXT NOT NULL CHECK(activity_type IN ('fishing', 'hunting', 'aerial_hunting', 'universal')),
      rank_requirement TEXT CHECK(rank_requirement IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
      unique_properties TEXT,
      synergy_contracts TEXT,
      durability_max INTEGER DEFAULT 100,
      price INTEGER DEFAULT 0,
      craft_recipe TEXT,
      description TEXT,
      image_url TEXT,
      is_craftable BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS CharacterAdvancedGear (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      gear_id INTEGER NOT NULL,
      durability_current INTEGER DEFAULT 100,
      quantity INTEGER DEFAULT 1,
      is_equipped BOOLEAN DEFAULT 0,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY (gear_id) REFERENCES AdvancedGear(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_advanced_gear_type ON AdvancedGear(gear_type, activity_type);
    CREATE INDEX IF NOT EXISTS idx_char_advanced_gear ON CharacterAdvancedGear(character_id);
  `);
}

async function createCraftingTables(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS CraftingMaterials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      material_type TEXT NOT NULL CHECK(material_type IN ('organic', 'essence', 'crystal', 'metal', 'special')),
      mutation_class TEXT CHECK(mutation_class IN ('Затронутые', 'Искажённые', 'Бестии')),
      source_species_id INTEGER,
      aura_property TEXT,
      rarity_tier INTEGER CHECK(rarity_tier BETWEEN 1 AND 5),
      credit_value INTEGER DEFAULT 0,
      description TEXT,
      image_url TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_species_id) REFERENCES BestiarySpecies(id) ON DELETE SET NULL
    );
    
    CREATE TABLE IF NOT EXISTS CharacterMaterials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      quality_modifier REAL DEFAULT 1.0,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES CraftingMaterials(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS SinkiCraftRecipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sinki_name TEXT NOT NULL,
      sinki_rank TEXT NOT NULL CHECK(sinki_rank IN ('F', 'E', 'D', 'C')),
      sinki_type TEXT NOT NULL CHECK(sinki_type IN ('Осколок', 'Фокус')),
      required_materials TEXT NOT NULL,
      success_chance_base REAL DEFAULT 0.7 CHECK(success_chance_base BETWEEN 0.0 AND 1.0),
      requires_crafter_rank TEXT CHECK(requires_crafter_rank IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
      sinki_properties TEXT,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS CraftingHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      recipe_id INTEGER NOT NULL,
      success BOOLEAN NOT NULL,
      materials_used TEXT,
      sinki_created TEXT,
      crafted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE,
      FOREIGN KEY (recipe_id) REFERENCES SinkiCraftRecipes(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_materials_type ON CraftingMaterials(material_type, mutation_class);
    CREATE INDEX IF NOT EXISTS idx_char_materials ON CharacterMaterials(character_id, material_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_rank ON SinkiCraftRecipes(sinki_rank, sinki_type);
  `);
}

async function createHuntingEventsTables(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS HuntingEvents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL CHECK(event_type IN ('migration', 'anomaly', 'rare_spawn', 'weather', 'season')),
      location_id INTEGER NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('fishing', 'hunting_ground', 'hunting_aerial')),
      active_from DATETIME NOT NULL,
      active_until DATETIME NOT NULL,
      bonus_creatures TEXT,
      special_conditions TEXT,
      rewards_multiplier REAL DEFAULT 1.0,
      description TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS EventParticipation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      participated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      rewards_claimed BOOLEAN DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES HuntingEvents(id) ON DELETE CASCADE,
      FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_events_active ON HuntingEvents(active_until, is_active);
    CREATE INDEX IF NOT EXISTS idx_events_location ON HuntingEvents(location_id, activity_type);
    CREATE INDEX IF NOT EXISTS idx_event_participation ON EventParticipation(event_id, character_id);
  `);
}

async function runColumnMigrations(db: Database): Promise<void> {
  // Add any necessary column migrations here
  try {
    const columns = await db.all("PRAGMA table_info(Contracts)");
    const hasCreatureImages = columns.some((col: any) => col.name === 'creature_images');
    if (!hasCreatureImages) {
      await db.exec('ALTER TABLE Contracts RENAME COLUMN creature_image TO creature_images');
    }
  } catch (error) {
    // Column already migrated or doesn't exist
  }
}

