// Game routes

import { Router } from 'express';
import { GameController } from '../controllers/game.controller.js';

const router = Router();
const controller = new GameController();

// Horses
router.get('/horses', (req, res) => controller.getAllHorses(req, res));

// Fishing
router.get('/fishing/locations', (req, res) => controller.getFishingLocations(req, res));
router.get('/fishing/gear', (req, res) => controller.getFishingGear(req, res));

// Hunting
router.get('/hunting/locations', (req, res) => controller.getHuntingLocations(req, res));
router.get('/hunting/gear', (req, res) => controller.getHuntingGear(req, res));

export default router;

