import { getDbConnection } from '../database/connection.js';

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function updateStockPrices() {
  try {
    const db = await getDbConnection();
    const stocks = await db.all('SELECT * FROM Stocks');
    const activeEvents = await db.all('SELECT * FROM MarketEvents WHERE start_time <= datetime("now") AND end_time >= datetime("now")');

    for (const stock of stocks) {
      let trendModifier = stock.base_trend || 0.0;
      let eventModifier = 0.0;

      const stockEvents = activeEvents.filter((e: any) => e.impacted_stock_id === stock.id);
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

        const preciseTimestamp = new Date().toISOString();
        
        await db.run(
          'INSERT INTO StockPriceHistory (stock_id, price, timestamp) VALUES (?, ?, ?)',
          stock.id,
          newPrice.toFixed(2),
          preciseTimestamp
        );
      }
    }

    console.log('[MarketEngine] Цены акций обновлены');
  } catch (error) {
    console.error('[MarketEngine] Ошибка при обновлении цен:', error);
  }
}

export function startMarketEngine() {
  console.log('[MarketEngine] Запуск движка фондового рынка...');
  console.log(`[MarketEngine] Интервал обновления: ${UPDATE_INTERVAL / 1000} секунд`);
  
  // Первое обновление сразу
  updateStockPrices();
  
  // Периодическое обновление
  setInterval(updateStockPrices, UPDATE_INTERVAL);
  
  console.log('[MarketEngine] Движок фондового рынка запущен');
}

