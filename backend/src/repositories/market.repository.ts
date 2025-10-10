// Market repository for stocks and crypto operations

import { BaseRepository } from './base.repository.js';

export class MarketRepository extends BaseRepository {
  // Stocks
  async findAllStocks(): Promise<any[]> {
    return this.findAll('Stocks');
  }

  async findStockById(id: number): Promise<any | null> {
    return this.findById('Stocks', id);
  }

  async findStockBySymbol(symbol: string): Promise<any | null> {
    return this.findOneByCondition('Stocks', 'ticker_symbol = ?', [symbol]);
  }

  async updateStockPrice(id: number, price: number): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'UPDATE Stocks SET current_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [price, id]
    );
  }

  async addStockPriceHistory(stockId: number, price: number, timestamp: string): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'INSERT INTO StockPriceHistory (stock_id, price, timestamp) VALUES (?, ?, ?)',
      [stockId, price, timestamp]
    );
  }

  async getStockPriceHistory(stockId: number, limit: number = 100): Promise<any[]> {
    const db = await this.getDb();
    return db.all(
      'SELECT * FROM StockPriceHistory WHERE stock_id = ? ORDER BY timestamp DESC LIMIT ?',
      [stockId, limit]
    );
  }

  // Portfolios
  async findPortfolioByCharacterId(characterId: number): Promise<any | null> {
    return this.findOneByCondition('Portfolios', 'character_id = ?', [characterId]);
  }

  async createPortfolio(characterId: number, initialBalance: number = 0): Promise<number> {
    return this.create('Portfolios', {
      character_id: characterId,
      cash_balance: initialBalance,
    });
  }

  async updatePortfolioCash(portfolioId: number, amount: number): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'UPDATE Portfolios SET cash_balance = cash_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [amount, portfolioId]
    );
  }

  async findPortfolioAssets(portfolioId: number): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT pa.*, s.name, s.ticker_symbol, s.current_price
      FROM PortfolioAssets pa
      JOIN Stocks s ON pa.stock_id = s.id
      WHERE pa.portfolio_id = ?
    `, [portfolioId]);
  }

  async findPortfolioAssetByStock(portfolioId: number, stockId: number): Promise<any | null> {
    return this.findOneByCondition('PortfolioAssets', 'portfolio_id = ? AND stock_id = ?', [portfolioId, stockId]);
  }

  async addPortfolioAsset(portfolioId: number, stockId: number, quantity: number, averagePrice: number): Promise<void> {
    const existing = await this.findPortfolioAssetByStock(portfolioId, stockId);

    if (existing) {
      const db = await this.getDb();
      const totalQuantity = existing.quantity + quantity;
      const newAverage = ((existing.average_purchase_price * existing.quantity) + (averagePrice * quantity)) / totalQuantity;
      
      await db.run(
        'UPDATE PortfolioAssets SET quantity = ?, average_purchase_price = ? WHERE portfolio_id = ? AND stock_id = ?',
        [totalQuantity, newAverage, portfolioId, stockId]
      );
    } else {
      await this.create('PortfolioAssets', {
        portfolio_id: portfolioId,
        stock_id: stockId,
        quantity,
        average_purchase_price: averagePrice,
        position_type: 'long',
      });
    }
  }

  async removePortfolioAsset(portfolioId: number, stockId: number, quantity: number): Promise<void> {
    const db = await this.getDb();
    const existing = await this.findPortfolioAssetByStock(portfolioId, stockId);

    if (existing) {
      const newQuantity = existing.quantity - quantity;
      if (newQuantity <= 0) {
        await db.run('DELETE FROM PortfolioAssets WHERE portfolio_id = ? AND stock_id = ?', [portfolioId, stockId]);
      } else {
        await db.run('UPDATE PortfolioAssets SET quantity = ? WHERE portfolio_id = ? AND stock_id = ?', [newQuantity, portfolioId, stockId]);
      }
    }
  }

  // Crypto
  async findAllCryptos(): Promise<any[]> {
    return this.findAll('CryptoCurrencies');
  }

  async findCryptoById(id: number): Promise<any | null> {
    return this.findById('CryptoCurrencies', id);
  }

  async findCryptoBySymbol(symbol: string): Promise<any | null> {
    return this.findOneByCondition('CryptoCurrencies', 'ticker_symbol = ?', [symbol]);
  }

  async updateCryptoPrice(id: number, price: number): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'UPDATE CryptoCurrencies SET current_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [price, id]
    );
  }

  async addCryptoPriceHistory(cryptoId: number, price: number, timestamp: string): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'INSERT INTO CryptoPriceHistory (crypto_id, price, timestamp) VALUES (?, ?, ?)',
      [cryptoId, price, timestamp]
    );
  }

  async getCryptoPriceHistory(cryptoId: number, limit: number = 100): Promise<any[]> {
    const db = await this.getDb();
    return db.all(
      'SELECT * FROM CryptoPriceHistory WHERE crypto_id = ? ORDER BY timestamp DESC LIMIT ?',
      [cryptoId, limit]
    );
  }

  // Crypto portfolios
  async findCryptoPortfolioByCharacterId(characterId: number): Promise<any | null> {
    return this.findOneByCondition('CryptoPortfolios', 'character_id = ?', [characterId]);
  }

  async createCryptoPortfolio(characterId: number): Promise<number> {
    return this.create('CryptoPortfolios', {
      character_id: characterId,
      crypto_balances: '{}',
    });
  }

  async updateCryptoPortfolio(characterId: number, balances: any): Promise<void> {
    const db = await this.getDb();
    await db.run(
      'UPDATE CryptoPortfolios SET crypto_balances = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?',
      [JSON.stringify(balances), characterId]
    );
  }

  async addCryptoTransaction(characterId: number, cryptoId: number, type: string, quantity: number, pricePerCoin: number, totalAmount: number): Promise<number> {
    return this.create('CryptoTransactions', {
      character_id: characterId,
      crypto_id: cryptoId,
      transaction_type: type,
      quantity,
      price_per_coin: pricePerCoin,
      total_amount: totalAmount,
    });
  }

  async findCryptoTransactionsByCharacterId(characterId: number): Promise<any[]> {
    const db = await this.getDb();
    return db.all(`
      SELECT ct.*, cc.name, cc.ticker_symbol
      FROM CryptoTransactions ct
      JOIN CryptoCurrencies cc ON ct.crypto_id = cc.id
      WHERE ct.character_id = ?
      ORDER BY ct.created_at DESC
    `, [characterId]);
  }

  // Crypto events
  async findActiveCryptoEvents(): Promise<any[]> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    return db.all(
      'SELECT * FROM CryptoEvents WHERE end_time > ?',
      [now]
    );
  }

  async createCryptoEvent(event: any): Promise<number> {
    return this.create('CryptoEvents', {
      title: event.title,
      description: event.description,
      impacted_crypto_id: event.impacted_crypto_id || null,
      impact_strength: event.impact_strength,
      start_time: event.start_time,
      end_time: event.end_time,
      created_by_admin_id: event.created_by_admin_id || null,
    });
  }

  async deleteExpiredCryptoEvents(): Promise<void> {
    const db = await this.getDb();
    const now = new Date().toISOString();
    await db.run('DELETE FROM CryptoEvents WHERE end_time < ?', [now]);
  }
}

