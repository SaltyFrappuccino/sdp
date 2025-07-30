import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { initDB } from './database.js';

const router = Router();

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

router.post('/upload', upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не был загружен' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

const ADMIN_PASSWORD = 'heartattack';
const ADMIN_VK_ID = '1';

router.get('/health-check', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

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
 *           type: array
 *           items:
 *             type: string
 *         attributes:
 *           type: object
 *         attribute_points_total:
 *           type: integer
 *         attribute_points_spent:
 *           type: integer
 *         aura_cells:
 *           type: object
 *         inventory:
 *           type: string
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
const calculateAuraCells = (rank: string, contracts: any[]) => {
  const rankCellMap: { [key: string]: { small: number; medium: number; large: number } } = {
    'F': { small: 2, medium: 0, large: 0 },
    'E': { small: 4, medium: 0, large: 0 },
    'D': { small: 6, medium: 1, large: 0 },
    'C': { small: 10, medium: 2, large: 0 },
    'B': { small: 15, medium: 3, large: 1 },
    'A': { small: 20, medium: 4, large: 2 },
    'S': { small: 30, medium: 6, large: 3 },
    'SS': { small: 40, medium: 8, large: 4 },
    'SSS': { small: 50, medium: 10, large: 5 },
  };

  const baseCells = rankCellMap[rank] || { small: 0, medium: 0, large: 0 };

  const bonusCells = contracts.reduce(
    (acc, contract) => {
      const sync = contract.sync_level || 0;
      acc.small += Math.floor(sync / 10);
      acc.medium += Math.floor(sync / 25);
      acc.large += sync >= 100 ? 1 : 0;
      return acc;
    },
    { small: 0, medium: 0, large: 0 }
  );

  return {
    "Малые (I)": baseCells.small + bonusCells.small,
    "Значительные (II)": baseCells.medium + bonusCells.medium,
    "Предельные (III)": baseCells.large + bonusCells.large,
  };
};

router.post('/characters', async (req: Request, res: Response) => {
  const { contracts, ...character } = req.body;
  const db = await initDB();

  if (!character || !character.vk_id || !Array.isArray(contracts)) {
    return res.status(400).json({ error: 'Invalid request structure' });
  }

  const requiredFields = ['character_name', 'age', 'faction', 'rank', 'faction_position', 'home_island'];
  const missingFields = requiredFields.filter(field => {
    const value = (character as any)[field];
    // Проверяем на null, undefined и пустую строку
    return value === null || value === undefined || String(value).trim() === '';
  });

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Отсутствуют или не заполнены обязательные поля',
      missing: missingFields
    });
  }

  // Устанавливаем валюту по умолчанию, если она не указана
  if ((character as any).currency === undefined || (character as any).currency === null) {
    (character as any).currency = 0;
  }

  try {
    const auraCells = calculateAuraCells((character as any).rank, contracts);

    const attributeCosts: { [key: string]: number } = {
      "Дилетант": 1, "Новичок": 2, "Опытный": 4, "Эксперт": 7, "Мастер": 10
    };

    let spentPoints = 0;
    if (character.attributes) {
        for (const level of Object.values(character.attributes)) {
            spentPoints += attributeCosts[level as string] || 0;
        }
    }


    const characterSql = `
      INSERT INTO Characters (
        vk_id, status, character_name, nickname, age, rank, faction, faction_position, home_island,
        appearance, character_images, personality, biography, archetypes, attributes,
        attribute_points_total, attribute_points_spent, aura_cells, inventory, currency, admin_note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const characterParams = [
      character.vk_id, 'на рассмотрении', character.character_name, character.nickname, character.age,
      character.rank, character.faction, character.faction_position, character.home_island,
      character.appearance, JSON.stringify(character.character_images || []), character.personality, character.biography,
      JSON.stringify(character.archetypes || []),
      JSON.stringify(character.attributes || {}),
      20, // attribute_points_total
      spentPoints, // attribute_points_spent
      JSON.stringify(auraCells),
      JSON.stringify(character.inventory || []),
      character.currency,
      character.admin_note
    ];

    const result = await db.run(characterSql, characterParams);
    const characterId = result.lastID;

    if (!characterId) {
      throw new Error('Failed to create character');
    }

    // Вставляем контракты, связанные с персонажем
    if (contracts.length > 0) {
      const contractSql = `
        INSERT INTO Contracts (character_id, contract_name, creature_name, creature_rank, creature_spectrum, creature_description, creature_image, gift, sync_level, unity_stage, abilities)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const contract of contracts) {
        if (contract.sync_level < 0 || contract.sync_level > 100) {
          return res.status(400).json({ error: 'Sync level must be between 0 and 100' });
        }
        const contractParams = [
          characterId, contract.contract_name, contract.creature_name, contract.creature_rank, contract.creature_spectrum,
          contract.creature_description, contract.creature_image, contract.gift, contract.sync_level, contract.unity_stage, JSON.stringify(contract.abilities)
        ];
        await db.run(contractSql, contractParams);
      }
    }

    res.status(201).json({ message: 'Character created successfully', characterId });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to create character:', error);
    res.status(500).json({ error: 'Не удалось создать персонажа', details: errorMessage });
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
    const { status, rank, faction, home_island } = req.query;

    let query = 'SELECT id, character_name, vk_id, status, rank, faction, faction_position FROM Characters';
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }
    if (rank) {
      whereClauses.push('rank = ?');
      params.push(rank);
    }
    if (faction) {
      whereClauses.push('faction = ?');
      params.push(faction);
    }
    if (home_island) {
      whereClauses.push('home_island = ?');
      params.push(home_island);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    const characters = await db.all(query, params);
    res.json(characters);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Не удалось получить персонажей', details: errorMessage });
  }
});
router.get('/characters/by-vk/:vk_id', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { vk_id } = req.params;
    const characters = await db.all('SELECT id, character_name, currency FROM Characters WHERE vk_id = ? AND status = ?', [vk_id, 'Принято']);
    res.json(characters);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching characters by vk_id:', error);
    res.status(500).json({ error: 'Не удалось получить персонажей по vk_id', details: errorMessage });
  }
});

router.get('/characters/my/:vk_id', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { vk_id } = req.params;
    const characters = await db.all('SELECT id, character_name, status FROM Characters WHERE vk_id = ?', [vk_id]);
    res.json(characters);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching my characters:', error);
    res.status(500).json({ error: 'Не удалось получить анкеты пользователя', details: errorMessage });
  }
});

router.get('/characters/:id/versions', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { id } = req.params;
    
    const versions = await db.all(
      'SELECT version_id, version_number, created_at, data FROM CharacterVersions WHERE character_id = ? ORDER BY version_number DESC',
      id
    );
    
    res.json(versions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to fetch character versions:', error);
    res.status(500).json({ error: 'Не удалось получить историю персонажа', details: errorMessage });
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

    // Парсим JSON поля
    character.archetypes = JSON.parse(character.archetypes || '[]');
    character.attributes = JSON.parse(character.attributes || '{}');
    character.aura_cells = JSON.parse(character.aura_cells || '{}');
    character.inventory = JSON.parse(character.inventory || '[]');
    character.character_images = JSON.parse(character.character_images || '[]');
    
    const contracts = await db.all('SELECT * FROM Contracts WHERE character_id = ?', id);
    contracts.forEach(contract => {
      contract.abilities = JSON.parse(contract.abilities || '[]');
    });

    res.json({ ...character, contracts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to fetch character ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось получить персонажа', details: errorMessage });
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
    const { contracts, ...characterFields } = req.body;

    // Пересчет очков атрибутов
    const attributeCosts: { [key: string]: number } = {
      "Дилетант": 1, "Новичок": 2, "Опытный": 4, "Эксперт": 7, "Мастер": 10
    };
    let spentPoints = 0;
    if (characterFields.attributes) {
        for (const level of Object.values(characterFields.attributes)) {
            spentPoints += attributeCosts[level as string] || 0;
        }
    }
    characterFields.attribute_points_spent = spentPoints;

    // Пересчет ячеек ауры
    if (contracts) {
        characterFields.aura_cells = calculateAuraCells(characterFields.rank, contracts);
    }

    // Удаляем поля, которые не должны обновляться напрямую
    delete characterFields.id;
    delete characterFields.vk_id;
    delete characterFields.created_at;
    delete characterFields.updated_at;

    const keys = Object.keys(characterFields);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const values = keys.map(key => {
      const value = characterFields[key];
      return typeof value === 'object' ? JSON.stringify(value) : value;
    });

    const sql = `UPDATE Characters SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = await db.run(sql, [...values, id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Обновление контрактов
    if (Array.isArray(contracts)) {
        await db.run('DELETE FROM Contracts WHERE character_id = ?', id);
        const contractSql = `
            INSERT INTO Contracts (character_id, contract_name, creature_name, creature_rank, creature_spectrum, creature_description, creature_image, gift, sync_level, unity_stage, abilities)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        for (const contract of contracts) {
            if (contract.sync_level < 0 || contract.sync_level > 100) {
              return res.status(400).json({ error: 'Sync level must be between 0 and 100' });
            }
            const contractParams = [
              id, contract.contract_name, contract.creature_name, contract.creature_rank, contract.creature_spectrum,
              contract.creature_description, contract.creature_image, contract.gift, contract.sync_level, contract.unity_stage, JSON.stringify(contract.abilities || [])
            ];
            await db.run(contractSql, contractParams);
        }
    }

    res.json({ message: 'Character updated successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to update character ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось обновить персонажа', details: errorMessage });
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
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const db = await initDB();
    const { id } = req.params;
    await db.run('DELETE FROM Contracts WHERE character_id = ?', id);
    const result = await db.run('DELETE FROM Characters WHERE id = ?', id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json({ message: 'Character and associated contracts deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to delete character ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось удалить персонажа', details: errorMessage });
  }
});

/**
 * @swagger
 * /api/characters/{id}/status:
 *   post:
 *     summary: Обновить статус персонажа
 *     security:
 *       - bearerAuth: []
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
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *     responses:
 *       200:
 *         description: Статус успешно обновлен.
 *       400:
 *         description: Неверный статус.
 *       403:
 *         description: Запрещено.
 *       404:
 *         description: Персонаж не найден.
 */
router.post('/characters/:id/status', async (req: Request, res: Response) => {
    const adminId = req.headers['x-admin-id'];
    if (adminId !== ADMIN_VK_ID) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Принято', 'Отклонено', 'на рассмотрении'].includes(status)) {
        return res.status(400).json({ error: 'Неверное значение статуса' });
    }

    try {
        const db = await initDB();
        const result = await db.run('UPDATE Characters SET status = ? WHERE id = ?', [status, id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }

        res.json({ message: `Character status updated to ${status}` });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`Failed to update character status for id ${req.params.id}:`, error);
        res.status(500).json({ error: 'Не удалось обновить статус персонажа', details: errorMessage });
    }
});

router.post('/characters/:id/life-status', async (req: Request, res: Response) => {
    const adminId = req.headers['x-admin-id'];
    if (adminId !== ADMIN_VK_ID) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { life_status } = req.body;

    if (!life_status || !['Жив', 'Мёртв'].includes(life_status)) {
        return res.status(400).json({ error: 'Неверное значение статуса жизни' });
    }

    try {
        const db = await initDB();
        const result = await db.run('UPDATE Characters SET life_status = ? WHERE id = ?', [life_status, id]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Character not found' });
        }

        res.json({ message: `Character life status updated to ${life_status}` });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error(`Failed to update character life status for id ${req.params.id}:`, error);
        res.status(500).json({ error: 'Не удалось обновить статус жизни персонажа', details: errorMessage });
    }
});
// Market Items CRUD

router.post('/characters/:id/ai-analysis', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { id } = req.params;
    const { result } = req.body;

    if (!result) {
      return res.status(400).json({ error: 'Result is required' });
    }

    const sql = `INSERT INTO ai_analysis (character_id, result) VALUES (?, ?)`;
    await db.run(sql, [id, result]);
    res.status(201).json({ message: 'AI analysis saved successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to save AI analysis for character ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось сохранить анализ ИИ', details: errorMessage });
  }
});

router.get('/characters/:id/ai-analysis', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { id } = req.params;
    const analyses = await db.all('SELECT * FROM ai_analysis WHERE character_id = ? ORDER BY timestamp DESC', id);
    res.json(analyses);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to fetch AI analyses for character ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось получить историю анализа ИИ', details: errorMessage });
  }
});

router.post('/market/items', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const db = await initDB();
    const { name, description, price, item_type, item_data, image_url, quantity } = req.body;
    const sql = `INSERT INTO MarketItems (name, description, price, item_type, item_data, image_url, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const result = await db.run(sql, [name, description, price, item_type, JSON.stringify(item_data), image_url, quantity]);
    res.status(201).json({ id: result.lastID });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to create market item:', error);
    res.status(500).json({ error: 'Не удалось создать предмет для рынка', details: errorMessage });
  }
});

router.get('/market/items', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const items = await db.all('SELECT * FROM MarketItems');
    items.forEach(item => {
      item.item_data = JSON.parse(item.item_data || '{}');
    });
    res.json(items);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to fetch market items:', error);
    res.status(500).json({ error: 'Не удалось получить предметы с рынка', details: errorMessage });
  }
});

router.put('/market/items/:id', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const db = await initDB();
    const { id } = req.params;
    const { name, description, price, item_type, item_data, image_url, quantity } = req.body;
    const sql = `UPDATE MarketItems SET name = ?, description = ?, price = ?, item_type = ?, item_data = ?, image_url = ?, quantity = ? WHERE id = ?`;
    await db.run(sql, [name, description, price, item_type, JSON.stringify(item_data), image_url, quantity, id]);
    res.json({ message: 'Market item updated successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to update market item ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось обновить предмет на рынке', details: errorMessage });
  }
});

router.post('/market/purchase', async (req: Request, res: Response) => {
  try {
    const { character_id, item_id } = req.body;
    const db = await initDB();

    // Получаем информацию о товаре и персонаже в одном запросе
    const item = await db.get('SELECT * FROM MarketItems WHERE id = ?', item_id);
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', character_id);

    if (!item || !character) {
      return res.status(404).json({ error: 'Item or character not found' });
    }

    if (character.currency < item.price) {
      return res.status(400).json({ error: 'Not enough currency' });
    }

    if (item.quantity <= 0) {
      return res.status(400).json({ error: 'Item out of stock' });
    }

    const newCurrency = character.currency - item.price;
    const newQuantity = item.quantity - 1;
    const inventory = JSON.parse(character.inventory || '[]');
    
    // Создаем новый предмет для инвентаря
    const itemData = JSON.parse(item.item_data || '{}');
    const newItem = {
        name: item.name,
        description: item.description,
        type: item.item_type,
        ...itemData
    };

    inventory.push(newItem);

    await db.run('UPDATE Characters SET currency = ?, inventory = ? WHERE id = ?', [newCurrency, JSON.stringify(inventory), character_id]);
    await db.run('UPDATE MarketItems SET quantity = ? WHERE id = ?', [newQuantity, item_id]);

    res.json({ message: 'Purchase successful' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Purchase failed:', error);
    res.status(500).json({ error: 'Не удалось совершить покупку', details: errorMessage });
  }
});

router.delete('/market/items/:id', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const db = await initDB();
    const { id } = req.params;
    await db.run('DELETE FROM MarketItems WHERE id = ?', id);
    res.json({ message: 'Market item deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to delete market item ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось удалить предмет с рынка', details: errorMessage });
  }
});

router.post('/market/sell', async (req: Request, res: Response) => {
  try {
    const { character_id, item_index, price } = req.body;
    if (character_id === undefined || item_index === undefined || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields: character_id, item_index, price' });
    }

    const db = await initDB();
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', character_id);

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    const inventory = JSON.parse(character.inventory || '[]');
    if (item_index < 0 || item_index >= inventory.length) {
      return res.status(400).json({ error: 'Invalid item index' });
    }

    const itemToSell = inventory.splice(item_index, 1)[0];

    await db.run('UPDATE Characters SET inventory = ? WHERE id = ?', [JSON.stringify(inventory), character_id]);

    const marketItemSql = `
      INSERT INTO MarketItems (name, description, price, item_type, item_data, image_url, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await db.run(marketItemSql, [
      itemToSell.name,
      itemToSell.description,
      price,
      itemToSell.type,
      JSON.stringify(itemToSell), // Сохраняем все данные о предмете
      itemToSell.image || null,
      1 // Всегда продаем по 1 штуке
    ]);

    res.json({ message: 'Item listed for sale successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to sell item:', error);
    res.status(500).json({ error: 'Не удалось выставить предмет на продажу', details: errorMessage });
  }
});

export default router;
