// Admin routes

import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';

const router = Router();
const controller = new AdminController();

// Characters
router.get('/characters/pending', (req, res) => controller.getPendingCharacters(req, res));
router.post('/characters/:id/approve', (req, res) => controller.approveCharacter(req, res));
router.post('/characters/:id/reject', (req, res) => controller.rejectCharacter(req, res));

// Updates
router.get('/updates', (req, res) => controller.getAllUpdates(req, res));
router.get('/updates/:id', (req, res) => controller.getUpdateById(req, res));
router.post('/updates/:id/approve', (req, res) => controller.approveUpdate(req, res));
router.post('/updates/:id/reject', (req, res) => controller.rejectUpdate(req, res));
router.delete('/updates/:id', (req, res) => controller.deleteUpdate(req, res));

// Stats
router.get('/stats', (req, res) => controller.getStats(req, res));

export default router;

