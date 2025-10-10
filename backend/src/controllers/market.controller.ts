// Market controller

import { Request, Response } from 'express';
import { MarketService } from '../services/market.service.js';
import { handleError } from '../utils/errors.js';

const marketService = new MarketService();

export class MarketController {
  async getAllStocks(req: Request, res: Response): Promise<void> {
    try {
      const stocks = await marketService.getAllStocks();
      res.status(200).json(stocks);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getStockById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const stock = await marketService.getStockById(id);
      res.status(200).json(stock);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async buyStock(req: Request, res: Response): Promise<void> {
    try {
      const { character_id, stock_id, quantity } = req.body;
      const result = await marketService.buyStock(character_id, stock_id, quantity);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async sellStock(req: Request, res: Response): Promise<void> {
    try {
      const { character_id, stock_id, quantity } = req.body;
      const result = await marketService.sellStock(character_id, stock_id, quantity);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const characterId = parseInt(req.params.character_id);
      const portfolio = await marketService.getPortfolio(characterId);
      res.status(200).json(portfolio);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getAllCryptos(req: Request, res: Response): Promise<void> {
    try {
      const cryptos = await marketService.getAllCryptos();
      res.status(200).json(cryptos);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getCryptoById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const crypto = await marketService.getCryptoById(id);
      res.status(200).json(crypto);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async buyCrypto(req: Request, res: Response): Promise<void> {
    try {
      const { character_id, crypto_id, amount } = req.body;
      const result = await marketService.buyCrypto(character_id, crypto_id, amount);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async sellCrypto(req: Request, res: Response): Promise<void> {
    try {
      const { character_id, crypto_id, amount } = req.body;
      const result = await marketService.sellCrypto(character_id, crypto_id, amount);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getCryptoPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const characterId = parseInt(req.params.character_id);
      const portfolio = await marketService.getCryptoPortfolio(characterId);
      res.status(200).json(portfolio);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }
}

