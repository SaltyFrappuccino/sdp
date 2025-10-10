// Market routes

import { Router } from 'express';
import { MarketController } from '../controllers/market.controller.js';

const router = Router();
const controller = new MarketController();

// Stocks
router.get('/stocks', (req, res) => controller.getAllStocks(req, res));
router.get('/stocks/:id', (req, res) => controller.getStockById(req, res));
router.post('/stocks/buy', (req, res) => controller.buyStock(req, res));
router.post('/stocks/sell', (req, res) => controller.sellStock(req, res));
router.get('/portfolio/:character_id', (req, res) => controller.getPortfolio(req, res));

// Crypto
router.get('/crypto', (req, res) => controller.getAllCryptos(req, res));
router.get('/crypto/:id', (req, res) => controller.getCryptoById(req, res));
router.post('/crypto/buy', (req, res) => controller.buyCrypto(req, res));
router.post('/crypto/sell', (req, res) => controller.sellCrypto(req, res));
router.get('/crypto/portfolio/:character_id', (req, res) => controller.getCryptoPortfolio(req, res));

export default router;

