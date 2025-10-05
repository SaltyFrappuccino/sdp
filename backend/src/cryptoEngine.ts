import { initDB } from './database.js';

// База данных
let dbInstance: any = null;

interface CryptoCurrency {
  id: number;
  name: string;
  ticker_symbol: string;
  current_price: number;
  base_volatility: number;
  total_supply: number;
  circulating_supply: number;
}

interface CryptoEvent {
  id: number;
  impacted_crypto_id: number | null;
  impact_strength: number;
  end_time: string;
}

// Интервал обновления цен (в миллисекундах)
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 минут

/**
 * Обновляет цены всех криптовалют на основе волатильности и активных событий
 */
async function updateCryptoPrices() {
  try {
    console.log('[CryptoEngine] Начало обновления цен криптовалют...');
    
    const db = dbInstance || await initDB();

    // Получаем все активные криптовалюты
    const cryptocurrencies = db.prepare(`
      SELECT id, name, ticker_symbol, current_price, base_volatility, total_supply, circulating_supply
      FROM CryptoCurrencies
    `).all() as CryptoCurrency[];

    if (cryptocurrencies.length === 0) {
      console.log('[CryptoEngine] Нет криптовалют для обновления');
      return;
    }

    // Получаем активные события
    const activeEvents = db.prepare(`
      SELECT id, impacted_crypto_id, impact_strength, end_time
      FROM CryptoEvents
      WHERE datetime(end_time) > datetime('now')
    `).all() as CryptoEvent[];

    console.log(`[CryptoEngine] Активных событий: ${activeEvents.length}`);

    // Обновляем цену каждой криптовалюты
    for (const crypto of cryptocurrencies) {
      const oldPrice = crypto.current_price;

      // Базовое изменение на основе волатильности
      const volatility = crypto.base_volatility / 100;
      const baseChange = (Math.random() - 0.5) * 2 * volatility;

      // Добавляем влияние событий
      let eventImpact = 0;
      for (const event of activeEvents) {
        if (event.impacted_crypto_id === crypto.id || event.impacted_crypto_id === null) {
          // Глобальные события влияют на все криптовалюты
          eventImpact += (event.impact_strength / 100) * (Math.random() - 0.3); // Смещение в сторону положительного влияния
        }
      }

      // Рыночная динамика: иногда добавляем резкие скачки (1% шанс)
      let marketShock = 0;
      if (Math.random() < 0.01) {
        marketShock = (Math.random() - 0.5) * 0.2; // ±10% резкий скачок
        console.log(`[CryptoEngine] Рыночный шок для ${crypto.ticker_symbol}: ${(marketShock * 100).toFixed(2)}%`);
      }

      // Итоговое изменение цены
      const totalChange = baseChange + eventImpact + marketShock;
      let newPrice = oldPrice * (1 + totalChange);

      // Ограничиваем минимальную цену (не может быть меньше 0.01)
      newPrice = Math.max(0.01, newPrice);

      // Округляем до 2 знаков после запятой
      newPrice = Math.round(newPrice * 100) / 100;

      // Обновляем цену в базе данных
      db.prepare(`
        UPDATE CryptoCurrencies
        SET current_price = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(newPrice, crypto.id);

      // Записываем в историю цен
      db.prepare(`
        INSERT INTO CryptoPriceHistory (crypto_id, price, timestamp)
        VALUES (?, ?, datetime('now'))
      `).run(crypto.id, newPrice);

      const changePercent = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
      const changeSymbol = newPrice > oldPrice ? '▲' : newPrice < oldPrice ? '▼' : '━';
      console.log(`[CryptoEngine] ${crypto.ticker_symbol}: ${oldPrice.toFixed(2)} → ${newPrice.toFixed(2)} (${changeSymbol} ${changePercent}%)`);
    }

    // Очищаем старую историю цен (старше 30 дней)
    const deleted = db.prepare(`
      DELETE FROM CryptoPriceHistory
      WHERE datetime(timestamp) < datetime('now', '-30 days')
    `).run();

    if (deleted.changes > 0) {
      console.log(`[CryptoEngine] Удалено ${deleted.changes} старых записей из истории цен`);
    }

    console.log('[CryptoEngine] Обновление цен завершено успешно');
  } catch (error) {
    console.error('[CryptoEngine] Ошибка при обновлении цен:', error);
  }
}

/**
 * Очищает завершившиеся события
 */
async function cleanupExpiredEvents() {
  try {
    const db = dbInstance || await initDB();
    const result = db.prepare(`
      DELETE FROM CryptoEvents
      WHERE datetime(end_time) < datetime('now')
    `).run();

    if (result.changes > 0) {
      console.log(`[CryptoEngine] Удалено ${result.changes} завершившихся событий`);
    }
  } catch (error) {
    console.error('[CryptoEngine] Ошибка при очистке событий:', error);
  }
}

/**
 * Запускает движок криптовалют
 */
export async function startCryptoEngine() {
  console.log('[CryptoEngine] Запуск движка криптовалют...');
  console.log(`[CryptoEngine] Интервал обновления: ${UPDATE_INTERVAL / 1000} секунд`);

  // Инициализируем базу данных
  dbInstance = await initDB();

  // Первое обновление сразу при запуске
  await updateCryptoPrices();
  await cleanupExpiredEvents();

  // Периодическое обновление цен
  setInterval(async () => {
    await updateCryptoPrices();
    await cleanupExpiredEvents();
  }, UPDATE_INTERVAL);

  console.log('[CryptoEngine] Движок криптовалют запущен успешно');
}

/**
 * Останавливает движок криптовалют (для тестирования)
 */
export function stopCryptoEngine() {
  console.log('[CryptoEngine] Движок криптовалют остановлен');
  // В реальной реализации нужно сохранить interval ID и вызвать clearInterval
}
