import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { initDB } from './database.js';

const getAttributePointsForRank = (rank: string): number => {
  switch (rank) {
    case 'F': return 10;
    case 'E': return 14;
    case 'D': return 16;
    case 'C': return 20;
    case 'B': return 30;
    case 'A': return 40;
    case 'S': return 50;
    case 'SS': return 60;
    case 'SSS': return 70;
    default: return 10;
  }
};

const router = Router();

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
 *         creature_images:
 *           type: array
 *           items:
 *             type: string
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
 *           type: object
 *           properties:
 *             text:
 *               type: string
 *             images:
 *               type: array
 *               items:
 *                 type: string
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
 *           description: JSON string representing the character's inventory.
 *         character_images:
 *           type: array
 *           items:
 *             type: string
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
  const rankCellMap: { [key: string]: { small: number | typeof Infinity; significant: number | typeof Infinity; ultimate: number } } = {
    'F': { small: 2, significant: 0, ultimate: 0 },
    'E': { small: 4, significant: 0, ultimate: 0 },
    'D': { small: 8, significant: 2, ultimate: 0 },
    'C': { small: 16, significant: 4, ultimate: 0 },
    'B': { small: 32, significant: 8, ultimate: 1 },
    'A': { small: Infinity, significant: 16, ultimate: 2 },
    'S': { small: Infinity, significant: Infinity, ultimate: 4 },
    'SS': { small: Infinity, significant: Infinity, ultimate: 8 },
    'SSS': { small: Infinity, significant: Infinity, ultimate: 16 },
  };

  const baseCells = rankCellMap[rank] || { small: 0, significant: 0, ultimate: 0 };

  const bonusCells = contracts.reduce(
    (acc, contract) => {
      const sync = contract.sync_level || 0;
      acc.small += Math.floor(sync / 10);
      acc.significant += Math.floor(sync / 25);
      acc.ultimate += Math.floor(sync / 100);
      return acc;
    },
    { small: 0, significant: 0, ultimate: 0 }
  );

  return {
    "Малые (I)": baseCells.small === Infinity ? Infinity : baseCells.small + bonusCells.small,
    "Значительные (II)": baseCells.significant === Infinity ? Infinity : baseCells.significant + bonusCells.significant,
    "Предельные (III)": baseCells.ultimate + bonusCells.ultimate,
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
        attribute_points_total, attribute_points_spent, aura_cells, inventory, currency, admin_note, life_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const characterParams = [
      character.vk_id, 'на рассмотрении', character.character_name, character.nickname, character.age,
      character.rank, character.faction, character.faction_position, character.home_island,
      (character.appearance?.text || ''), JSON.stringify(character.character_images || []), character.personality, character.biography,
      JSON.stringify(character.archetypes || []),
      JSON.stringify(character.attributes || {}),
      getAttributePointsForRank((character as any).rank), // attribute_points_total
      spentPoints, // attribute_points_spent
      JSON.stringify(auraCells),
      JSON.stringify(character.inventory || []),
      character.currency,
      character.admin_note,
      character.life_status || 'Жив'
    ];

    const result = await db.run(characterSql, characterParams);
    const characterId = result.lastID;

    if (!characterId) {
      throw new Error('Failed to create character');
    }

    // Вставляем контракты, связанные с персонажем
    if (contracts.length > 0) {
      const contractSql = `
        INSERT INTO Contracts (character_id, contract_name, creature_name, creature_rank, creature_spectrum, creature_description, creature_images, gift, sync_level, unity_stage, abilities, manifestation, dominion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const contract of contracts) {
        if (contract.sync_level < 0 || contract.sync_level > 100) {
          return res.status(400).json({ error: 'Sync level must be between 0 and 100' });
        }
        const contractParams = [
          characterId, contract.contract_name, contract.creature_name, contract.creature_rank, contract.creature_spectrum,
          contract.creature_description, JSON.stringify(contract.creature_images || []), contract.gift, contract.sync_level, contract.unity_stage, JSON.stringify(contract.abilities),
          JSON.stringify(contract.manifestation), JSON.stringify(contract.dominion)
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

router.get('/my-anketas/:vk_id', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { vk_id } = req.params;
    
    const characters = await db.all('SELECT * FROM Characters WHERE vk_id = ?', [vk_id]);

    if (!characters || characters.length === 0) {
      return res.json([]);
    }

    const fullAnketas = await Promise.all(characters.map(async (character) => {
      character.archetypes = JSON.parse(character.archetypes || '[]');
      character.attributes = JSON.parse(character.attributes || '{}');
      character.aura_cells = JSON.parse(character.aura_cells || '{}');
      character.inventory = JSON.parse(character.inventory || '[]');
      character.character_images = JSON.parse(character.character_images || '[]');

      const contracts = await db.all('SELECT * FROM Contracts WHERE character_id = ?', character.id);
      contracts.forEach(contract => {
        contract.abilities = JSON.parse(contract.abilities || '[]');
        contract.creature_images = JSON.parse(contract.creature_images || '[]');
        contract.manifestation = JSON.parse(contract.manifestation || 'null');
        contract.dominion = JSON.parse(contract.dominion || 'null');
      });

      return { ...character, contracts };
    }));

    res.json(fullAnketas);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching my anketas:', error);
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
    
    res.json(versions.map(v => ({...v, data: JSON.parse(v.data)})));
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
      contract.creature_images = JSON.parse(contract.creature_images || '[]');
      contract.manifestation = JSON.parse(contract.manifestation || 'null');
      contract.dominion = JSON.parse(contract.dominion || 'null');
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
  const userVkId = req.headers['x-user-vk-id'];
  
  // Проверяем, является ли пользователь админом или владельцем анкеты
  if (adminId !== ADMIN_VK_ID) {
    if (!userVkId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Проверяем, принадлежит ли анкета пользователю
    try {
      const db = await initDB();
      const character = await db.get('SELECT vk_id FROM Characters WHERE id = ?', [req.params.id]);
      if (!character || character.vk_id !== parseInt(userVkId as string)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Database error' });
    }
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
    
    // Если в запросе не передано новое значение, не перезаписываем его из ранга
    if (characterFields.attribute_points_total === undefined) {
      delete characterFields.attribute_points_total;
    }

    // Пересчет ячеек ауры, только если переданы контракты
    if (contracts) {
        characterFields.aura_cells = calculateAuraCells(characterFields.rank, contracts);
    } else if (characterFields.aura_cells === undefined) {
      // Если ячейки не переданы в запросе, не трогаем их
      delete characterFields.aura_cells;
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
      let value = characterFields[key];
      // Специальная обработка для поля appearance
      if (key === 'appearance' && typeof value === 'object' && value !== null && 'text' in value) {
        // Если text содержит JSON строку, парсим её
        if (typeof (value as any).text === 'string' && (value as any).text.startsWith('{')) {
          try {
            const parsedAppearance = JSON.parse((value as any).text);
            value = parsedAppearance.text || '';
          } catch (e) {
            value = (value as any).text;
          }
        } else {
          value = (value as any).text;
        }
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      return value;
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
            INSERT INTO Contracts (character_id, contract_name, creature_name, creature_rank, creature_spectrum, creature_description, creature_images, gift, sync_level, unity_stage, abilities, manifestation, dominion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        for (const contract of contracts) {
            if (contract.sync_level < 0 || contract.sync_level > 100) {
              return res.status(400).json({ error: 'Sync level must be between 0 and 100' });
            }
            const contractParams = [
              id, contract.contract_name, contract.creature_name, contract.creature_rank, contract.creature_spectrum,
              contract.creature_description, JSON.stringify(contract.creature_images || []), contract.gift, contract.sync_level, contract.unity_stage, JSON.stringify(contract.abilities || []),
              JSON.stringify(contract.manifestation), JSON.stringify(contract.dominion)
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
    const result = await db.run(sql, [name, description, price, item_type, JSON.stringify(item_data), JSON.stringify(image_url || []), quantity]);
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
    const { item_type, sinki_type, rank } = req.query;

    let query = 'SELECT * FROM MarketItems';
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (item_type) {
      whereClauses.push('item_type = ?');
      params.push(item_type);
    }
    if (sinki_type) {
      whereClauses.push("json_extract(item_data, '$.sinki_type') = ?");
      params.push(sinki_type);
    }
    if (rank) {
      whereClauses.push("json_extract(item_data, '$.rank') = ?");
      params.push(rank);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    const items = await db.all(query, params);
    items.forEach(item => {
      item.item_data = JSON.parse(item.item_data || '{}');
      item.image_url = JSON.parse(item.image_url || '[]');
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
    await db.run(sql, [name, description, price, item_type, JSON.stringify(item_data), JSON.stringify(image_url || []), quantity, id]);
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
        ...itemData,
        image_url: JSON.parse(item.image_url || '[]')
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
      INSERT INTO MarketItems (name, description, price, item_type, item_data, image_url, quantity, seller_character_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.run(marketItemSql, [
      itemToSell.name,
      itemToSell.description,
      price,
      itemToSell.type,
      JSON.stringify(itemToSell), // Сохраняем все данные о предмете
      JSON.stringify(itemToSell.image_url || []),
      1, // Всегда продаем по 1 штуке
      character_id
    ]);

    res.json({ message: 'Item listed for sale successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to sell item:', error);
    res.status(500).json({ error: 'Не удалось выставить предмет на продажу', details: errorMessage });
  }
});

router.delete('/market/my-items/:itemId', async (req: Request, res: Response) => {
  const userVkId = req.headers['x-user-vk-id'];
  if (!userVkId) {
    return res.status(403).json({ error: 'Forbidden: User VK ID is required' });
  }

  try {
    const db = await initDB();
    const { itemId } = req.params;
    const vkId = parseInt(userVkId as string, 10);

    const item = await db.get('SELECT * FROM MarketItems WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Предмет не найден на рынке' });
    }
    
    // Проверяем, что персонаж, выставивший товар, принадлежит текущему пользователю
    const sellerCharacter = await db.get('SELECT * FROM Characters WHERE id = ?', [item.seller_character_id]);
    if (!sellerCharacter || sellerCharacter.vk_id !== vkId) {
      return res.status(403).json({ error: 'Вы не можете снять этот товар с продажи' });
    }

    // Возвращаем предмет в инвентарь
    const inventory = JSON.parse(sellerCharacter.inventory || '[]');
    const returnedItem = {
      name: item.name,
      description: item.description,
      type: item.item_type,
      ...JSON.parse(item.item_data || '{}'),
      image_url: JSON.parse(item.image_url || '[]')
    };
    inventory.push(returnedItem);

    await db.run('UPDATE Characters SET inventory = ? WHERE id = ?', [JSON.stringify(inventory), item.seller_character_id]);
    
    // Удаляем предмет с рынка
    await db.run('DELETE FROM MarketItems WHERE id = ?', [itemId]);

    res.json({ message: 'Предмет успешно снят с продажи и возвращен в инвентарь' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to delist item:', error);
    res.status(500).json({ error: 'Не удалось снять предмет с продажи', details: errorMessage });
  }
});

//** Character Updates **//

// POST /api/characters/:id/updates - Создать запрос на изменение
router.post('/characters/:id/updates', async (req: Request, res: Response) => {
  const userVkId = req.headers['x-user-vk-id'];
  
  // Проверяем, принадлежит ли анкета пользователю
  if (userVkId) {
    try {
      const db = await initDB();
      const character = await db.get('SELECT vk_id FROM Characters WHERE id = ?', [req.params.id]);
      if (!character || character.vk_id !== parseInt(userVkId as string)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Database error' });
    }
  }
  
  try {
    const db = await initDB();
    const { id } = req.params;
    const { updated_data } = req.body;

    if (!updated_data) {
      return res.status(400).json({ error: 'updated_data is required' });
    }

    const sql = `INSERT INTO CharacterUpdates (character_id, updated_data) VALUES (?, ?)`;
    const result = await db.run(sql, [id, JSON.stringify(updated_data)]);

    res.status(201).json({ message: 'Update request created successfully', updateId: result.lastID });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to create update request for character ${req.params.id}:`, error);
    res.status(500).json({ error: 'Не удалось создать запрос на изменение', details: errorMessage });
  }
});

// GET /api/updates - Получить список всех ожидающих изменений
router.get('/updates', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const updates = await db.all(`
      SELECT u.id, u.character_id, u.status, u.created_at, c.character_name
      FROM CharacterUpdates u
      JOIN Characters c ON u.character_id = c.id
      WHERE u.status = 'pending'
    `);
    res.json(updates);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to fetch updates:', error);
    res.status(500).json({ error: 'Не удалось получить список изменений', details: errorMessage });
  }
});

// GET /api/updates/:update_id - Получить детали одного изменения и оригинальные данные
router.get('/updates/:update_id', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { update_id } = req.params;

    const update = await db.get('SELECT * FROM CharacterUpdates WHERE id = ?', update_id);
    if (!update) {
      return res.status(404).json({ error: 'Update request not found' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', update.character_id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found for this update' });
    }
    
    // Парсим JSON поля, чтобы фронтенду было удобнее
    update.updated_data = JSON.parse(update.updated_data || '{}');
    character.archetypes = JSON.parse(character.archetypes || '[]');
    character.attributes = JSON.parse(character.attributes || '{}');
    character.aura_cells = JSON.parse(character.aura_cells || '{}');
    character.inventory = JSON.parse(character.inventory || '[]');
    character.character_images = JSON.parse(character.character_images || '[]');

    res.json({ update, original_character: character });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to fetch update request ${req.params.update_id}:`, error);
    res.status(500).json({ error: 'Не удалось получить детали изменения', details: errorMessage });
  }
});

// POST /api/updates/:update_id/approve - Одобрить изменение
router.post('/updates/:update_id/approve', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
      return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const db = await initDB();
    const { update_id } = req.params;

    const update = await db.get('SELECT * FROM CharacterUpdates WHERE id = ?', update_id);
    if (!update) {
      return res.status(404).json({ error: 'Update request not found' });
    }

    const updatedData = JSON.parse(update.updated_data);
    const { contracts, ...characterFields } = updatedData;

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
    
    // Если в запросе не передано новое значение, не перезаписываем его из ранга
    if (characterFields.attribute_points_total === undefined) {
      delete characterFields.attribute_points_total;
    }

    // Пересчет ячеек ауры, только если переданы контракты
    if (contracts) {
        characterFields.aura_cells = calculateAuraCells(characterFields.rank, contracts);
    } else if (characterFields.aura_cells === undefined) {
      // Если ячейки не переданы в запросе, не трогаем их
      delete characterFields.aura_cells;
    }


    // Удаляем поля, которые не должны обновляться напрямую
    delete characterFields.id;
    delete characterFields.vk_id;
    delete characterFields.created_at;
    delete characterFields.updated_at;

    const keys = Object.keys(characterFields);
    if (keys.length > 0) {
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const values = keys.map(key => {
        let value = characterFields[key];
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        return value;
      });

      const sql = `UPDATE Characters SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      await db.run(sql, [...values, update.character_id]);
    }
    
    // Обновление контрактов, если они есть
    if (Array.isArray(contracts)) {
        await db.run('DELETE FROM Contracts WHERE character_id = ?', update.character_id);
        const contractSql = `
            INSERT INTO Contracts (character_id, contract_name, creature_name, creature_rank, creature_spectrum, creature_description, creature_images, gift, sync_level, unity_stage, abilities, manifestation, dominion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        for (const contract of contracts) {
            const contractParams = [
              update.character_id, contract.contract_name, contract.creature_name, contract.creature_rank, contract.creature_spectrum,
              contract.creature_description, JSON.stringify(contract.creature_images || []), contract.gift, contract.sync_level, contract.unity_stage, JSON.stringify(contract.abilities || []),
              JSON.stringify(contract.manifestation), JSON.stringify(contract.dominion)
            ];
            await db.run(contractSql, contractParams);
        }
    }

    await db.run("UPDATE CharacterUpdates SET status = 'approved' WHERE id = ?", update_id);

    res.json({ message: 'Update request approved and character updated' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to approve update request ${req.params.update_id}:`, error);
    res.status(500).json({ error: 'Не удалось одобрить изменение', details: errorMessage });
  }
});

// POST /api/updates/:update_id/reject - Отклонить изменение
router.post('/updates/:update_id/reject', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
      return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const db = await initDB();
    const { update_id } = req.params;

    const result = await db.run("UPDATE CharacterUpdates SET status = 'rejected' WHERE id = ?", update_id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Update request not found' });
    }

    res.json({ message: 'Update request rejected' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Failed to reject update request ${req.params.update_id}:`, error);
    res.status(500).json({ error: 'Не удалось отклонить изменение', details: errorMessage });
  }
});

// ==================== ACTIVITY REQUESTS ====================

// GET /api/activity-requests - Получить все заявки на активности (для админов)
router.get('/activity-requests', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const requests = await db.all(`
      SELECT ar.*, c.character_name, c.nickname, c.vk_id as character_vk_id
      FROM ActivityRequests ar
      JOIN Characters c ON ar.character_id = c.id
      ORDER BY ar.created_at DESC
    `);
    
    const requestsWithTeamNames = await Promise.all(requests.map(async (request) => {
      if (request.team_members && request.team_members.length > 2) { // '[]'
        try {
          const teamIds = JSON.parse(request.team_members);
          if (Array.isArray(teamIds) && teamIds.length > 0) {
            const placeholders = teamIds.map(() => '?').join(',');
            const teamCharacters = await db.all(
              `SELECT id, character_name, nickname FROM Characters WHERE id IN (${placeholders})`,
              teamIds
            );
            return { ...request, team_members_details: teamCharacters };
          }
        } catch (e) {
          console.error('Error parsing team members JSON or fetching names:', e);
        }
      }
      return { ...request, team_members_details: [] };
    }));

    res.json(requestsWithTeamNames);
  } catch (error) {
    console.error('Failed to fetch activity requests:', error);
    res.status(500).json({ error: 'Не удалось получить заявки на активности' });
  }
});

// GET /api/activity-requests/user/:vk_id - Получить заявки пользователя
router.get('/activity-requests/user/:vk_id', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { vk_id } = req.params;
    
    const requests = await db.all(`
      SELECT ar.*, c.character_name, c.nickname
      FROM ActivityRequests ar
      JOIN Characters c ON ar.character_id = c.id
      WHERE ar.vk_id = ?
      ORDER BY ar.created_at DESC
    `, [vk_id]);
    
    res.json(requests);
  } catch (error) {
    console.error('Failed to fetch user activity requests:', error);
    res.status(500).json({ error: 'Не удалось получить заявки пользователя' });
  }
});

// POST /api/activity-requests - Создать заявку на активность
router.post('/activity-requests', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const { 
      character_id, 
      vk_id, 
      request_type, 
      quest_rank, 
      gate_rank, 
      character_rank, 
      faction, 
      team_members, 
      rank_promotion 
    } = req.body;

    // Валидация
    if (!character_id || !vk_id || !request_type || !character_rank || !faction) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    if (request_type === 'quest' && !quest_rank) {
      return res.status(400).json({ error: 'Для квеста необходимо указать ранг квеста' });
    }

    if (request_type === 'gate' && !gate_rank) {
      return res.status(400).json({ error: 'Для врат необходимо указать ранг врат' });
    }

    // Проверяем, что персонаж принадлежит пользователю
    const character = await db.get('SELECT vk_id FROM Characters WHERE id = ?', [character_id]);
    if (!character || character.vk_id !== vk_id) {
      return res.status(403).json({ error: 'Персонаж не принадлежит пользователю' });
    }

    const result = await db.run(`
      INSERT INTO ActivityRequests (
        character_id, vk_id, request_type, quest_rank, gate_rank, 
        character_rank, faction, team_members, rank_promotion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      character_id, vk_id, request_type, quest_rank, gate_rank,
      character_rank, faction, JSON.stringify(team_members || []), rank_promotion
    ]);

    res.status(201).json({ 
      id: result.lastID, 
      message: 'Заявка на активность создана' 
    });
  } catch (error) {
    console.error('Failed to create activity request:', error);
    res.status(500).json({ error: 'Не удалось создать заявку на активность' });
  }
});

// PUT /api/activity-requests/:id - Обновить заявку на активность (для админов)
router.put('/activity-requests/:id', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const db = await initDB();
    const { id } = req.params;
    const { status, reward, admin_notes } = req.body;

    const result = await db.run(`
      UPDATE ActivityRequests 
      SET status = ?, reward = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, reward, admin_notes, id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    res.json({ message: 'Заявка обновлена' });
  } catch (error) {
    console.error('Failed to update activity request:', error);
    res.status(500).json({ error: 'Не удалось обновить заявку' });
  }
});

// DELETE /api/activity-requests/:id - Удалить заявку на активность (для админов)
router.delete('/activity-requests/:id', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const db = await initDB();
    const { id } = req.params;

    const result = await db.run('DELETE FROM ActivityRequests WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    res.json({ message: 'Заявка удалена' });
  } catch (error) {
    console.error('Failed to delete activity request:', error);
    res.status(500).json({ error: 'Не удалось удалить заявку' });
  }
});

// GET /api/characters/accepted - Получить список принятых персонажей для выбора команды
router.get('/characters/accepted', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const characters = await db.all(`
      SELECT id, character_name, nickname, rank, faction, vk_id
      FROM Characters 
      WHERE status = 'Принято' AND life_status = 'Жив'
      ORDER BY character_name
    `);
    
    res.json(characters);
  } catch (error) {
    console.error('Failed to fetch accepted characters:', error);
    res.status(500).json({ error: 'Не удалось получить список персонажей' });
  }
});

// ==================== EVENTS API ====================

// GET /api/events - Получить список ивентов
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { status, event_type, difficulty } = req.query;
    const db = await initDB();
    
    let query = `
      SELECT e.*, 
             COUNT(ep.id) as participant_count
      FROM Events e
      LEFT JOIN EventParticipants ep ON e.id = ep.event_id AND ep.status = 'approved'
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    if (event_type) {
      query += ' AND e.event_type = ?';
      params.push(event_type);
    }
    if (difficulty) {
      query += ' AND e.difficulty = ?';
      params.push(difficulty);
    }

    query += ' GROUP BY e.id ORDER BY e.created_at DESC';

    const events = await db.all(query, params);
    res.json(events);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ error: 'Не удалось получить список ивентов' });
  }
});

// GET /api/events/:id - Получить детали ивента
router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    const event = await db.get(`
      SELECT e.*, 
             COUNT(ep.id) as participant_count
      FROM Events e
      LEFT JOIN EventParticipants ep ON e.id = ep.event_id AND ep.status = 'approved'
      WHERE e.id = ?
      GROUP BY e.id
    `, [id]);

    if (!event) {
      return res.status(404).json({ error: 'Ивент не найден' });
    }

    const participants = await db.all(`
      SELECT ep.*, c.character_name, c.nickname, c.rank, c.faction
      FROM EventParticipants ep
      JOIN Characters c ON ep.character_id = c.id
      WHERE ep.event_id = ?
      ORDER BY ep.joined_at DESC
    `, [id]);

    res.json({ ...event, participants });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    res.status(500).json({ error: 'Не удалось получить ивент' });
  }
});

// POST /api/events - Создать новый ивент
router.post('/events', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      event_type,
      difficulty,
      recommended_rank,
      max_participants,
      min_participants = 1,
      is_deadly = false,
      is_open_world = false,
      rewards = {},
      requirements = {},
      location,
      location_description,
      start_date,
      end_date,
      application_deadline,
      organizer_vk_id,
      organizer_name,
      additional_info,
      event_data = {}
    } = req.body;

    const db = await initDB();
    const result = await db.run(`
      INSERT INTO Events (
        title, description, event_type, difficulty, recommended_rank,
        max_participants, min_participants, is_deadly, is_open_world,
        rewards, requirements, location, location_description,
        start_date, end_date, application_deadline, organizer_vk_id,
        organizer_name, additional_info, event_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title, description, event_type, difficulty, recommended_rank,
      max_participants, min_participants, is_deadly ? 1 : 0, is_open_world ? 1 : 0,
      JSON.stringify(rewards), JSON.stringify(requirements), location, location_description,
      start_date, end_date, application_deadline, organizer_vk_id,
      organizer_name, additional_info, JSON.stringify(event_data)
    ]);

    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error('Failed to create event:', error);
    res.status(500).json({ error: 'Не удалось создать ивент' });
  }
});

// PUT /api/events/:id - Обновить ивент
router.put('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      event_type,
      difficulty,
      recommended_rank,
      max_participants,
      min_participants,
      is_deadly,
      is_open_world,
      rewards,
      requirements,
      location,
      location_description,
      start_date,
      end_date,
      application_deadline,
      additional_info,
      event_data,
      status
    } = req.body;

    const db = await initDB();
    
    const updateFields = [];
    const params: any[] = [];

    if (title !== undefined) { updateFields.push('title = ?'); params.push(title); }
    if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
    if (event_type !== undefined) { updateFields.push('event_type = ?'); params.push(event_type); }
    if (difficulty !== undefined) { updateFields.push('difficulty = ?'); params.push(difficulty); }
    if (recommended_rank !== undefined) { updateFields.push('recommended_rank = ?'); params.push(recommended_rank); }
    if (max_participants !== undefined) { updateFields.push('max_participants = ?'); params.push(max_participants); }
    if (min_participants !== undefined) { updateFields.push('min_participants = ?'); params.push(min_participants); }
    if (is_deadly !== undefined) { updateFields.push('is_deadly = ?'); params.push(is_deadly ? 1 : 0); }
    if (is_open_world !== undefined) { updateFields.push('is_open_world = ?'); params.push(is_open_world ? 1 : 0); }
    if (rewards !== undefined) { updateFields.push('rewards = ?'); params.push(JSON.stringify(rewards)); }
    if (requirements !== undefined) { updateFields.push('requirements = ?'); params.push(JSON.stringify(requirements)); }
    if (location !== undefined) { updateFields.push('location = ?'); params.push(location); }
    if (location_description !== undefined) { updateFields.push('location_description = ?'); params.push(location_description); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); params.push(start_date); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); params.push(end_date); }
    if (application_deadline !== undefined) { updateFields.push('application_deadline = ?'); params.push(application_deadline); }
    if (additional_info !== undefined) { updateFields.push('additional_info = ?'); params.push(additional_info); }
    if (event_data !== undefined) { updateFields.push('event_data = ?'); params.push(JSON.stringify(event_data)); }
    if (status !== undefined) { updateFields.push('status = ?'); params.push(status); }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await db.run(`
      UPDATE Events 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, params);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update event:', error);
    res.status(500).json({ error: 'Не удалось обновить ивент' });
  }
});

// DELETE /api/events/:id - Удалить ивент
router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    await db.run('DELETE FROM Events WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event:', error);
    res.status(500).json({ error: 'Не удалось удалить ивент' });
  }
});

// POST /api/events/:id/participants - Подать заявку на участие в ивенте
router.post('/events/:id/participants', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { character_id, vk_id, character_name, character_rank, faction, application_data = {} } = req.body;

    const db = await initDB();
    
    // Check if already applied
    const existing = await db.get(`
      SELECT id FROM EventParticipants 
      WHERE event_id = ? AND character_id = ?
    `, [id, character_id]);

    if (existing) {
      return res.status(400).json({ error: 'Уже подана заявка на этот ивент' });
    }

    const result = await db.run(`
      INSERT INTO EventParticipants (
        event_id, character_id, vk_id, character_name, 
        character_rank, faction, application_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, character_id, vk_id, character_name, character_rank, faction, JSON.stringify(application_data)]);

    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error('Failed to apply to event:', error);
    res.status(500).json({ error: 'Не удалось подать заявку на ивент' });
  }
});

// PUT /api/events/:id/participants/:participant_id - Обновить статус участника
router.put('/events/:id/participants/:participant_id', async (req: Request, res: Response) => {
  try {
    const { id, participant_id } = req.params;
    const { status } = req.body;

    const db = await initDB();
    await db.run(`
      UPDATE EventParticipants 
      SET status = ?
      WHERE id = ? AND event_id = ?
    `, [status, participant_id, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update participant status:', error);
    res.status(500).json({ error: 'Не удалось обновить статус участника' });
  }
});

// DELETE /api/events/:id/participants/:participant_id - Удалить участника
router.delete('/events/:id/participants/:participant_id', async (req: Request, res: Response) => {
  try {
    const { id, participant_id } = req.params;
    const db = await initDB();
    await db.run(`
      DELETE FROM EventParticipants 
      WHERE id = ? AND event_id = ?
    `, [participant_id, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove participant:', error);
    res.status(500).json({ error: 'Не удалось удалить участника' });
  }
});

// ==================== MARKET API ====================

// GET /api/market/stocks - Получить список всех акций
router.get('/market/stocks', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const stocks = await db.all('SELECT id, name, ticker_symbol, description, current_price, exchange, base_trend FROM Stocks ORDER BY exchange, name');

    const stocksWithHistory = await Promise.all(stocks.map(async (stock) => {
      const history = await db.all('SELECT price, timestamp FROM StockPriceHistory WHERE stock_id = ? ORDER BY timestamp DESC LIMIT 30', [stock.id]);
      return { ...stock, history };
    }));

    res.json(stocksWithHistory);
  } catch (error) {
    console.error('Failed to fetch stocks:', error);
    res.status(500).json({ error: 'Не удалось получить список акций' });
  }
});

// GET /api/market/stocks/:ticker - Получить детали акции и историю цен
router.get('/market/stocks/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const db = await initDB();
    const stock = await db.get('SELECT * FROM Stocks WHERE ticker_symbol = ?', [ticker]);

    if (!stock) {
      return res.status(404).json({ error: 'Акция не найдена' });
    }

    const history = await db.all('SELECT price, timestamp FROM StockPriceHistory WHERE stock_id = ? ORDER BY timestamp DESC LIMIT 100', [stock.id]);
    res.json({ ...stock, history });
  } catch (error) {
    console.error('Failed to fetch stock details:', error);
    res.status(500).json({ error: 'Не удалось получить детали акции' });
  }
});

// GET /api/market/portfolio/:character_id - Получить портфолио персонажа
router.get('/market/portfolio/:character_id', async (req: Request, res: Response) => {
  try {
    const { character_id } = req.params;
    const db = await initDB();
    
    let portfolio = await db.get('SELECT * FROM Portfolios WHERE character_id = ?', [character_id]);
    const character = await db.get('SELECT currency FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }
    
    if (!portfolio) {
      // Создаем портфолио, если его нет
      const result = await db.run('INSERT INTO Portfolios (character_id, cash_balance) VALUES (?, ?)', [character_id, character.currency || 0]);
      portfolio = { id: result.lastID, character_id, cash_balance: character.currency || 0 };
    } else {
      // Синхронизируем валюту с персонажем
      if (portfolio.cash_balance !== character.currency) {
        await db.run('UPDATE Portfolios SET cash_balance = ? WHERE id = ?', [character.currency || 0, portfolio.id]);
        portfolio.cash_balance = character.currency || 0;
      }
    }

    const assets = await db.all(`
      SELECT s.name, s.ticker_symbol, s.current_price, pa.quantity, pa.average_purchase_price
      FROM PortfolioAssets pa
      JOIN Stocks s ON pa.stock_id = s.id
      WHERE pa.portfolio_id = ?
    `, [portfolio.id])

    res.json({ ...portfolio, assets });
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
    res.status(500).json({ error: 'Не удалось получить портфолио' });
  }
});

// POST /api/market/trade - Совершить сделку
router.post('/market/trade', async (req: Request, res: Response) => {
  const { character_id, ticker_symbol, quantity, trade_type } = req.body; // trade_type: 'buy' or 'sell'
  if (!character_id || !ticker_symbol || !quantity || !trade_type || quantity <= 0) {
    return res.status(400).json({ error: 'Неверные параметры для сделки' });
  }
  const db = await initDB();
  try {
    await db.run('BEGIN TRANSACTION');

    const stock = await db.get('SELECT * FROM Stocks WHERE ticker_symbol = ?', [ticker_symbol]);
    if (!stock) {
      await db.run('ROLLBACK');
      return res.status(404).json({ error: 'Акция не найдена' });
    }

    let portfolio = await db.get('SELECT * FROM Portfolios WHERE character_id = ?', [character_id]);
    const character = await db.get('SELECT currency FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      await db.run('ROLLBACK');
      return res.status(404).json({ error: 'Персонаж не найден' });
    }
    
    if (!portfolio) {
      // Создаем портфолио, если его нет
      const result = await db.run('INSERT INTO Portfolios (character_id, cash_balance) VALUES (?, ?)', [character_id, character.currency || 0]);
      portfolio = { id: result.lastID, character_id, cash_balance: character.currency || 0 };
    } else {
      // Синхронизируем валюту с персонажем
      if (portfolio.cash_balance !== character.currency) {
        await db.run('UPDATE Portfolios SET cash_balance = ? WHERE id = ?', [character.currency || 0, portfolio.id]);
        portfolio.cash_balance = character.currency || 0;
      }
    }

    const total_cost = stock.current_price * quantity;

    if (trade_type === 'buy') {
      if (character.currency < total_cost) {
        await db.run('ROLLBACK');
        return res.status(400).json({ error: 'Недостаточно средств' });
      }

      const new_balance = character.currency - total_cost;
      await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [new_balance, character_id]);
      await db.run('UPDATE Portfolios SET cash_balance = ? WHERE id = ?', [new_balance, portfolio.id]);

      const existing_asset = await db.get('SELECT * FROM PortfolioAssets WHERE portfolio_id = ? AND stock_id = ?', [portfolio.id, stock.id]);
      if (existing_asset) {
        const new_quantity = existing_asset.quantity + quantity;
        const new_avg_price = ((existing_asset.average_purchase_price * existing_asset.quantity) + total_cost) / new_quantity;
        await db.run('UPDATE PortfolioAssets SET quantity = ?, average_purchase_price = ? WHERE id = ?', [new_quantity, new_avg_price, existing_asset.id]);
      } else {
        await db.run('INSERT INTO PortfolioAssets (portfolio_id, stock_id, quantity, average_purchase_price) VALUES (?, ?, ?, ?)', [portfolio.id, stock.id, quantity, stock.current_price]);
      }

    } else if (trade_type === 'sell') {
      const existing_asset = await db.get('SELECT * FROM PortfolioAssets WHERE portfolio_id = ? AND stock_id = ?', [portfolio.id, stock.id]);
      if (!existing_asset || existing_asset.quantity < quantity) {
        await db.run('ROLLBACK');
        return res.status(400).json({ error: 'Недостаточно акций для продажи' });
      }

      const new_balance = character.currency + total_cost;
      await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [new_balance, character_id]);
      await db.run('UPDATE Portfolios SET cash_balance = ? WHERE id = ?', [new_balance, portfolio.id]);

      const new_quantity = existing_asset.quantity - quantity;
      if (new_quantity > 0) {
        await db.run('UPDATE PortfolioAssets SET quantity = ? WHERE id = ?', [new_quantity, existing_asset.id]);
      } else {
        await db.run('DELETE FROM PortfolioAssets WHERE id = ?', [existing_asset.id]);
      }
    } else {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Неверный тип сделки' });
    }

    await db.run('COMMIT');
    res.json({ message: 'Сделка совершена успешно' });

  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Trade failed:', error);
    res.status(500).json({ error: 'Не удалось совершить сделку' });
  }
});

// PUT /api/market/admin/stocks/:ticker - Обновить базовый тренд акции
router.put('/market/admin/stocks/:ticker', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { ticker } = req.params;
    const { base_trend } = req.body;
    const db = await initDB();
    const result = await db.run('UPDATE Stocks SET base_trend = ? WHERE ticker_symbol = ?', [base_trend, ticker]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Акция не найдена' });
    }
    res.json({ message: 'Базовый тренд обновлен' });
  } catch (error) {
    console.error('Failed to update stock trend:', error);
    res.status(500).json({ error: 'Не удалось обновить тренд' });
  }
});

// POST /api/market/admin/events - Создать рыночное событие
router.post('/market/admin/events', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { title, description, impacted_stock_id, impact_strength, duration_hours } = req.body;
    const db = await initDB();

    const start_time = new Date();
    const end_time = new Date(start_time.getTime() + duration_hours * 60 * 60 * 1000);

    const result = await db.run(`
      INSERT INTO MarketEvents (title, description, impacted_stock_id, impact_strength, start_time, end_time, created_by_admin_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, description, impacted_stock_id, impact_strength, start_time.toISOString(), end_time.toISOString(), adminId]);
    
    res.status(201).json({ id: result.lastID, message: 'Рыночное событие создано' });
  } catch (error) {
    console.error('Failed to create market event:', error);
    res.status(500).json({ error: 'Не удалось создать событие' });
  }
});

// GET /api/market/events - Получить список рыночных событий
router.get('/market/events', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const events = await db.all(`
      SELECT 
        me.id,
        me.title,
        me.description,
        me.impact_strength,
        me.start_time,
        me.end_time,
        s.name as impacted_stock_name,
        s.ticker_symbol as impacted_stock_ticker
      FROM MarketEvents me
      LEFT JOIN Stocks s ON me.impacted_stock_id = s.id
      ORDER BY me.start_time DESC
      LIMIT 20
    `);
    res.json(events);
  } catch (error) {
    console.error('Failed to fetch market events:', error);
    res.status(500).json({ error: 'Не удалось получить список рыночных событий' });
  }
});

// GET /api/market/leaderboard - Получить рейтинг трейдеров
router.get('/market/leaderboard', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const leaderboardData = await db.all(`
      SELECT
        c.id as character_id,
        c.character_name,
        c.currency as cash_balance,
        (IFNULL(c.currency, 0) + IFNULL(SUM(pa.quantity * s.current_price), 0)) as total_value,
        (
          SELECT json_group_array(
              json_object(
                  'name', s_inner.name,
                  'ticker', s_inner.ticker_symbol,
                  'quantity', pa_inner.quantity,
                  'value', pa_inner.quantity * s_inner.current_price,
                  'average_purchase_price', pa_inner.average_purchase_price
              )
          )
          FROM PortfolioAssets pa_inner
          JOIN Stocks s_inner ON pa_inner.stock_id = s_inner.id
          LEFT JOIN Portfolios p_inner ON pa_inner.portfolio_id = p_inner.id
          WHERE p_inner.character_id = c.id
        ) as assets
      FROM Characters c
      LEFT JOIN Portfolios p ON c.id = p.character_id
      LEFT JOIN PortfolioAssets pa ON p.id = pa.portfolio_id
      LEFT JOIN Stocks s ON pa.stock_id = s.id
      WHERE c.status = 'Принято'
      GROUP BY c.id, c.character_name, c.currency
      ORDER BY total_value DESC
      LIMIT 20
    `);

    const leaderboard = leaderboardData.map(entry => ({
      ...entry,
      assets: entry.assets ? JSON.parse(entry.assets) : []
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ error: 'Не удалось получить рейтинг трейдеров' });
  }
});

// ==================== CASINO API ====================

// POST /api/casino/blackjack - Играть в блэкджек
router.post('/casino/blackjack', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    if (character.currency < bet_amount) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }

    // Простая реализация блэкджека
    const playerCards = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
    const dealerCards = [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];

    const getCardValue = (card: number) => Math.min(card, 10);
    const getHandValue = (cards: number[]) => {
      let value = cards.reduce((sum, card) => sum + getCardValue(card), 0);
      const aces = cards.filter(card => card === 1).length;
      for (let i = 0; i < aces && value + 10 <= 21; i++) {
        value += 10;
      }
      return value;
    };

    const playerValue = getHandValue(playerCards);
    const dealerValue = getHandValue(dealerCards);

    let result = 'lose';
    let winAmount = 0;

    if (playerValue === 21 && dealerValue !== 21) {
      result = 'win';
      winAmount = bet_amount * 2.5; // Блэкджек
    } else if (playerValue > 21) {
      result = 'lose';
    } else if (dealerValue > 21) {
      result = 'win';
      winAmount = bet_amount * 2;
    } else if (playerValue > dealerValue) {
      result = 'win';
      winAmount = bet_amount * 2;
    } else if (playerValue === dealerValue) {
      result = 'push';
      winAmount = bet_amount;
    }

    const newCurrency = character.currency - bet_amount + winAmount;
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'blackjack', bet_amount, winAmount, JSON.stringify({ playerCards, dealerCards, playerValue, dealerValue }), result]);

    res.json({
      result,
      winAmount,
      newCurrency,
      gameData: { playerCards, dealerCards, playerValue, dealerValue }
    });
  } catch (error) {
    console.error('Blackjack game failed:', error);
    res.status(500).json({ error: 'Не удалось сыграть в блэкджек' });
  }
});

// POST /api/casino/slots - Играть в слоты
router.post('/casino/slots', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    if (character.currency < bet_amount) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }

    // Генерируем 3 символа
    const symbols = [1, 2, 3, 4, 5, 6, 7];
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    let result = 'lose';
    let winAmount = 0;

    // Проверяем выигрышные комбинации
    if (reels[0] === 7 && reels[1] === 7 && reels[2] === 7) {
      result = 'win';
      winAmount = bet_amount * 100; // Джекпот
    } else if (reels[0] === reels[1] && reels[1] === reels[2]) {
      result = 'win';
      winAmount = bet_amount * 10; // Три одинаковых
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      result = 'win';
      winAmount = bet_amount * 2; // Два одинаковых
    }

    const newCurrency = character.currency - bet_amount + winAmount;
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'slots', bet_amount, winAmount, JSON.stringify({ reels }), result]);

    res.json({
      result,
      winAmount,
      newCurrency,
      gameData: { reels }
    });
  } catch (error) {
    console.error('Slots game failed:', error);
    res.status(500).json({ error: 'Не удалось сыграть в слоты' });
  }
});

// POST /api/casino/dice - Играть в кости
router.post('/casino/dice', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount, prediction } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0 || !prediction) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    if (prediction < 1 || prediction > 6) {
      return res.status(400).json({ error: 'Предсказание должно быть от 1 до 6' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    if (character.currency < bet_amount) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    let result = 'lose';
    let winAmount = 0;

    // Простая логика: если сумма костей равна предсказанию * 2, то выигрыш
    if (total === prediction * 2) {
      result = 'win';
      winAmount = bet_amount * 6; // Высокий множитель за точное попадание
    } else if (Math.abs(total - prediction * 2) <= 1) {
      result = 'win';
      winAmount = bet_amount * 2; // Частичный выигрыш
    }

    const newCurrency = character.currency - bet_amount + winAmount;
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'dice', bet_amount, winAmount, JSON.stringify({ dice1, dice2, total, prediction }), result]);

    res.json({
      result,
      winAmount,
      newCurrency,
      gameData: { dice1, dice2, total, prediction }
    });
  } catch (error) {
    console.error('Dice game failed:', error);
    res.status(500).json({ error: 'Не удалось сыграть в кости' });
  }
});

// GET /api/casino/history/:character_id - Получить историю игр
router.get('/casino/history/:character_id', async (req: Request, res: Response) => {
  try {
    const { character_id } = req.params;
    const db = await initDB();

    const history = await db.all(`
      SELECT * FROM CasinoGames 
      WHERE character_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [character_id]);

    const historyWithParsedData = history.map(game => ({
      ...game,
      game_data: JSON.parse(game.game_data || '{}')
    }));

    res.json(historyWithParsedData);
  } catch (error) {
    console.error('Failed to fetch casino history:', error);
    res.status(500).json({ error: 'Не удалось получить историю игр' });
  }
});

export default router;
