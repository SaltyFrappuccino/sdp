// Main routes index

import { Router } from 'express';
import characterRoutes from './character.routes.js';
import adminRoutes from './admin.routes.js';
import gameRoutes from './game.routes.js';
import marketRoutes from './market.routes.js';

const router = Router();

// Health check
router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount routes
router.use('/characters', characterRoutes);
router.use('/admin', adminRoutes);
router.use('/games', gameRoutes);
router.use('/market', marketRoutes);

export default router;

