import { Router, Request, Response } from 'express';
import { initDB } from './database.js';

const router = Router();

const ADMIN_PASSWORD = 'heartattack';
const ADMIN_VK_ID = '1'; // Замените на реальный VK ID администратора

/**
 * @swagger
 * components:
 *   schemas:
 *     Contract:
 *       type: object
 *       properties:
 *         contract_name:
 *           type: string
 *         creature_name:
 *           type: string
 *         creature_rank:
 *           type: string
 *         creature_spectrum:
 *           type: string
 *         creature_description:
 *           type: string
 *         gift:
 *           type: string
 *         sync_level:
 *           type: integer
 *         unity_stage:
 *           type: string
 *         abilities:
 *           type: object
 *     Character:
 *       type: object
 *       required:
 *         - vk_id
 *         - character_name
 *       properties:
 *         vk_id:
 *           type: integer
 *         character_name:
 *           type: string
 *         nickname:
 *           type: string
 *         age:
 *           type: integer
 *         rank:
 *           type: string
 *         faction:
 *           type: string
 *         home_island:
 *           type: string
 *         appearance:
 *           type: string
 *         personality:
 *           type: string
 *         biography:
 *           type: string
 *         archetypes:
 *           type: string
 *         attributes:
 *           type: object
 *         inventory:
 *           type: object
 *         currency:
 *           type: integer
 *
 * /api/characters:
 *   post:
 *     summary: Создать нового персонажа
 *     description: Создает нового персонажа и связанные с ним контракты.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               character:
 *                 $ref: '#/components/schemas/Character'
 *               contracts:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Contract'
 *     responses:
 *       201:
 *         description: Персонаж успешно создан.
 *       400:
 *         description: Отсутствуют обязательные поля.
 *       500:
 *         description: Ошибка сервера.
 */
router.post('/characters', async (req: Request, res: Response) => {
  const { character, contracts } = req.body;
  const db = await initDB();

  // Валидация входных данных (упрощенная)
  if (!character || !character.vk_id || !character.character_name || !Array.isArray(contracts)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Вставляем основного персонажа
    const characterSql = `
      INSERT INTO Characters (vk_id, status, character_name, nickname, age, rank, faction, home_island, appearance, personality, biography, archetypes, attributes, inventory, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const characterParams = [
      character.vk_id, 'на рассмотрении', character.character_name, character.nickname, character.age, character.rank, character.faction, character.home_island,
      character.appearance, character.personality, character.biography, character.archetypes,
      JSON.stringify(character.attributes), JSON.stringify(character.inventory), character.currency
    ];

    const result = await db.run(characterSql, characterParams);
    const characterId = result.lastID;

    if (!characterId) {
      throw new Error('Failed to create character');
    }

    // Вставляем контракты, связанные с персонажем
    if (contracts.length > 0) {
      const contractSql = `
        INSERT INTO Contracts (character_id, contract_name, creature_name, creature_rank, creature_spectrum, creature_description, gift, sync_level, unity_stage, abilities)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const contract of contracts) {
        const contractParams = [
          characterId, contract.contract_name, contract.creature_name, contract.creature_rank, contract.creature_spectrum,
          contract.creature_description, contract.gift, contract.sync_level, contract.unity_stage, JSON.stringify(contract.abilities)
        ];
        await db.run(contractSql, contractParams);
      }
    }

    res.status(201).json({ message: 'Character created successfully', characterId });

  } catch (error) {
    console.error('Failed to create character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

/**
 * @swagger
 * /api/characters:
 *   get:
 *     summary: Получить список всех персонажей
 *     responses:
 *       200:
 *         description: Список персонажей.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/characters', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const characters = await db.all('SELECT id, character_name, vk_id, status, rank, faction FROM Characters');
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

/**
 * @swagger
 * /api/characters/{id}:
 *   get:
 *     summary: Получить персонажа по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Данные персонажа.
 *       404:
 *         description: Персонаж не найден.
 */
router.get('/characters/:id', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { id } = req.params;
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    const contracts = await db.all('SELECT * FROM Contracts WHERE character_id = ?', id);
    res.json({ ...character, contracts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

/**
 * @swagger
 * /api/characters/{id}:
 *   put:
 *     summary: Обновить персонажа по ID
 *     description: Обновляет любые переданные поля персонажа.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Character'
 *     responses:
 *       200:
 *         description: Персонаж успешно обновлен.
 *       400:
 *         description: Нет данных для обновления.
 *       404:
 *         description: Персонаж не найден.
 */
router.post('/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, adminId: ADMIN_VK_ID });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

router.put('/characters/:id', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const db = await initDB();
    const { id } = req.params;
    const fields = req.body;

    // Удаляем поля, которые не должны обновляться напрямую
    delete fields.id;
    delete fields.vk_id;
    delete fields.created_at;
    delete fields.updated_at;

    const keys = Object.keys(fields);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => {
      const value = fields[key];
      return typeof value === 'object' ? JSON.stringify(value) : value;
    });

    const sql = `UPDATE Characters SET ${setClause} WHERE id = ?`;
    const result = await db.run(sql, [...values, id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json({ message: 'Character updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update character' });
  }
});

/**
 * @swagger
 * /api/characters/{id}:
 *   delete:
 *     summary: Удалить персонажа по ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Персонаж успешно удален.
 *       404:
 *         description: Персонаж не найден.
 */
router.delete('/characters/:id', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { id } = req.params;
    const result = await db.run('DELETE FROM Characters WHERE id = ?', id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

export default router;