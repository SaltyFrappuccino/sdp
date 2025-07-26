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
        home_island TEXT,
        appearance TEXT,
        personality TEXT,
        biography TEXT,
        archetypes TEXT,
        attributes TEXT,
        attribute_points_total INTEGER DEFAULT 7,
        attribute_points_spent INTEGER DEFAULT 0,
        aura_cells TEXT,
        inventory TEXT,
        currency INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
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

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}