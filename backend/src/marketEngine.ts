import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const DB_PATH = './anketi.db';

async function getDbConnection() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

export async function updateStockPrices() {
  const db = await getDbConnection();
  try {
    const stocks = await db.all('SELECT * FROM Stocks');
    const activeEvents = await db.all('SELECT * FROM MarketEvents WHERE start_time <= datetime("now") AND end_time >= datetime("now")');

    for (const stock of stocks) {
      let trendModifier = stock.base_trend || 0.0;
      let eventModifier = 0.0;

      const stockEvents = activeEvents.filter(e => e.impacted_stock_id === stock.id);
      for (const event of stockEvents) {
        eventModifier += event.impact_strength;
      }
      
      const randomNoise = (Math.random() - 0.5) * 0.02; // -1% to +1% random fluctuation
      const priceChangePercentage = trendModifier + eventModifier + randomNoise;
      
      let newPrice = stock.current_price * (1 + priceChangePercentage);
      newPrice = Math.max(0.01, newPrice); // Price cannot be zero or negative

      if (newPrice !== stock.current_price) {
        await db.run(
          'UPDATE Stocks SET current_price = ?, updated_at = datetime("now") WHERE id = ?',
          newPrice.toFixed(2),
          stock.id
        );

        // Record precise timestamp with milliseconds
        const preciseTimestamp = new Date().toISOString(); // Format: 2025-01-15T14:30:45.123Z
        
        await db.run(
          'INSERT INTO StockPriceHistory (stock_id, price, timestamp) VALUES (?, ?, ?)',
          stock.id,
          newPrice.toFixed(2),
          preciseTimestamp
        );
      }
    }
  } catch (error) {
    console.error('Error updating stock prices:', error);
  } finally {
    await db.close();
  }
}

export function startMarketEngine(intervalMinutes = 5) {
  console.log('Market Engine Started. Price updates every', intervalMinutes, 'minutes.');
  setInterval(updateStockPrices, intervalMinutes * 60 * 1000);
}
