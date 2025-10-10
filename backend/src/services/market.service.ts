// Market service for stocks and crypto

import { MarketRepository } from '../repositories/market.repository.js';
import { CharacterRepository } from '../repositories/character.repository.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class MarketService {
  private marketRepo: MarketRepository;
  private characterRepo: CharacterRepository;

  constructor() {
    this.marketRepo = new MarketRepository();
    this.characterRepo = new CharacterRepository();
  }

  // Stocks
  async getAllStocks(): Promise<any[]> {
    return this.marketRepo.findAllStocks();
  }

  async getStockById(id: number): Promise<any> {
    const stock = await this.marketRepo.findStockById(id);
    if (!stock) {
      throw new NotFoundError('Акция не найдена');
    }
    return stock;
  }

  async getStockPriceHistory(stockId: number, limit: number = 100): Promise<any[]> {
    return this.marketRepo.getStockPriceHistory(stockId, limit);
  }

  async buyStock(characterId: number, stockId: number, quantity: number): Promise<any> {
    const character = await this.characterRepo.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const stock = await this.marketRepo.findStockById(stockId);
    if (!stock) {
      throw new NotFoundError('Акция не найдена');
    }

    const totalCost = stock.current_price * quantity;
    if (character.currency < totalCost) {
      throw new ValidationError('Недостаточно средств');
    }

    // Get or create portfolio
    let portfolio = await this.marketRepo.findPortfolioByCharacterId(characterId);
    if (!portfolio) {
      const portfolioId = await this.marketRepo.createPortfolio(characterId, 0);
      portfolio = { id: portfolioId, character_id: characterId, cash_balance: 0 };
    }

    // Deduct from character currency
    await this.characterRepo.updateCharacterCurrency(characterId, -totalCost);

    // Add to portfolio
    await this.marketRepo.addPortfolioAsset(portfolio.id, stockId, quantity, stock.current_price);

    return {
      message: 'Акции куплены',
      stock: stock.name,
      quantity,
      total_cost: totalCost,
      new_balance: character.currency - totalCost,
    };
  }

  async sellStock(characterId: number, stockId: number, quantity: number): Promise<any> {
    const character = await this.characterRepo.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const portfolio = await this.marketRepo.findPortfolioByCharacterId(characterId);
    if (!portfolio) {
      throw new ValidationError('Портфель не найден');
    }

    const asset = await this.marketRepo.findPortfolioAssetByStock(portfolio.id, stockId);
    if (!asset || asset.quantity < quantity) {
      throw new ValidationError('Недостаточно акций');
    }

    const stock = await this.marketRepo.findStockById(stockId);
    if (!stock) {
      throw new NotFoundError('Акция не найдена');
    }

    const totalValue = stock.current_price * quantity;

    // Remove from portfolio
    await this.marketRepo.removePortfolioAsset(portfolio.id, stockId, quantity);

    // Add to character currency
    await this.characterRepo.updateCharacterCurrency(characterId, totalValue);

    return {
      message: 'Акции проданы',
      stock: stock.name,
      quantity,
      total_value: totalValue,
      new_balance: character.currency + totalValue,
    };
  }

  async getPortfolio(characterId: number): Promise<any> {
    let portfolio = await this.marketRepo.findPortfolioByCharacterId(characterId);
    if (!portfolio) {
      const portfolioId = await this.marketRepo.createPortfolio(characterId, 0);
      portfolio = { id: portfolioId, character_id: characterId, cash_balance: 0 };
    }

    const assets = await this.marketRepo.findPortfolioAssets(portfolio.id);

    return {
      portfolio,
      assets,
    };
  }

  // Crypto
  async getAllCryptos(): Promise<any[]> {
    return this.marketRepo.findAllCryptos();
  }

  async getCryptoById(id: number): Promise<any> {
    const crypto = await this.marketRepo.findCryptoById(id);
    if (!crypto) {
      throw new NotFoundError('Криптовалюта не найдена');
    }
    return crypto;
  }

  async getCryptoPriceHistory(cryptoId: number, limit: number = 100): Promise<any[]> {
    return this.marketRepo.getCryptoPriceHistory(cryptoId, limit);
  }

  async buyCrypto(characterId: number, cryptoId: number, amount: number): Promise<any> {
    const character = await this.characterRepo.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const crypto = await this.marketRepo.findCryptoById(cryptoId);
    if (!crypto) {
      throw new NotFoundError('Криптовалюта не найдена');
    }

    const totalCost = crypto.current_price * amount;
    if (character.currency < totalCost) {
      throw new ValidationError('Недостаточно средств');
    }

    // Get or create crypto portfolio
    let portfolio = await this.marketRepo.findCryptoPortfolioByCharacterId(characterId);
    if (!portfolio) {
      await this.marketRepo.createCryptoPortfolio(characterId);
      portfolio = await this.marketRepo.findCryptoPortfolioByCharacterId(characterId);
    }

    const balances = typeof portfolio.crypto_balances === 'string' 
      ? JSON.parse(portfolio.crypto_balances) 
      : portfolio.crypto_balances;

    // Update balances
    if (!balances[cryptoId]) {
      balances[cryptoId] = { quantity: 0, average_purchase_price: 0 };
    }

    const currentQuantity = balances[cryptoId].quantity || 0;
    const currentAvg = balances[cryptoId].average_purchase_price || 0;
    const newQuantity = currentQuantity + amount;
    const newAvg = ((currentAvg * currentQuantity) + (crypto.current_price * amount)) / newQuantity;

    balances[cryptoId] = {
      quantity: newQuantity,
      average_purchase_price: newAvg,
    };

    // Deduct from character currency
    await this.characterRepo.updateCharacterCurrency(characterId, -totalCost);

    // Update portfolio
    await this.marketRepo.updateCryptoPortfolio(characterId, balances);

    // Record transaction
    await this.marketRepo.addCryptoTransaction(characterId, cryptoId, 'buy', amount, crypto.current_price, totalCost);

    return {
      message: 'Криптовалюта куплена',
      crypto: crypto.name,
      amount,
      total_cost: totalCost,
      new_balance: character.currency - totalCost,
    };
  }

  async sellCrypto(characterId: number, cryptoId: number, amount: number): Promise<any> {
    const character = await this.characterRepo.findCharacterById(characterId);
    if (!character) {
      throw new NotFoundError('Персонаж не найден');
    }

    const portfolio = await this.marketRepo.findCryptoPortfolioByCharacterId(characterId);
    if (!portfolio) {
      throw new ValidationError('Портфель не найден');
    }

    const balances = typeof portfolio.crypto_balances === 'string' 
      ? JSON.parse(portfolio.crypto_balances) 
      : portfolio.crypto_balances;

    if (!balances[cryptoId] || balances[cryptoId].quantity < amount) {
      throw new ValidationError('Недостаточно криптовалюты');
    }

    const crypto = await this.marketRepo.findCryptoById(cryptoId);
    if (!crypto) {
      throw new NotFoundError('Криптовалюта не найдена');
    }

    const totalValue = crypto.current_price * amount;

    // Update balances
    balances[cryptoId].quantity -= amount;
    if (balances[cryptoId].quantity === 0) {
      delete balances[cryptoId];
    }

    // Update portfolio
    await this.marketRepo.updateCryptoPortfolio(characterId, balances);

    // Add to character currency
    await this.characterRepo.updateCharacterCurrency(characterId, totalValue);

    // Record transaction
    await this.marketRepo.addCryptoTransaction(characterId, cryptoId, 'sell', amount, crypto.current_price, totalValue);

    return {
      message: 'Криптовалюта продана',
      crypto: crypto.name,
      amount,
      total_value: totalValue,
      new_balance: character.currency + totalValue,
    };
  }

  async getCryptoPortfolio(characterId: number): Promise<any> {
    let portfolio = await this.marketRepo.findCryptoPortfolioByCharacterId(characterId);
    if (!portfolio) {
      await this.marketRepo.createCryptoPortfolio(characterId);
      portfolio = await this.marketRepo.findCryptoPortfolioByCharacterId(characterId);
    }

    const balances = typeof portfolio.crypto_balances === 'string' 
      ? JSON.parse(portfolio.crypto_balances) 
      : portfolio.crypto_balances;

    return {
      portfolio,
      balances,
    };
  }
}

