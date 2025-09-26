import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const DB_PATH = './anketi.db';

async function getDbConnection() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

export async function updateTokenPrices() {
  const db = await getDbConnection();
  try {
    const tokens = await db.all('SELECT * FROM BlockchainTokens');

    for (const token of tokens) {
      let trendModifier = token.base_trend || 0.0;
      
      // Случайные флуктуации для блокчейн токенов (больше волатильности)
      const randomNoise = (Math.random() - 0.5) * 0.05; // -2.5% to +2.5% random fluctuation
      const priceChangePercentage = trendModifier + randomNoise;
      
      let newPrice = token.current_price * (1 + priceChangePercentage);
      newPrice = Math.max(0.01, newPrice); // Цена не может быть нулевой или отрицательной

      if (newPrice !== token.current_price) {
        // Обновляем цену токена
        await db.run(
          'UPDATE BlockchainTokens SET current_price = ?, updated_at = datetime("now") WHERE id = ?',
          newPrice.toFixed(6), // Больше точности для криптовалют
          token.id
        );

        // Записываем историю цен с точным временем
        const preciseTimestamp = new Date().toISOString();
        
        await db.run(
          'INSERT INTO TokenPriceHistory (token_id, price, timestamp) VALUES (?, ?, ?)',
          token.id,
          newPrice.toFixed(6),
          preciseTimestamp
        );

        // Обновляем рыночную капитализацию
        const marketCap = newPrice * token.circulating_supply;
        await db.run(
          'UPDATE BlockchainTokens SET market_cap = ? WHERE id = ?',
          marketCap.toFixed(2),
          token.id
        );
      }
    }

    console.log(`Updated prices for ${tokens.length} blockchain tokens`);
  } catch (error) {
    console.error('Error updating token prices:', error);
  } finally {
    await db.close();
  }
}

export function startTokenEngine(intervalMinutes = 2) {
  console.log(`Starting token price engine with ${intervalMinutes} minute intervals`);
  updateTokenPrices(); // Запускаем сразу
  setInterval(updateTokenPrices, intervalMinutes * 60 * 1000);
}

// Функция для создания нового токена
export async function createToken(tokenData: {
  name: string;
  symbol: string;
  description?: string;
  initialPrice: number;
  totalSupply: number;
  circulatingSupply: number;
}) {
  const db = await getDbConnection();
  try {
    const result = await db.run(
      `INSERT INTO BlockchainTokens 
       (name, symbol, description, current_price, total_supply, circulating_supply, market_cap) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      tokenData.name,
      tokenData.symbol,
      tokenData.description || '',
      tokenData.initialPrice,
      tokenData.totalSupply,
      tokenData.circulatingSupply,
      tokenData.initialPrice * tokenData.circulatingSupply
    );

    // Записываем начальную цену в историю
    const preciseTimestamp = new Date().toISOString();
    await db.run(
      'INSERT INTO TokenPriceHistory (token_id, price, timestamp) VALUES (?, ?, ?)',
      result.lastID,
      tokenData.initialPrice,
      preciseTimestamp
    );

    return result.lastID;
  } catch (error) {
    console.error('Error creating token:', error);
    throw error;
  } finally {
    await db.close();
  }
}
