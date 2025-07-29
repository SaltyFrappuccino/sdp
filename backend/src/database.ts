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
        personality TEXT,
        biography TEXT,
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
            'vk_id', OLD.vk_id,
            'status', OLD.status,
            'character_name', OLD.character_name,
            'nickname', OLD.nickname,
            'age', OLD.age,
            'rank', OLD.rank,
            'faction', OLD.faction,
            'faction_position', OLD.faction_position,
            'home_island', OLD.home_island,
            'appearance', OLD.appearance,
            'personality', OLD.personality,
            'biography', OLD.biography,
            'archetypes', OLD.archetypes,
            'attributes', OLD.attributes,
            'aura_cells', OLD.aura_cells,
            'inventory', OLD.inventory,
            'currency', OLD.currency,
            'admin_note', OLD.admin_note
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
        gift TEXT,
        sync_level INTEGER,
        unity_stage TEXT,
        abilities TEXT,
        FOREIGN KEY (character_id) REFERENCES Characters(id) ON DELETE CASCADE
      );
    `);

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

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}