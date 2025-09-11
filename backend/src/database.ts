import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDB() {
  try {
    const db = await open({
      filename: './anketi.db',
      driver: sqlite3.Database
    });

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
        image_url TEXT
      );
    `);

    try {
      await db.exec('ALTER TABLE MarketItems ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0');
    } catch (error) {
      // Игнорируем ошибку, если колонка уже существует
      if (!(error instanceof Error && error.message.includes('duplicate column name'))) {
        throw error;
      }
    }

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

    await db.exec(`
      CREATE TABLE IF NOT EXISTS Events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('quest', 'gate', 'pvp', 'pve', 'social', 'auction', 'raid', 'special')),
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
        difficulty TEXT NOT NULL CHECK (difficulty IN ('F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS')),
        recommended_rank TEXT,
        max_participants INTEGER,
        min_participants INTEGER DEFAULT 1,
        is_deadly BOOLEAN DEFAULT 0,
        is_open_world BOOLEAN DEFAULT 0,
        rewards TEXT DEFAULT '{}',
        requirements TEXT DEFAULT '{}',
        location TEXT,
        location_description TEXT,
        start_date DATETIME,
        end_date DATETIME,
        application_deadline DATETIME,
        organizer_vk_id INTEGER NOT NULL,
        organizer_name TEXT NOT NULL,
        additional_info TEXT,
        event_data TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS EventParticipants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        character_id INTEGER NOT NULL,
        vk_id INTEGER NOT NULL,
        character_name TEXT NOT NULL,
        character_rank TEXT NOT NULL,
        faction TEXT NOT NULL,
        application_data TEXT DEFAULT '{}',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(event_id) REFERENCES Events(id) ON DELETE CASCADE,
        FOREIGN KEY(character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}