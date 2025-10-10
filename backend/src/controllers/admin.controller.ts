// Admin controller for administrative operations

import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { handleError } from '../utils/errors.js';

const adminService = new AdminService();

export class AdminController {
  async approveCharacter(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const id = parseInt(req.params.id);
      const result = await adminService.approveCharacter(adminId, id);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async rejectCharacter(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const id = parseInt(req.params.id);
      const result = await adminService.rejectCharacter(adminId, id);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getPendingCharacters(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const characters = await adminService.getPendingCharacters(adminId);
      res.status(200).json(characters);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getAllUpdates(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const updates = await adminService.getAllUpdates(adminId);
      res.status(200).json(updates);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getUpdateById(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const id = parseInt(req.params.id);
      const update = await adminService.getUpdateById(adminId, id);
      res.status(200).json(update);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async approveUpdate(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const id = parseInt(req.params.id);
      const result = await adminService.approveUpdate(adminId, id);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async rejectUpdate(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const id = parseInt(req.params.id);
      const result = await adminService.rejectUpdate(adminId, id);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async deleteUpdate(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const id = parseInt(req.params.id);
      const result = await adminService.deleteUpdate(adminId, id);
      res.status(200).json(result);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.headers['x-admin-id'] as string;
      const stats = await adminService.getStats(adminId);
      res.status(200).json(stats);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      res.status(statusCode).json({ error: message });
    }
  }
}

