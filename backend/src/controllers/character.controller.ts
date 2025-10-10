// Character controller for HTTP handling

import { Request, Response } from 'express';
import { CharacterService } from '../services/character.service.js';
import { handleError } from '../utils/errors.js';

const characterService = new CharacterService();

export class CharacterController {
  async getAllCharacters(req: Request, res: Response): Promise<void> {
    try {
      const characters = await characterService.getAllCharacters();
      res.status(200).json(characters);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getCharacterById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const character = await characterService.getCharacterById(id);
      res.status(200).json(character);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getCharactersByVkId(req: Request, res: Response): Promise<void> {
    try {
      const vkId = parseInt(req.params.vk_id);
      const characters = await characterService.getCharactersByVkId(vkId);
      res.status(200).json(characters);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async createCharacter(req: Request, res: Response): Promise<void> {
    try {
      const result = await characterService.createCharacter(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async updateCharacter(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const result = await characterService.updateCharacter(id, req.body);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async updateCharacterStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const result = await characterService.updateCharacterStatus(id, status);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async deleteCharacter(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const result = await characterService.deleteCharacter(id);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async searchCharacters(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      const characters = await characterService.searchCharacters(q as string);
      res.status(200).json(characters);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }
}

