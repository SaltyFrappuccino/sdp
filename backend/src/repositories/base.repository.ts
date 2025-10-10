// Base repository with common database operations

import { Database } from 'sqlite';
import { getDbConnection } from '../database/connection.js';

export class BaseRepository {
  protected async getDb(): Promise<Database> {
    return getDbConnection();
  }

  protected async findById<T>(table: string, id: number): Promise<T | null> {
    const db = await this.getDb();
    const result = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return result || null;
  }

  protected async findAll<T>(table: string): Promise<T[]> {
    const db = await this.getDb();
    return db.all(`SELECT * FROM ${table}`);
  }

  protected async findByCondition<T>(table: string, condition: string, params: any[]): Promise<T[]> {
    const db = await this.getDb();
    return db.all(`SELECT * FROM ${table} WHERE ${condition}`, params);
  }

  protected async findOneByCondition<T>(table: string, condition: string, params: any[]): Promise<T | null> {
    const db = await this.getDb();
    const result = await db.get(`SELECT * FROM ${table} WHERE ${condition}`, params);
    return result || null;
  }

  protected async create(table: string, data: Record<string, any>): Promise<number> {
    const db = await this.getDb();
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const result = await db.run(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
      values
    );

    return result.lastID!;
  }

  protected async update(table: string, id: number, data: Record<string, any>): Promise<void> {
    const db = await this.getDb();
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];

    await db.run(
      `UPDATE ${table} SET ${updates} WHERE id = ?`,
      values
    );
  }

  protected async delete(table: string, id: number): Promise<void> {
    const db = await this.getDb();
    await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  protected async deleteByCondition(table: string, condition: string, params: any[]): Promise<void> {
    const db = await this.getDb();
    await db.run(`DELETE FROM ${table} WHERE ${condition}`, params);
  }

  protected async count(table: string, condition?: string, params?: any[]): Promise<number> {
    const db = await this.getDb();
    const query = condition 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${condition}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    
    const result = await db.get(query, params || []);
    return result?.count || 0;
  }
}

