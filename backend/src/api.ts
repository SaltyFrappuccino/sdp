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
  
  console.log(`PUT /characters/:id - adminId: ${adminId} (type: ${typeof adminId}), userVkId: ${userVkId}, ADMIN_VK_ID: ${ADMIN_VK_ID} (type: ${typeof ADMIN_VK_ID})`);
  console.log(`adminId === ADMIN_VK_ID: ${adminId === ADMIN_VK_ID}`);
  console.log(`adminId == ADMIN_VK_ID: ${adminId == ADMIN_VK_ID}`);
  
  // Если запрос идет от администратора - сразу обновляем анкету
  if (adminId === ADMIN_VK_ID) {
    console.log('Admin update - updating character directly');
    // Продолжаем к обновлению анкеты
  } else {
    // Если запрос идет от пользователя - проверяем владельца и создаем запрос на изменение
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
      
      // Создаем запрос на изменение вместо прямого обновления
      const { contracts, ...characterFields } = req.body;
      const updateData = {
        character_id: req.params.id,
        updated_data: JSON.stringify({ ...characterFields, contracts }),
        status: 'pending'
      };
      
      await db.run(`
        INSERT INTO CharacterUpdates (character_id, updated_data, status) 
        VALUES (?, ?, ?)
      `, [updateData.character_id, updateData.updated_data, updateData.status]);
      
      return res.json({ 
        success: true, 
        message: 'Запрос на изменение отправлен на рассмотрение администратору' 
      });
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

// ==================== НОВАЯ СИСТЕМА СОБЫТИЙ ====================

// GET /api/events - Получить список ивентов
router.get('/events', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    
    const events = await db.all(`
      SELECT e.*, 
             COUNT(ep.id) as participant_count
      FROM Events e
      LEFT JOIN EventParticipants ep ON e.id = ep.event_id
      GROUP BY e.id 
      ORDER BY e.created_at DESC
    `);

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
      LEFT JOIN EventParticipants ep ON e.id = ep.event_id
      WHERE e.id = ?
      GROUP BY e.id
    `, [id]);

    if (!event) {
      return res.status(404).json({ error: 'Ивент не найден' });
    }

    // Получаем участников с информацией о ветках
    const participants = await db.all(`
      SELECT ep.*, c.character_name, c.rank, c.faction, eb.branch_name
      FROM EventParticipants ep
      JOIN Characters c ON ep.character_id = c.id
      LEFT JOIN EventBranches eb ON ep.branch_id = eb.id
      WHERE ep.event_id = ?
      ORDER BY ep.joined_at DESC
    `, [id]);

    // Получаем ветки ивента с количеством участников
    const branches = await db.all(`
      SELECT eb.*, 
             COUNT(ep.id) as participant_count
      FROM EventBranches eb
      LEFT JOIN EventParticipants ep ON eb.id = ep.branch_id
      WHERE eb.event_id = ?
      GROUP BY eb.id
      ORDER BY eb.created_at ASC
    `, [id]);

    res.json({ 
      ...event, 
      participants,
      branches
    });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    res.status(500).json({ error: 'Не удалось получить ивент' });
  }
});

// POST /api/events - Создать новый ивент
router.post('/events', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const {
      title,
      estimated_start_date,
      registration_end_date,
      min_rank,
      max_rank
    } = req.body;

    if (!title || !estimated_start_date) {
      return res.status(400).json({ error: 'Название и ориентировочная дата начала обязательны' });
    }

    const db = await initDB();
    const result = await db.run(`
      INSERT INTO Events (
        title, estimated_start_date, registration_end_date, min_rank, max_rank
      ) VALUES (?, ?, ?, ?, ?)
    `, [title, estimated_start_date, registration_end_date, min_rank || null, max_rank || null]);

    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error('Failed to create event:', error);
    res.status(500).json({ error: 'Не удалось создать ивент' });
  }
});

// POST /api/events/:id/branches - Создать ветку ивента (админы)
router.post('/events/:id/branches', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { id } = req.params;
    const { branch_name, description, min_rank, max_rank, max_participants, rewards } = req.body;
    const db = await initDB();

    if (!branch_name || branch_name.trim().length === 0) {
      return res.status(400).json({ error: 'Название ветки обязательно' });
    }

    // Проверяем что ивент существует
    const event = await db.get('SELECT * FROM Events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ error: 'Ивент не найден' });
    }

    const result = await db.run(`
      INSERT INTO EventBranches (event_id, branch_name, description, min_rank, max_rank, max_participants, rewards)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id, 
      branch_name.trim(), 
      description || null, 
      min_rank || null, 
      max_rank || null, 
      max_participants || null,
      rewards ? JSON.stringify(rewards) : null
    ]);

    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error('Failed to create event branch:', error);
    res.status(500).json({ error: 'Не удалось создать ветку ивента' });
  }
});

// GET /api/events/:id/branches - Получить все ветки ивента
router.get('/events/:id/branches', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    const branches = await db.all(`
      SELECT eb.*, 
             COUNT(ep.id) as participant_count
      FROM EventBranches eb
      LEFT JOIN EventParticipants ep ON eb.id = ep.branch_id
      WHERE eb.event_id = ?
      GROUP BY eb.id
      ORDER BY eb.created_at ASC
    `, [id]);

    // Парсим rewards из JSON
    const branchesWithRewards = branches.map(branch => ({
      ...branch,
      rewards: branch.rewards ? JSON.parse(branch.rewards) : null
    }));

    res.json(branchesWithRewards);
  } catch (error) {
    console.error('Failed to fetch event branches:', error);
    res.status(500).json({ error: 'Не удалось получить ветки ивента' });
  }
});

// DELETE /api/events/branches/:branch_id - Удалить ветку ивента (админы)
router.delete('/events/branches/:branch_id', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { branch_id } = req.params;
    const db = await initDB();

    // Проверяем что ветка существует
    const branch = await db.get('SELECT * FROM EventBranches WHERE id = ?', [branch_id]);
    if (!branch) {
      return res.status(404).json({ error: 'Ветка не найдена' });
    }

    // Проверяем есть ли участники в этой ветке
      const participantCount = await db.get(
      'SELECT COUNT(*) as count FROM EventParticipants WHERE branch_id = ?',
      [branch_id]
    );

    if (participantCount.count > 0) {
      return res.status(400).json({ 
        error: `Нельзя удалить ветку с участниками (${participantCount.count} участников)` 
      });
    }

    await db.run('DELETE FROM EventBranches WHERE id = ?', [branch_id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event branch:', error);
    res.status(500).json({ error: 'Не удалось удалить ветку ивента' });
  }
});

// POST /api/events/:id/join-branch - Присоединиться к ветке ивента
router.post('/events/:id/join-branch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { character_id, vk_id, branch_id } = req.body;
    const db = await initDB();

    if (!character_id || !vk_id) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    // Проверяем что ивент существует
    const event = await db.get('SELECT * FROM Events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ error: 'Ивент не найден' });
    }

    // Проверяем персонажа
    const character = await db.get('SELECT * FROM Characters WHERE id = ? AND vk_id = ?', [character_id, vk_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    // Если указана ветка, проверяем её
    let branch = null;
    if (branch_id) {
      branch = await db.get('SELECT * FROM EventBranches WHERE id = ? AND event_id = ?', [branch_id, id]);
      if (!branch) {
        return res.status(404).json({ error: 'Ветка не найдена' });
      }

      // Проверяем ограничения ветки
      if (branch.min_rank || branch.max_rank) {
        const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
        const characterRankIndex = ranks.indexOf(character.rank);
        const minRankIndex = branch.min_rank ? ranks.indexOf(branch.min_rank) : -1;
        const maxRankIndex = branch.max_rank ? ranks.indexOf(branch.max_rank) : ranks.length;

        if (minRankIndex !== -1 && characterRankIndex < minRankIndex) {
          return res.status(400).json({ error: `Минимальный ранг для этой ветки: ${branch.min_rank}` });
        }
        
        if (maxRankIndex !== ranks.length && characterRankIndex > maxRankIndex) {
          return res.status(400).json({ error: `Максимальный ранг для этой ветки: ${branch.max_rank}` });
        }
      }

      // Проверяем лимит участников ветки
      if (branch.max_participants) {
        const branchParticipantCount = await db.get(
          'SELECT COUNT(*) as count FROM EventParticipants WHERE branch_id = ?',
          [branch_id]
        );
        
        if (branchParticipantCount.count >= branch.max_participants) {
          return res.status(400).json({ error: 'Достигнут лимит участников для этой ветки' });
        }
      }
    } else {
      // Проверяем ограничения основного ивента, если не указана ветка
      if (event.min_rank || event.max_rank) {
        const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
        const characterRankIndex = ranks.indexOf(character.rank);
        const minRankIndex = event.min_rank ? ranks.indexOf(event.min_rank) : -1;
        const maxRankIndex = event.max_rank ? ranks.indexOf(event.max_rank) : ranks.length;

        if (minRankIndex !== -1 && characterRankIndex < minRankIndex) {
          return res.status(400).json({ error: `Минимальный ранг: ${event.min_rank}` });
        }
        
        if (maxRankIndex !== ranks.length && characterRankIndex > maxRankIndex) {
          return res.status(400).json({ error: `Максимальный ранг: ${event.max_rank}` });
        }
      }
    }

    // Проверяем что персонаж еще не зарегистрирован в ивенте
    const existingParticipant = await db.get(`
      SELECT * FROM EventParticipants 
      WHERE event_id = ? AND character_id = ?
    `, [id, character_id]);

    if (existingParticipant) {
      return res.status(400).json({ error: 'Персонаж уже зарегистрирован в этом ивенте' });
    }

    // Регистрируем участника
    await db.run(`
      INSERT INTO EventParticipants (event_id, character_id, vk_id, branch_id)
      VALUES (?, ?, ?, ?)
    `, [id, character_id, vk_id, branch_id || null]);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Failed to join event branch:', error);
    res.status(500).json({ error: 'Не удалось присоединиться к ивенту' });
  }
});

// POST /api/events/:id/join - Присоединиться к ивенту
router.post('/events/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { character_id, vk_id } = req.body;
    const db = await initDB();

    if (!character_id || !vk_id) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    // Получаем данные события
    const event = await db.get('SELECT * FROM Events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    // Проверяем дату окончания регистрации
    if (event.registration_end_date && new Date() > new Date(event.registration_end_date)) {
      return res.status(400).json({ error: 'Срок регистрации истек' });
    }

    // Получаем данные персонажа
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    // Проверяем ранг персонажа
    const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    const characterRankIndex = ranks.indexOf(character.rank);
    
    if (event.min_rank) {
      const minRankIndex = ranks.indexOf(event.min_rank);
      if (characterRankIndex < minRankIndex) {
      return res.status(400).json({ error: 'Ранг персонажа слишком низкий для этого события' });
    }
    }
    
    if (event.max_rank) {
      const maxRankIndex = ranks.indexOf(event.max_rank);
      if (characterRankIndex > maxRankIndex) {
      return res.status(400).json({ error: 'Ранг персонажа слишком высокий для этого события' });
      }
    }

    // Проверяем, что персонаж еще не зарегистрирован
    const existingRegistration = await db.get(
      'SELECT * FROM EventParticipants WHERE event_id = ? AND character_id = ?',
      [id, character_id]
    );
    if (existingRegistration) {
      return res.status(400).json({ error: 'Персонаж уже зарегистрирован на это событие' });
    }

    // Регистрируем персонажа
    await db.run(`
      INSERT INTO EventParticipants (
        event_id, character_id, vk_id
      ) VALUES (?, ?, ?)
    `, [id, character_id, vk_id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to join event:', error);
    res.status(500).json({ error: 'Не удалось присоединиться к событию' });
  }
});

// DELETE /api/events/:id/leave - Покинуть ивент
router.delete('/events/:id/leave', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { character_id } = req.body;
    const db = await initDB();

    if (!character_id) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    // Удаляем регистрацию
    const result = await db.run(
      'DELETE FROM EventParticipants WHERE event_id = ? AND character_id = ?',
      [id, character_id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Регистрация не найдена' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to leave event:', error);
    res.status(500).json({ error: 'Не удалось покинуть событие' });
  }
});

// DELETE /api/events/:id - Удалить ивент (только админы)
router.delete('/events/:id', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { id } = req.params;
    const db = await initDB();
    await db.run('DELETE FROM EventParticipants WHERE event_id = ?', [id]);
    await db.run('DELETE FROM Events WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete event:', error);
    res.status(500).json({ error: 'Не удалось удалить ивент' });
  }
});

// ==================== BULK CHARACTERS MANAGEMENT API ====================

// GET /api/admin/characters - Получить список всех персонажей с поиском (админы)
router.get('/admin/characters', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { search, limit = 100, offset = 0 } = req.query;
    const db = await initDB();
    
    let query = `
      SELECT c.*, u.first_name, u.last_name
      FROM Characters c
      LEFT JOIN Users u ON c.vk_id = u.vk_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string') {
      query += ` AND (
        c.character_name LIKE ? OR 
        c.rank LIKE ? OR 
        c.faction LIKE ? OR
        u.first_name LIKE ? OR
        u.last_name LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY c.character_name ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const characters = await db.all(query, params);

    // Получаем общее количество для пагинации
    let countQuery = `
      SELECT COUNT(*) as total
      FROM Characters c
      LEFT JOIN Users u ON c.vk_id = u.vk_id
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (search && typeof search === 'string') {
      countQuery += ` AND (
        c.character_name LIKE ? OR 
        c.rank LIKE ? OR 
        c.faction LIKE ? OR
        u.first_name LIKE ? OR
        u.last_name LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const totalResult = await db.get(countQuery, countParams);

    res.json({
      characters,
      total: totalResult.total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Failed to fetch characters:', error);
    res.status(500).json({ error: 'Не удалось получить список персонажей' });
  }
});

// POST /api/admin/characters/bulk-update-attribute-points - Массовое изменение очков атрибутов (админы)
router.post('/admin/characters/bulk-update-attribute-points', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { character_ids, attribute_points_change } = req.body;
    const db = await initDB();

    if (!Array.isArray(character_ids) || character_ids.length === 0) {
      return res.status(400).json({ error: 'Необходимо выбрать персонажей' });
    }

    if (typeof attribute_points_change !== 'number' || attribute_points_change === 0) {
      return res.status(400).json({ error: 'Необходимо указать изменение очков атрибутов' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      for (const characterId of character_ids) {
        // Проверяем что персонаж существует
        const character = await db.get('SELECT attribute_points_total FROM Characters WHERE id = ?', [characterId]);
        if (!character) continue;

        const currentPoints = character.attribute_points_total || 0;
        const newPoints = Math.max(0, currentPoints + attribute_points_change); // Не позволяем быть отрицательными

        await db.run(
          'UPDATE Characters SET attribute_points_total = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newPoints, characterId]
        );
      }

      await db.run('COMMIT');
      res.json({ message: `Очки атрибутов обновлены для ${character_ids.length} персонажей` });
  } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Failed to bulk update attribute points:', error);
    res.status(500).json({ error: 'Не удалось обновить очки атрибутов' });
  }
});

// POST /api/admin/characters/bulk-update-currency - Массовое изменение валюты (админы)
router.post('/admin/characters/bulk-update-currency', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { character_ids, currency_change } = req.body;
    const db = await initDB();

    if (!Array.isArray(character_ids) || character_ids.length === 0) {
      return res.status(400).json({ error: 'Необходимо выбрать персонажей' });
    }

    if (typeof currency_change !== 'number' || currency_change === 0) {
      return res.status(400).json({ error: 'Необходимо указать изменение валюты' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      for (const characterId of character_ids) {
        if (currency_change > 0) {
          // Добавляем валюту
          await db.run(
            'UPDATE Characters SET currency = currency + ? WHERE id = ?',
            [currency_change, characterId]
          );
        } else {
          // Отнимаем валюту (но не меньше 0)
          await db.run(
            'UPDATE Characters SET currency = MAX(0, currency + ?) WHERE id = ?',
            [currency_change, characterId]
          );
        }
      }

      await db.run('COMMIT');
      res.json({ success: true, updated_count: character_ids.length });
  } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Failed to bulk update currency:', error);
    res.status(500).json({ error: 'Не удалось обновить валюту' });
  }
});

// POST /api/admin/characters/bulk-add-inventory - Массовое добавление предметов в инвентарь (админы)
router.post('/admin/characters/bulk-add-inventory', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { character_ids, item_name, item_description, quantity = 1 } = req.body;
    const db = await initDB();

    if (!Array.isArray(character_ids) || character_ids.length === 0) {
      return res.status(400).json({ error: 'Необходимо выбрать персонажей' });
    }

    if (!item_name || item_name.trim().length === 0) {
      return res.status(400).json({ error: 'Необходимо указать название предмета' });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ error: 'Количество должно быть положительным числом' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      for (const characterId of character_ids) {
        // Проверяем что персонаж существует
        const character = await db.get('SELECT * FROM Characters WHERE id = ?', [characterId]);
        if (!character) continue;

        // Получаем текущий инвентарь
        let inventory = [];
        try {
          inventory = character.inventory ? JSON.parse(character.inventory) : [];
        } catch (e) {
          inventory = [];
        }

        // Проверяем есть ли уже такой предмет
        const existingItemIndex = inventory.findIndex((item: any) => item.name === item_name.trim());

        if (existingItemIndex !== -1) {
          // Увеличиваем количество существующего предмета
          inventory[existingItemIndex].quantity = (inventory[existingItemIndex].quantity || 1) + quantity;
        } else {
          // Добавляем новый предмет
          inventory.push({
            name: item_name.trim(),
            description: item_description || '',
            quantity: quantity
          });
        }

        // Обновляем инвентарь
        await db.run(
          'UPDATE Characters SET inventory = ? WHERE id = ?',
          [JSON.stringify(inventory), characterId]
        );
      }

      await db.run('COMMIT');
      res.json({ success: true, updated_count: character_ids.length });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Failed to bulk add inventory:', error);
    res.status(500).json({ error: 'Не удалось добавить предметы' });
  }
});

// ==================== EVENT BETTING API ====================

// Функция расчета коэффициентов
const calculateOdds = (believersPool: number, unbelieversPool: number, margin = 0.07) => {
  const totalPool = believersPool + unbelieversPool;
  if (totalPool === 0) {
    return { believerOdds: 2.0, unbelieverOdds: 2.0 };
  }
  
  const availablePool = totalPool * (1 - margin);
  
  let believerOdds = believersPool > 0 ? availablePool / believersPool : 10.0;
  let unbelieverOdds = unbelieversPool > 0 ? availablePool / unbelieversPool : 10.0;
  
  // Минимальные и максимальные коэффициенты
  believerOdds = Math.max(1.01, Math.min(15.0, believerOdds));
  unbelieverOdds = Math.max(1.01, Math.min(15.0, unbelieverOdds));
  
  return {
    believerOdds: Math.round(believerOdds * 100) / 100,
    unbelieverOdds: Math.round(unbelieverOdds * 100) / 100
  };
};

// POST /api/events/:id/bets - Создать ставку для ивента (админы)
router.post('/events/:id/bets', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { id } = req.params;
    const { bet_text } = req.body;
    const db = await initDB();
    
    if (!bet_text || bet_text.trim().length === 0) {
      return res.status(400).json({ error: 'Текст ставки обязателен' });
    }

    // Проверяем что ивент существует
    const event = await db.get('SELECT * FROM Events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ error: 'Ивент не найден' });
    }

    const result = await db.run(`
      INSERT INTO EventBets (event_id, bet_text)
      VALUES (?, ?)
    `, [id, bet_text.trim()]);

    res.status(201).json({ id: result.lastID });
  } catch (error) {
    console.error('Failed to create event bet:', error);
    res.status(500).json({ error: 'Не удалось создать ставку' });
  }
});

// GET /api/events/:id/bets - Получить все ставки для ивента
router.get('/events/:id/bets', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    const bets = await db.all(`
      SELECT 
        eb.*,
        (SELECT COUNT(*) FROM EventBetPlacements WHERE bet_id = eb.id AND bet_type = 'believer') as believer_count,
        (SELECT COUNT(*) FROM EventBetPlacements WHERE bet_id = eb.id AND bet_type = 'unbeliever') as unbeliever_count
      FROM EventBets eb
      WHERE eb.event_id = ?
      ORDER BY eb.created_at DESC
    `, [id]);

    // Рассчитываем коэффициенты для каждой ставки
    const betsWithOdds = bets.map(bet => {
      const odds = calculateOdds(bet.believers_total_pool, bet.unbelievers_total_pool);
      return {
        ...bet,
        ...odds
      };
    });

    res.json(betsWithOdds);
  } catch (error) {
    console.error('Failed to fetch event bets:', error);
    res.status(500).json({ error: 'Не удалось получить ставки' });
  }
});

// GET /api/bets/:bet_id/details - Получить детали конкретной ставки с размещенными ставками
router.get('/bets/:bet_id/details', async (req: Request, res: Response) => {
  try {
    const { bet_id } = req.params;
    const db = await initDB();
    
    const bet = await db.get('SELECT * FROM EventBets WHERE id = ?', [bet_id]);
    if (!bet) {
      return res.status(404).json({ error: 'Ставка не найдена' });
    }

    const placements = await db.all(`
      SELECT 
        ebp.*,
        c.character_name,
        c.rank,
        c.faction
      FROM EventBetPlacements ebp
      JOIN Characters c ON ebp.character_id = c.id
      WHERE ebp.bet_id = ?
      ORDER BY ebp.created_at DESC
    `, [bet_id]);

    const odds = calculateOdds(bet.believers_total_pool, bet.unbelievers_total_pool);

    res.json({
      ...bet,
      ...odds,
      placements
    });
  } catch (error) {
    console.error('Failed to fetch bet details:', error);
    res.status(500).json({ error: 'Не удалось получить детали ставки' });
  }
});

// POST /api/bets/:bet_id/place - Разместить ставку
router.post('/bets/:bet_id/place', async (req: Request, res: Response) => {
  try {
    const { bet_id } = req.params;
    const { character_id, vk_id, bet_type, amount } = req.body;
    const db = await initDB();

    if (!character_id || !vk_id || !bet_type || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    if (!['believer', 'unbeliever'].includes(bet_type)) {
      return res.status(400).json({ error: 'Неверный тип ставки' });
    }

    // Проверяем что ставка существует и открыта
    const bet = await db.get('SELECT * FROM EventBets WHERE id = ? AND status = ?', [bet_id, 'open']);
    if (!bet) {
      return res.status(404).json({ error: 'Ставка не найдена или закрыта' });
    }

    // Проверяем персонажа и его валюту
    const character = await db.get('SELECT * FROM Characters WHERE id = ? AND vk_id = ?', [character_id, vk_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    if (character.currency < amount) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }

    // Проверяем что персонаж еще не делал ставку на этот исход
    const existingBet = await db.get(`
      SELECT * FROM EventBetPlacements 
      WHERE bet_id = ? AND character_id = ? AND bet_type = ?
    `, [bet_id, character_id, bet_type]);

    if (existingBet) {
      return res.status(400).json({ error: 'Вы уже делали ставку на этот исход' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      // Обновляем пулы и рассчитываем коэффициенты
      const newBelieversPool = bet_type === 'believer' 
        ? bet.believers_total_pool + amount 
        : bet.believers_total_pool;
      const newUnbelieversPool = bet_type === 'unbeliever' 
        ? bet.unbelievers_total_pool + amount 
        : bet.unbelievers_total_pool;

      const odds = calculateOdds(newBelieversPool, newUnbelieversPool);
      const currentOdds = bet_type === 'believer' ? odds.believerOdds : odds.unbelieverOdds;
      const potentialPayout = amount * currentOdds;

      // Списываем валюту с персонажа
      await db.run(
        'UPDATE Characters SET currency = currency - ? WHERE id = ?',
        [amount, character_id]
      );

      // Размещаем ставку
    await db.run(`
        INSERT INTO EventBetPlacements 
        (bet_id, character_id, vk_id, bet_type, amount, odds_at_placement, potential_payout)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [bet_id, character_id, vk_id, bet_type, amount, currentOdds, potentialPayout]);

      // Обновляем пулы в ставке
      await db.run(`
        UPDATE EventBets 
        SET believers_total_pool = ?, unbelievers_total_pool = ?
        WHERE id = ?
      `, [newBelieversPool, newUnbelieversPool, bet_id]);

      await db.run('COMMIT');

      res.json({ 
        success: true, 
        odds: currentOdds,
        potential_payout: potentialPayout,
        new_currency: character.currency - amount
      });

  } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Failed to place bet:', error);
    res.status(500).json({ error: 'Не удалось разместить ставку' });
  }
});

// PUT /api/bets/:bet_id/settle - Завершить ставку (админы)
router.put('/bets/:bet_id/settle', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { bet_id } = req.params;
    const { result } = req.body; // 'believers_win' или 'unbelievers_win'
    const db = await initDB();

    if (!['believers_win', 'unbelievers_win'].includes(result)) {
      return res.status(400).json({ error: 'Неверный результат ставки' });
    }

    const bet = await db.get('SELECT * FROM EventBets WHERE id = ? AND status = ?', [bet_id, 'open']);
    if (!bet) {
      return res.status(404).json({ error: 'Ставка не найдена или уже завершена' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      // Получаем все размещенные ставки
      const placements = await db.all(`
        SELECT ebp.*, c.currency as current_currency
        FROM EventBetPlacements ebp
        JOIN Characters c ON ebp.character_id = c.id
        WHERE ebp.bet_id = ?
      `, [bet_id]);

      // Рассчитываем и выплачиваем выигрыши
      const winningBetType = result === 'believers_win' ? 'believer' : 'unbeliever';
      
      for (const placement of placements) {
        let payout = 0;
        
        if (placement.bet_type === winningBetType) {
          // Выигравшие получают выплату согласно коэффициентам
          payout = placement.potential_payout;
          
          await db.run(
            'UPDATE Characters SET currency = currency + ? WHERE id = ?',
            [payout, placement.character_id]
          );
        }
        // Проигравшие не получают ничего (деньги уже списаны)

        // Обновляем размещенную ставку
        await db.run(
          'UPDATE EventBetPlacements SET actual_payout = ? WHERE id = ?',
          [payout, placement.id]
        );
      }

      // Обновляем статус ставки
    await db.run(`
        UPDATE EventBets 
        SET status = 'settled', result = ?, settled_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [result, bet_id]);

      await db.run('COMMIT');

    res.json({ success: true });

  } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Failed to settle bet:', error);
    res.status(500).json({ error: 'Не удалось завершить ставку' });
  }
});

// PUT /api/bets/:bet_id/close - Закрыть ставку для новых размещений (админы)
router.put('/bets/:bet_id/close', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { bet_id } = req.params;
    const db = await initDB();

    const result = await db.run(`
      UPDATE EventBets 
      SET status = 'closed', closed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'open'
    `, [bet_id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ставка не найдена или уже закрыта' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to close bet:', error);
    res.status(500).json({ error: 'Не удалось закрыть ставку' });
  }
});

// GET /api/characters/:character_id/bet-history - История ставок персонажа
router.get('/characters/:character_id/bet-history', async (req: Request, res: Response) => {
  try {
    const { character_id } = req.params;
    const db = await initDB();

    const history = await db.all(`
      SELECT 
        ebp.*,
        eb.bet_text,
        eb.status as bet_status,
        eb.result,
        e.title as event_title
      FROM EventBetPlacements ebp
      JOIN EventBets eb ON ebp.bet_id = eb.id
      JOIN Events e ON eb.event_id = e.id
      WHERE ebp.character_id = ?
      ORDER BY ebp.created_at DESC
      LIMIT 50
    `, [character_id]);

    res.json(history);
  } catch (error) {
    console.error('Failed to fetch bet history:', error);
    res.status(500).json({ error: 'Не удалось получить историю ставок' });
  }
});

// ==================== MARKET API ====================

// Удален дублирующий эндпоинт - используется новый ниже

// GET /api/market/stocks/:ticker - Получить детали акции и историю цен
router.get('/market/stocks/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const db = await initDB();
    const stock = await db.get('SELECT * FROM Stocks WHERE ticker_symbol = ?', [ticker]);

    if (!stock) {
      return res.status(404).json({ error: 'Акция не найдена' });
    }

    const history = await db.all(`
      SELECT price, 
             CASE 
               WHEN timestamp IS NOT NULL AND timestamp != '' THEN timestamp 
               ELSE legacy_timestamp 
             END as timestamp
      FROM StockPriceHistory 
      WHERE stock_id = ? 
      ORDER BY 
        CASE 
          WHEN timestamp IS NOT NULL AND timestamp != '' THEN timestamp 
          ELSE legacy_timestamp 
        END DESC 
      LIMIT 100
    `, [stock.id]);
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

    // Обычные длинные позиции
    const assets = await db.all(`
      SELECT 
        pa.quantity,
        pa.average_purchase_price,
        pa.position_type,
        s.name,
        s.ticker_symbol,
        s.current_price
      FROM PortfolioAssets pa
      JOIN Stocks s ON pa.stock_id = s.id
      WHERE pa.portfolio_id = ?
    `, [portfolio.id]);

    // Короткие позиции
    const shortPositions = await db.all(`
      SELECT 
        sp.id,
        sp.quantity,
        sp.short_price,
        sp.margin_requirement,
        sp.interest_rate,
        sp.opened_at,
        s.name,
        s.ticker_symbol,
        s.current_price,
        (sp.short_price - s.current_price) * sp.quantity as unrealized_pnl
      FROM ShortPositions sp
      JOIN Stocks s ON sp.stock_id = s.id
      WHERE sp.portfolio_id = ? AND sp.status = 'open'
    `, [portfolio.id]);

    // Активные ордера
    const activeOrders = await db.all(`
      SELECT 
        o.id,
        o.order_type,
        o.side,
        o.quantity,
        o.price,
        o.stop_price,
        o.status,
        o.created_at,
        s.name as stock_name,
        s.ticker_symbol,
        s.current_price
      FROM TradingOrders o
      JOIN Stocks s ON o.stock_id = s.id
      WHERE o.portfolio_id = ? AND o.status IN ('pending', 'partially_filled')
      ORDER BY o.created_at DESC
    `, [portfolio.id]);

    res.json({ 
      ...portfolio, 
      assets,
      short_positions: shortPositions,
      active_orders: activeOrders
    });
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
    res.status(500).json({ error: 'Не удалось получить портфолио' });
  }
});

// Удален старый дублирующий эндпоинт - используется новый ниже

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

// POST /api/market/admin/reset-economy - Сбросить экономику
router.post('/market/admin/reset-economy', async (req: Request, res: Response) => {
  const adminId = req.headers['x-admin-id'];
  if (adminId !== ADMIN_VK_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const db = await initDB();
  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Обнуление валюты у всех персонажей
    await db.run('UPDATE Characters SET currency = 0');

    // 2. Очистка всех портфелей
    await db.run('DELETE FROM PortfolioAssets');
    await db.run('DELETE FROM Portfolios');

    // 3. Очистка истории цен
    await db.run('DELETE FROM StockPriceHistory');
    
    // 4. Сброс цен на акции к первоначальным значениям
    // Для этого нам нужно пересоздать акции с помощью seedStocks
    await db.run('DELETE FROM Stocks');
    // seedStocks находится в database.ts и вызывается в initDB,
    // но для идемпотентности вызовем его здесь явно.
    // Для этого нужно импортировать seedStocks.
    // Однако, чтобы не усложнять, просто пересоздадим базу.
    // Простой вариант - это просто пересоздать таблицы.
    // Но самый простой и надежный способ - это просто удалить и заново создать.
    // Но так как у нас есть seedStocks, мы можем его использовать.
    // Для этого нужно экспортировать seedStocks из database.ts
    // и импортировать в api.ts.
    // Но для простоты, я просто скопирую логику сюда.
    const stocks = [
      { name: 'Arasaka', ticker_symbol: 'ARSK', description: 'Промышленный и военный гигант, производитель оружия, роботов и имплантов.', current_price: 150.75, exchange: 'IGX' },
      { name: 'Sber', ticker_symbol: 'SBER', description: 'Цифровой гигант, контролирующий информацию, финансы и логистику.', current_price: 280.50, exchange: 'IGX' },
      { name: 'Отражённый Свет Солнца', ticker_symbol: 'OSS', description: 'Религиозная и бизнес-сеть с огромным влиянием.', current_price: 120.00, exchange: 'IGX' },
      { name: 'Стабилизационные Облигации Порядка', ticker_symbol: 'ORD-B', description: 'Надежные государственные облигации, поддерживаемые Порядком.', current_price: 100.00, exchange: 'OSB' },
      { name: 'Индекс Влияния "Чёрной Лилии"', ticker_symbol: 'BLK-L', description: 'Высокорисковый индекс, отражающий успех теневых операций.', current_price: 50.25, exchange: 'KSM' },
      { name: 'Редкие травы с Мидзу', ticker_symbol: 'MDZ-H', description: 'Товарный фьючерс на поставку уникальных лекарственных растений.', current_price: 3500.00, exchange: 'MCM' }
    ];
  
    const stmt = await db.prepare('INSERT OR IGNORE INTO Stocks (name, ticker_symbol, description, current_price, exchange) VALUES (?, ?, ?, ?, ?)');
    for (const stock of stocks) {
      await stmt.run(stock.name, stock.ticker_symbol, stock.description, stock.current_price, stock.exchange);
    }
    await stmt.finalize();


    await db.run('COMMIT');
    res.json({ message: 'Экономика успешно сброшена' });

  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Failed to reset economy:', error);
    res.status(500).json({ error: 'Не удалось сбросить экономику' });
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

// POST /api/market/short - Открыть короткую позицию
router.post('/market/short', async (req: Request, res: Response) => {
  const { character_id, ticker_symbol, quantity } = req.body;
  if (!character_id || !ticker_symbol || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Неверные параметры для короткой позиции' });
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
      const result = await db.run('INSERT INTO Portfolios (character_id, cash_balance) VALUES (?, ?)', [character_id, character.currency || 0]);
      portfolio = { id: result.lastID, character_id, cash_balance: character.currency || 0 };
    }

    // Рассчитываем маржевое требование (50% от стоимости позиции)
    const marginRequirement = stock.current_price * quantity * 0.5;
    
    if (character.currency < marginRequirement) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Недостаточно средств для маржевого требования' });
    }

    // Списываем маржу
    await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [marginRequirement, character_id]);
    await db.run('UPDATE Portfolios SET cash_balance = cash_balance - ? WHERE id = ?', [marginRequirement, portfolio.id]);

    // Создаем короткую позицию
    await db.run(`
      INSERT INTO ShortPositions (portfolio_id, stock_id, quantity, short_price, margin_requirement)
      VALUES (?, ?, ?, ?, ?)
    `, [portfolio.id, stock.id, quantity, stock.current_price, marginRequirement]);

    await db.run('COMMIT');
    res.json({ message: 'Короткая позиция открыта успешно' });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Short position failed:', error);
    res.status(500).json({ error: 'Не удалось открыть короткую позицию' });
  }
});

// POST /api/market/cover - Закрыть короткую позицию
router.post('/market/cover', async (req: Request, res: Response) => {
  const { character_id, short_position_id, quantity } = req.body;
  if (!character_id || !short_position_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Неверные параметры для закрытия позиции' });
  }

  const db = await initDB();
  try {
    await db.run('BEGIN TRANSACTION');

    const shortPosition = await db.get(`
      SELECT sp.*, s.current_price, s.name as stock_name
      FROM ShortPositions sp
      JOIN Stocks s ON sp.stock_id = s.id
      WHERE sp.id = ? AND sp.status = 'open'
    `, [short_position_id]);

    if (!shortPosition) {
      await db.run('ROLLBACK');
      return res.status(404).json({ error: 'Короткая позиция не найдена' });
    }

    if (quantity > shortPosition.quantity) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Нельзя закрыть больше акций чем в позиции' });
    }

    // Рассчитываем прибыль/убыток от короткой позиции
    const profitLoss = (shortPosition.short_price - shortPosition.current_price) * quantity;
    const marginToReturn = (shortPosition.margin_requirement / shortPosition.quantity) * quantity;
    const totalReturn = marginToReturn + profitLoss;

    // Возвращаем деньги персонажу
    await db.run('UPDATE Characters SET currency = currency + ? WHERE id = ?', [totalReturn, character_id]);

    // Обновляем или удаляем короткую позицию
    if (quantity === shortPosition.quantity) {
      await db.run('UPDATE ShortPositions SET status = ? WHERE id = ?', ['closed', short_position_id]);
    } else {
      const newQuantity = shortPosition.quantity - quantity;
      const newMargin = shortPosition.margin_requirement - marginToReturn;
      await db.run(`
        UPDATE ShortPositions 
        SET quantity = ?, margin_requirement = ? 
        WHERE id = ?
      `, [newQuantity, newMargin, short_position_id]);
    }

    await db.run('COMMIT');
    res.json({ 
      message: 'Короткая позиция закрыта успешно',
      profit_loss: profitLoss,
      total_return: totalReturn
    });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Cover position failed:', error);
    res.status(500).json({ error: 'Не удалось закрыть короткую позицию' });
  }
});

// POST /api/market/order - Создать торговый ордер
router.post('/market/order', async (req: Request, res: Response) => {
  const { character_id, ticker_symbol, order_type, side, quantity, price, stop_price, time_in_force } = req.body;
  
  if (!character_id || !ticker_symbol || !order_type || !side || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Неверные параметры ордера' });
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
    if (!portfolio) {
      const result = await db.run('INSERT INTO Portfolios (character_id, cash_balance) VALUES (?, ?)', [character_id, 0]);
      portfolio = { id: result.lastID, character_id, cash_balance: 0 };
    }

    // Проверяем возможность выставления ордера
    if (['buy', 'short'].includes(side)) {
      const orderPrice = order_type === 'market' ? stock.current_price : price;
      const requiredFunds = side === 'buy' ? orderPrice * quantity : (orderPrice * quantity * 0.5); // Маржа для шорта
      
      const character = await db.get('SELECT currency FROM Characters WHERE id = ?', [character_id]);
      if (character.currency < requiredFunds) {
        await db.run('ROLLBACK');
        return res.status(400).json({ error: 'Недостаточно средств для ордера' });
      }
    }

    // Создаем ордер
    const orderResult = await db.run(`
      INSERT INTO TradingOrders (
        portfolio_id, stock_id, order_type, side, quantity, price, stop_price, time_in_force
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [portfolio.id, stock.id, order_type, side, quantity, price, stop_price, time_in_force || 'GTC']);

    // Если это рыночный ордер, исполняем его сразу
    if (order_type === 'market') {
      const executionPrice = stock.current_price;
      
      if (side === 'buy') {
        const totalCost = executionPrice * quantity;
        await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [totalCost, character_id]);
        
        const existingAsset = await db.get(`
          SELECT * FROM PortfolioAssets 
          WHERE portfolio_id = ? AND stock_id = ? AND position_type = 'long'
        `, [portfolio.id, stock.id]);
        
        if (existingAsset) {
          const newQuantity = existingAsset.quantity + quantity;
          const newAvgPrice = ((existingAsset.average_purchase_price * existingAsset.quantity) + totalCost) / newQuantity;
          await db.run(`
            UPDATE PortfolioAssets 
            SET quantity = ?, average_purchase_price = ? 
            WHERE id = ?
          `, [newQuantity, newAvgPrice, existingAsset.id]);
        } else {
          await db.run(`
            INSERT INTO PortfolioAssets (portfolio_id, stock_id, quantity, average_purchase_price, position_type)
            VALUES (?, ?, ?, ?, 'long')
          `, [portfolio.id, stock.id, quantity, executionPrice]);
        }
      } else if (side === 'short') {
        const marginRequirement = executionPrice * quantity * 0.5;
        await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [marginRequirement, character_id]);
        
        await db.run(`
          INSERT INTO ShortPositions (portfolio_id, stock_id, quantity, short_price, margin_requirement)
          VALUES (?, ?, ?, ?, ?)
        `, [portfolio.id, stock.id, quantity, executionPrice, marginRequirement]);
      }

      await db.run(`
        UPDATE TradingOrders 
        SET status = 'filled', filled_quantity = ?, avg_fill_price = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [quantity, executionPrice, orderResult.lastID]);
    }

    await db.run('COMMIT');
    res.json({ message: 'Ордер создан успешно' });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Order creation failed:', error);
    res.status(500).json({ error: 'Не удалось создать ордер' });
  }
});

// GET /api/market/orders/:character_id - Получить активные ордера персонажа
router.get('/market/orders/:character_id', async (req: Request, res: Response) => {
  try {
    const { character_id } = req.params;
    const db = await initDB();
    
    const orders = await db.all(`
      SELECT 
        o.*,
        s.name as stock_name,
        s.ticker_symbol,
        s.current_price
      FROM TradingOrders o
      JOIN Portfolios p ON o.portfolio_id = p.id
      JOIN Stocks s ON o.stock_id = s.id
      WHERE p.character_id = ? AND o.status IN ('pending', 'partially_filled')
      ORDER BY o.created_at DESC
    `, [character_id]);

    res.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    res.status(500).json({ error: 'Не удалось получить ордера' });
  }
});

// ==================== CASINO API ====================

// POST /api/casino/blackjack/start - Начать игру в блэкджек (списать ставку)
router.post('/casino/blackjack/start', async (req: Request, res: Response) => {
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

    // Списываем ставку
    await db.run(
      'UPDATE Characters SET currency = currency - ? WHERE id = ?',
      [bet_amount, character_id]
    );

    res.json({ 
      success: true, 
      message: 'Ставка списана, игра началась',
      new_currency: character.currency - bet_amount
    });
  } catch (error) {
    console.error('Blackjack start error:', error);
    res.status(500).json({ error: 'Не удалось начать игру' });
  }
});

// POST /api/casino/slots/start - Начать игру в слоты (списать ставку)
router.post('/casino/slots/start', async (req: Request, res: Response) => {
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

    // Списываем ставку
    await db.run(
      'UPDATE Characters SET currency = currency - ? WHERE id = ?',
      [bet_amount, character_id]
    );

    res.json({ 
      success: true, 
      message: 'Ставка списана, игра началась',
      new_currency: character.currency - bet_amount
    });
  } catch (error) {
    console.error('Slots start error:', error);
    res.status(500).json({ error: 'Не удалось начать игру' });
  }
});

// POST /api/casino/dice/start - Начать игру в кости (списать ставку)
router.post('/casino/dice/start', async (req: Request, res: Response) => {
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

    // Списываем ставку
    await db.run(
      'UPDATE Characters SET currency = currency - ? WHERE id = ?',
      [bet_amount, character_id]
    );

    res.json({ 
      success: true, 
      message: 'Ставка списана, игра началась',
      new_currency: character.currency - bet_amount
    });
  } catch (error) {
    console.error('Dice start error:', error);
    res.status(500).json({ error: 'Не удалось начать игру' });
  }
});

// POST /api/casino/roulette/start - Начать игру в рулетку (списать ставку)
router.post('/casino/roulette/start', async (req: Request, res: Response) => {
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

    // Списываем ставку
    await db.run(
      'UPDATE Characters SET currency = currency - ? WHERE id = ?',
      [bet_amount, character_id]
    );

    res.json({ 
      success: true, 
      message: 'Ставка списана, игра началась',
      new_currency: character.currency - bet_amount
    });
  } catch (error) {
    console.error('Roulette start error:', error);
    res.status(500).json({ error: 'Не удалось начать игру' });
  }
});

// POST /api/casino/horseracing/start - Начать игру в скачки (списать ставку)
router.post('/casino/horseracing/start', async (req: Request, res: Response) => {
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

    // Списываем ставку
    await db.run(
      'UPDATE Characters SET currency = currency - ? WHERE id = ?',
      [bet_amount, character_id]
    );

    res.json({ 
      success: true, 
      message: 'Ставка списана, игра началась',
      new_currency: character.currency - bet_amount
    });
  } catch (error) {
    console.error('Horse racing start error:', error);
    res.status(500).json({ error: 'Не удалось начать игру' });
  }
});

// POST /api/casino/blackjack - Сохранить результат игры в блэкджек
router.post('/casino/blackjack', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount, result, winAmount, gameData } = req.body;
    const db = await initDB();

    console.log('Blackjack API called:', { character_id, bet_amount, result, winAmount, gameData });

    if (!character_id || !bet_amount || bet_amount <= 0 || !result || winAmount === undefined) {
      console.log('Parameter validation failed:', { character_id, bet_amount, result, winAmount });
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    console.log('Character currency before:', character.currency, 'winAmount:', winAmount);
    // Ставка уже была списана при начале игры, только начисляем выигрыш
    const newCurrency = character.currency + winAmount;
    
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'blackjack', bet_amount, winAmount, JSON.stringify(gameData), result]);

    res.json({
      result: result,
      winAmount: winAmount,
      newCurrency,
      gameData: gameData
    });
  } catch (error) {
    console.error('Blackjack game failed:', error);
    res.status(500).json({ error: 'Не удалось сохранить результат игры' });
  }
});

// POST /api/casino/slots - Сохранить результат игры в слоты
router.post('/casino/slots', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount, result, winAmount, gameData } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0 || !result || winAmount === undefined) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    // Ставка уже была списана при начале игры, только начисляем выигрыш
    const newCurrency = character.currency + winAmount;
    
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'slots', bet_amount, winAmount, JSON.stringify(gameData), result]);

    res.json({
      result: result,
      winAmount: winAmount,
      newCurrency,
      gameData: gameData
    });
  } catch (error) {
    console.error('Slots game failed:', error);
    res.status(500).json({ error: 'Не удалось сохранить результат игры' });
  }
});

// POST /api/casino/dice - Сохранить результат игры в кости
router.post('/casino/dice', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount, result, winAmount, gameData } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0 || !result || winAmount === undefined) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    // Ставка уже была списана при начале игры, только начисляем выигрыш
    const newCurrency = character.currency + winAmount;
    
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'dice', bet_amount, winAmount, JSON.stringify(gameData), result]);

    res.json({
      result: result,
      winAmount: winAmount,
      newCurrency,
      gameData: gameData
    });
  } catch (error) {
    console.error('Dice game failed:', error);
    res.status(500).json({ error: 'Не удалось сохранить результат игры' });
  }
});

// POST /api/casino/roulette - Сохранить результат игры в рулетку
router.post('/casino/roulette', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount, result, winAmount, gameData } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0 || !result || winAmount === undefined) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    // Ставка уже была списана при начале игры, только начисляем выигрыш
    const newCurrency = character.currency + winAmount;
    
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'roulette', bet_amount, winAmount, JSON.stringify(gameData), result]);

    res.json({
      result: result,
      winAmount: winAmount,
      newCurrency,
      gameData: gameData
    });
  } catch (error) {
    console.error('Roulette game failed:', error);
    res.status(500).json({ error: 'Не удалось сохранить результат игры' });
  }
});

// POST /api/casino/horseracing - Сохранить результат игры в скачки
router.post('/casino/horseracing', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount, result, winAmount, gameData } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0 || !result || winAmount === undefined) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    // Ставка уже была списана при начале игры, только начисляем выигрыш
    const newCurrency = character.currency + winAmount;
    
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'horseracing', bet_amount, winAmount, JSON.stringify(gameData), result]);

    res.json({
      result: result,
      winAmount: winAmount,
      newCurrency,
      gameData: gameData
    });
  } catch (error) {
    console.error('Horse racing game failed:', error);
    res.status(500).json({ error: 'Не удалось сохранить результат игры' });
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

// Market/Stock Trading API
router.get('/market/stocks', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const stocks = await db.all(`
      SELECT s.*, 
             COUNT(pa.id) as holders,
             COALESCE(SUM(pa.quantity), 0) as shares_owned
      FROM Stocks s 
      LEFT JOIN PortfolioAssets pa ON s.id = pa.stock_id AND (pa.position_type = 'long' OR pa.position_type IS NULL)
      GROUP BY s.id
      ORDER BY s.exchange, s.name
    `);
    
    // Добавляем историю цен и доступные акции
    for (const stock of stocks) {
      // Получаем историю цен
      const priceHistory = await db.all(`
        SELECT price, 
               CASE 
                 WHEN timestamp IS NOT NULL AND timestamp != '' THEN timestamp 
                 ELSE legacy_timestamp 
               END as timestamp
        FROM StockPriceHistory 
        WHERE stock_id = ? 
        ORDER BY 
          CASE 
            WHEN timestamp IS NOT NULL AND timestamp != '' THEN timestamp 
            ELSE legacy_timestamp 
          END DESC 
        LIMIT 30
      `, [stock.id]);
      
      stock.history = priceHistory.reverse();
      stock.available_shares = (stock.total_shares || 0) - (stock.shares_owned || 0);
    }
    
    res.json(stocks);
  } catch (error) {
    console.error('Failed to fetch stocks:', error);
    res.status(500).json({ error: 'Не удалось получить список акций' });
  }
});

router.post('/market/trade', async (req: Request, res: Response) => {
  try {
    const { character_id, stock_id, action, quantity, vk_id } = req.body;
    
    if (!character_id || !stock_id || !action || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }
    
    const db = await initDB();
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Получаем информацию об акции
      const stock = await db.get('SELECT * FROM Stocks WHERE id = ?', [stock_id]);
      if (!stock) {
        await db.run('ROLLBACK');
        return res.status(404).json({ error: 'Акция не найдена' });
      }
      
      // Получаем персонажа
      const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
      if (!character) {
        await db.run('ROLLBACK');
        return res.status(404).json({ error: 'Персонаж не найден' });
      }
      
      // Создаем портфель если его нет
      let portfolio = await db.get('SELECT * FROM Portfolios WHERE character_id = ?', [character_id]);
      if (!portfolio) {
        await db.run('INSERT INTO Portfolios (character_id, vk_id) VALUES (?, ?)', [character_id, vk_id]);
        portfolio = await db.get('SELECT * FROM Portfolios WHERE character_id = ?', [character_id]);
      }
      
      if (action === 'buy') {
        // Проверяем доступность акций
        const ownedShares = await db.get(`
          SELECT COALESCE(SUM(quantity), 0) as total 
          FROM PortfolioAssets 
          WHERE stock_id = ? AND position_type = 'long'
        `, [stock_id]);
        
        const availableShares = stock.total_shares - (ownedShares?.total || 0);
        
        if (quantity > availableShares) {
          await db.run('ROLLBACK');
          return res.status(400).json({ 
            error: `Недостаточно доступных акций. Доступно: ${availableShares.toLocaleString('ru-RU')}` 
          });
        }
        
        const cost = stock.current_price * quantity;
        
        if (character.currency < cost) {
          await db.run('ROLLBACK');
          return res.status(400).json({ error: 'Недостаточно средств' });
        }
        
        // Списываем деньги
        await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [cost, character_id]);
        
        // Добавляем/обновляем позицию в портфеле
        const existingAsset = await db.get(`
          SELECT * FROM PortfolioAssets 
          WHERE portfolio_id = ? AND stock_id = ? AND position_type = 'long'
        `, [portfolio.id, stock_id]);
        
        if (existingAsset) {
          const newQuantity = existingAsset.quantity + quantity;
          const newAvgPrice = ((existingAsset.average_purchase_price * existingAsset.quantity) + (stock.current_price * quantity)) / newQuantity;
          
          await db.run(`
            UPDATE PortfolioAssets 
            SET quantity = ?, average_purchase_price = ?
            WHERE id = ?
          `, [newQuantity, newAvgPrice, existingAsset.id]);
        } else {
          await db.run(`
            INSERT INTO PortfolioAssets (portfolio_id, stock_id, quantity, average_purchase_price, position_type)
            VALUES (?, ?, ?, ?, 'long')
          `, [portfolio.id, stock_id, quantity, stock.current_price]);
        }
        
        await db.run('COMMIT');
        res.json({ 
          message: `Успешно куплено ${quantity} акций ${stock.ticker_symbol} за ${cost.toLocaleString('ru-RU')} ₭`,
          cost,
          available_shares: availableShares - quantity
        });
        
      } else if (action === 'sell') {
        // Проверяем наличие акций у персонажа
        const asset = await db.get(`
          SELECT * FROM PortfolioAssets 
          WHERE portfolio_id = ? AND stock_id = ? AND position_type = 'long'
        `, [portfolio.id, stock_id]);
        
        if (!asset || asset.quantity < quantity) {
          await db.run('ROLLBACK');
          return res.status(400).json({ error: 'Недостаточно акций для продажи' });
        }
        
        const revenue = stock.current_price * quantity;
        
        // Зачисляем деньги
        await db.run('UPDATE Characters SET currency = currency + ? WHERE id = ?', [revenue, character_id]);
        
        // Обновляем/удаляем позицию
        if (asset.quantity === quantity) {
          await db.run('DELETE FROM PortfolioAssets WHERE id = ?', [asset.id]);
        } else {
          await db.run('UPDATE PortfolioAssets SET quantity = quantity - ? WHERE id = ?', [quantity, asset.id]);
        }
        
        await db.run('COMMIT');
        res.json({ 
          message: `Успешно продано ${quantity} акций ${stock.ticker_symbol} за ${revenue.toLocaleString('ru-RU')} ₭`,
          revenue
        });
      }
      
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to execute trade:', error);
    res.status(500).json({ error: 'Не удалось выполнить операцию' });
  }
});

export default router;
