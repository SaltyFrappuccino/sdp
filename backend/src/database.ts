import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDB() {
  try {
    const db = await open({
      filename: './anketi.db',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS anketas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        city TEXT,
        about TEXT,
        photo_url TEXT
      );
    `);

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}