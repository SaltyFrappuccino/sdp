// Character routes

import { Router } from 'express';
import { CharacterController } from '../controllers/character.controller.js';

const router = Router();
const controller = new CharacterController();

// GET all characters
router.get('/', (req, res) => controller.getAllCharacters(req, res));

// GET character by ID
router.get('/:id', (req, res) => controller.getCharacterById(req, res));

// GET characters by VK ID
router.get('/vk/:vk_id', (req, res) => controller.getCharactersByVkId(req, res));

// Search characters
router.get('/search/query', (req, res) => controller.searchCharacters(req, res));

// POST create character
router.post('/', (req, res) => controller.createCharacter(req, res));

// PUT update character
router.put('/:id', (req, res) => controller.updateCharacter(req, res));

// POST update character status
router.post('/:id/status', (req, res) => controller.updateCharacterStatus(req, res));

// DELETE character
router.delete('/:id', (req, res) => controller.deleteCharacter(req, res));

export default router;

