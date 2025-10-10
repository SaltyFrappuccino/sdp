// Game controller

import { Request, Response } from 'express';
import { GameService } from '../services/game.service.js';
import { handleError } from '../utils/errors.js';

const gameService = new GameService();

export class GameController {
  async getAllHorses(req: Request, res: Response): Promise<void> {
    try {
      const horses = await gameService.getAllHorses();
      res.status(200).json(horses);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getFishingLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await gameService.getFishingLocations();
      res.status(200).json(locations);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getFishingGear(req: Request, res: Response): Promise<void> {
    try {
      const gear = await gameService.getFishingGear();
      res.status(200).json(gear);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getHuntingLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await gameService.getHuntingLocations();
      res.status(200).json(locations);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getHuntingGear(req: Request, res: Response): Promise<void> {
    try {
      const gear = await gameService.getHuntingGear();
      res.status(200).json(gear);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }
}

