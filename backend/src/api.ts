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

// GET /api/casino/horseracing/horses - Получить лошадей для гонки
router.get('/casino/horseracing/horses', async (req: Request, res: Response) => {
  try {
    const { generateRandomHorseTeam, calculateOdds } = await import('./horseLogic.js');
    const raceHorses = generateRandomHorseTeam();
    const odds = calculateOdds(raceHorses);
    
    // Преобразуем названия полей для фронтенда и добавляем коэффициенты
    const horsesWithOdds = raceHorses.map(horse => ({
      id: horse.id,
      name: horse.name,
      emoji: horse.emoji,
      personality: horse.description, // переименовываем description в personality
      speed: horse.baseSpeed,         // переименовываем baseSpeed в speed
      stamina: horse.baseStamina,     // переименовываем baseStamina в stamina
      luck: horse.baseLuck,           // переименовываем baseLuck в luck
      odds: odds[horse.id] || 2       // добавляем коэффициенты
    }));
    
    res.json({ horses: horsesWithOdds });
  } catch (error) {
    console.error('Error getting race horses:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/casino/horseracing/stats - Статистика всех лошадей
router.get('/casino/horseracing/stats', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    const horses = await db.all(`
      SELECT 
        id, name, emoji, personality, speed, stamina, luck,
        total_races, wins, second_places, third_places, total_winnings,
        ROUND(CAST(wins AS FLOAT) / NULLIF(total_races, 0) * 100, 1) as win_rate
      FROM Horses 
      ORDER BY wins DESC, win_rate DESC
    `);
    
    res.json({ horses });
  } catch (error) {
    console.error('Error getting horse stats:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/casino/horseracing/start - Начать игру в скачки (списать ставку)
router.post('/casino/horseracing/start', async (req: Request, res: Response) => {
  try {
    const { character_id, bet_amount, selected_horses } = req.body;
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
      new_currency: character.currency - bet_amount,
      ...(selected_horses && { horses: selected_horses })
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
    const { character_id, bet_amount, result, winAmount, gameData, raceResults } = req.body;
    const db = await initDB();

    if (!character_id || !bet_amount || bet_amount <= 0 || !result || winAmount === undefined || !raceResults) {
      return res.status(400).json({ error: 'Неверные параметры' });
    }

    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }

    // Ставка уже была списана при начале игры, только начисляем выигрыш
    const newCurrency = character.currency + winAmount;
    
    await db.run('UPDATE Characters SET currency = ? WHERE id = ?', [newCurrency, character_id]);

    // Сохраняем основную запись игры
    const gameResult = await db.run(`
      INSERT INTO CasinoGames (character_id, game_type, bet_amount, win_amount, game_data, result)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [character_id, 'horseracing', bet_amount, winAmount, JSON.stringify(gameData), result]);

    const gameId = gameResult.lastID;

    // Обновляем статистику лошадей
    const { updateHorseStats } = await import('./horseLogic.js');
    await updateHorseStats(db, raceResults, gameId!, winAmount);

    res.json({
      result: result,
      winAmount: winAmount,
      newCurrency,
      gameData: gameData,
      raceResults: raceResults
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

// ===============================
// POKER API ENDPOINTS
// ===============================

/**
 * @swagger
 * /api/poker/rooms:
 *   get:
 *     summary: Получить список покерных комнат
 *     tags: [Poker]
 *     responses:
 *       200:
 *         description: Список покерных комнат
 */
router.get('/poker/rooms', async (req: Request, res: Response) => {
  try {
    const db = await initDB();
    
    const rooms = await db.all(`
      SELECT 
        pr.*,
        c.character_name as creator_name,
        COUNT(pp.id) as current_players
      FROM PokerRooms pr
      LEFT JOIN Characters c ON pr.creator_id = c.id
      LEFT JOIN PokerPlayers pp ON pr.id = pp.room_id AND pp.status = 'active'
      WHERE pr.status IN ('waiting', 'playing')
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
    `);
    
    res.json(rooms);
  } catch (error) {
    console.error('Failed to get poker rooms:', error);
    res.status(500).json({ error: 'Не удалось загрузить комнаты' });
  }
});

/**
 * @swagger
 * /api/poker/rooms:
 *   post:
 *     summary: Создать покерную комнату
 *     tags: [Poker]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               character_id:
 *                 type: integer
 *               room_name:
 *                 type: string
 *               buy_in:
 *                 type: integer
 *               max_players:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Комната создана успешно
 */
router.post('/poker/rooms', async (req: Request, res: Response) => {
  try {
    const { character_id, room_name, buy_in, max_players = 6 } = req.body;
    
    if (!character_id || !room_name || !buy_in) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }
    
    if (buy_in < 100) {
      return res.status(400).json({ error: 'Минимальный buy-in: 100 💰' });
    }
    
    const db = await initDB();
    
    // Проверяем, что персонаж существует и у него достаточно денег
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }
    
    if (character.currency < buy_in) {
      return res.status(400).json({ error: 'Недостаточно средств для создания комнаты' });
    }
    
    const small_blind = Math.floor(buy_in / 200);
    const big_blind = Math.floor(buy_in / 100);
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Создаем комнату
      const result = await db.run(`
        INSERT INTO PokerRooms (room_name, creator_id, max_players, buy_in, small_blind, big_blind)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [room_name, character_id, max_players, buy_in, small_blind, big_blind]);
      
      const room_id = result.lastID;
      
      // Автоматически добавляем создателя в комнату
      await db.run(`
        INSERT INTO PokerPlayers (room_id, character_id, seat_position, chips)
        VALUES (?, ?, 1, ?)
      `, [room_id, character_id, buy_in]);
      
      // Списываем buy-in с создателя
      await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [buy_in, character_id]);
      
      await db.run('COMMIT');
      
      res.status(201).json({ 
        message: 'Комната создана успешно',
        room_id,
        room_name,
        buy_in,
        small_blind,
        big_blind
      });
      
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to create poker room:', error);
    res.status(500).json({ error: 'Не удалось создать комнату' });
  }
});

/**
 * @swagger
 * /api/poker/rooms/{id}/join:
 *   post:
 *     summary: Присоединиться к покерной комнате
 *     tags: [Poker]
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
 *             properties:
 *               character_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Успешно присоединился к комнате
 */
router.post('/poker/rooms/:id/join', async (req: Request, res: Response) => {
  try {
    const room_id = parseInt(req.params.id);
    const { character_id } = req.body;
    
    if (!character_id) {
      return res.status(400).json({ error: 'character_id обязателен' });
    }
    
    const db = await initDB();
    
    // Проверяем комнату
    const room = await db.get('SELECT * FROM PokerRooms WHERE id = ? AND status = "waiting"', [room_id]);
    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена или игра уже началась' });
    }
    
    // Проверяем персонажа
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      return res.status(404).json({ error: 'Персонаж не найден' });
    }
    
    if (character.currency < room.buy_in) {
      return res.status(400).json({ error: 'Недостаточно средств для входа в комнату' });
    }
    
    // Проверяем, не в комнате ли уже игрок
    const existingPlayer = await db.get('SELECT * FROM PokerPlayers WHERE room_id = ? AND character_id = ?', [room_id, character_id]);
    if (existingPlayer) {
      return res.status(400).json({ error: 'Вы уже в этой комнате' });
    }
    
    // Проверяем количество игроков
    const playerCount = await db.get('SELECT COUNT(*) as count FROM PokerPlayers WHERE room_id = ? AND status = "active"', [room_id]);
    if (playerCount.count >= room.max_players) {
      return res.status(400).json({ error: 'Комната заполнена' });
    }
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Находим свободное место
      const occupiedSeats = await db.all('SELECT seat_position FROM PokerPlayers WHERE room_id = ?', [room_id]);
      const occupiedPositions = occupiedSeats.map(seat => seat.seat_position);
      
      let seat_position = 1;
      while (occupiedPositions.includes(seat_position) && seat_position <= room.max_players) {
        seat_position++;
      }
      
      // Добавляем игрока
      await db.run(`
        INSERT INTO PokerPlayers (room_id, character_id, seat_position, chips)
        VALUES (?, ?, ?, ?)
      `, [room_id, character_id, seat_position, room.buy_in]);
      
      // Списываем buy-in
      await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [room.buy_in, character_id]);
      
      await db.run('COMMIT');
      
      res.json({ 
        message: 'Успешно присоединились к комнате',
        seat_position,
        chips: room.buy_in
      });
      
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to join poker room:', error);
    res.status(500).json({ error: 'Не удалось присоединиться к комнате' });
  }
});

/**
 * @swagger
 * /api/poker/rooms/{id}/leave:
 *   post:
 *     summary: Покинуть покерную комнату
 *     tags: [Poker]
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
 *             properties:
 *               character_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Успешно покинул комнату
 */
router.post('/poker/rooms/:id/leave', async (req: Request, res: Response) => {
  try {
    const room_id = parseInt(req.params.id);
    const { character_id } = req.body;
    
    const db = await initDB();
    
    // Проверяем комнату
    const room = await db.get('SELECT * FROM PokerRooms WHERE id = ?', [room_id]);
    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }
    
    // Проверяем игрока в комнате
    const player = await db.get('SELECT * FROM PokerPlayers WHERE room_id = ? AND character_id = ?', [room_id, character_id]);
    if (!player) {
      return res.status(404).json({ error: 'Вы не в этой комнате' });
    }
    
    // Если игра идет - помечаем игрока как исключенного (фолд + исключение)
    if (room.status === 'playing') {
      await db.run('UPDATE PokerPlayers SET status = ? WHERE id = ?', ['eliminated', player.id]);
      console.log(`Player ${character_id} left room ${room_id} during game (eliminated)`);
      
      // Проверяем, остались ли активные игроки для продолжения игры
      const activePlayers = await db.all('SELECT * FROM PokerPlayers WHERE room_id = ? AND status = ?', [room_id, 'active']);
      if (activePlayers.length <= 1 && room.current_hand_id) {
        // Завершаем текущую руку, если остался 1 или менее игроков
        await db.run('UPDATE PokerHands SET round_stage = ?, winner_id = ? WHERE id = ?', 
          ['finished', activePlayers[0]?.id || null, room.current_hand_id]);
      }
      
      await db.run('COMMIT');
      return res.json({ message: 'Вы покинули игру (исключены из текущей раздачи)' });
    }
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Возвращаем фишки как деньги
      await db.run('UPDATE Characters SET currency = currency + ? WHERE id = ?', [player.chips, character_id]);
      
      // Удаляем игрока
      await db.run('DELETE FROM PokerPlayers WHERE id = ?', [player.id]);
      
      // Если это был создатель и остались другие игроки, передаем создание первому
      if (room.creator_id === character_id) {
        const remainingPlayers = await db.all('SELECT * FROM PokerPlayers WHERE room_id = ? ORDER BY joined_at ASC', [room_id]);
        if (remainingPlayers.length > 0) {
          await db.run('UPDATE PokerRooms SET creator_id = ? WHERE id = ?', [remainingPlayers[0].character_id, room_id]);
        } else {
          // Если никого не осталось, удаляем комнату
          await db.run('DELETE FROM PokerRooms WHERE id = ?', [room_id]);
        }
      }
      
      await db.run('COMMIT');
      
      res.json({ 
        message: 'Успешно покинули комнату',
        returned_chips: player.chips
      });
      
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to leave poker room:', error);
    res.status(500).json({ error: 'Не удалось покинуть комнату' });
  }
});

/**
 * @swagger
 * /api/poker/rooms/{id}:
 *   get:
 *     summary: Получить информацию о покерной комнате
 *     tags: [Poker]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Информация о комнате
 */
router.get('/poker/rooms/:id', async (req: Request, res: Response) => {
  try {
    const room_id = parseInt(req.params.id);
    
    const db = await initDB();
    
    // Получаем информацию о комнате
    const room = await db.get(`
      SELECT 
        pr.*,
        c.character_name as creator_name
      FROM PokerRooms pr
      LEFT JOIN Characters c ON pr.creator_id = c.id
      WHERE pr.id = ?
    `, [room_id]);
    
    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }
    
    // Получаем игроков
    const players = await db.all(`
      SELECT 
        pp.*,
        c.character_name
      FROM PokerPlayers pp
      LEFT JOIN Characters c ON pp.character_id = c.id
      WHERE pp.room_id = ?
      ORDER BY pp.seat_position
    `, [room_id]);
    
    // Получаем текущую раздачу если есть
    let currentHand = null;
    if (room.current_hand_id) {
      currentHand = await db.get('SELECT * FROM PokerHands WHERE id = ?', [room.current_hand_id]);
      if (currentHand) {
        const { stringToCard } = await import('./pokerLogic.js');
        currentHand.community_cards = JSON.parse(currentHand.community_cards).map(stringToCard);
        currentHand.side_pots = JSON.parse(currentHand.side_pots);
      }
    }
    
    res.json({
      room,
      players,
      currentHand
    });
    
  } catch (error) {
    console.error('Failed to get poker room info:', error);
    res.status(500).json({ error: 'Не удалось загрузить информацию о комнате' });
  }
});

/**
 * @swagger
 * /api/poker/rooms/{id}/start:
 *   post:
 *     summary: Начать игру в покерной комнате
 *     tags: [Poker]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Игра началась
 */
router.post('/poker/rooms/:id/start', async (req: Request, res: Response) => {
  try {
    const room_id = parseInt(req.params.id);
    
    const db = await initDB();
    
    // Проверяем комнату
    const room = await db.get('SELECT * FROM PokerRooms WHERE id = ? AND status = "waiting"', [room_id]);
    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена или игра уже началась' });
    }
    
    // Проверяем количество игроков (минимум 2)
    const players = await db.all('SELECT * FROM PokerPlayers WHERE room_id = ? AND status = "active" ORDER BY seat_position', [room_id]);
    if (players.length < 2) {
      return res.status(400).json({ error: 'Недостаточно игроков для начала игры (минимум 2)' });
    }
    
    // Определяем позиции блайндов
    const dealerPosition = 1; // Первая игра - дилер на позиции 1
    const smallBlindPosition = dealerPosition === players.length ? 1 : dealerPosition + 1;
    const bigBlindPosition = smallBlindPosition === players.length ? 1 : smallBlindPosition + 1;
    
    // Проверяем, что у игроков достаточно фишек для блайндов
    const smallBlindPlayer = players.find(p => p.seat_position === smallBlindPosition);
    const bigBlindPlayer = players.find(p => p.seat_position === bigBlindPosition);
    
    if (!smallBlindPlayer || !bigBlindPlayer) {
      return res.status(400).json({ error: 'Ошибка в определении позиций блайндов' });
    }
    
    if (smallBlindPlayer.chips < room.small_blind) {
      return res.status(400).json({ 
        error: `У игрока ${smallBlindPlayer.character_name} недостаточно фишек для малого блайнда (${room.small_blind} 💰)` 
      });
    }
    
    if (bigBlindPlayer.chips < room.big_blind) {
      return res.status(400).json({ 
        error: `У игрока ${bigBlindPlayer.character_name} недостаточно фишек для большого блайнда (${room.big_blind} 💰)` 
      });
    }
    
    // Проверяем, что у всех игроков есть хотя бы минимальное количество фишек
    const minimumChips = room.big_blind;
    const playersWithoutChips = players.filter(p => p.chips < minimumChips);
    if (playersWithoutChips.length > 0) {
      return res.status(400).json({ 
        error: `Некоторые игроки имеют недостаточно фишек для игры (минимум ${minimumChips} 💰)` 
      });
    }
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Создаем первую раздачу (позиции уже определены выше)
      
      const handResult = await db.run(`
        INSERT INTO PokerHands 
        (room_id, hand_number, dealer_position, small_blind_position, big_blind_position, current_player_position)
        VALUES (?, 1, ?, ?, ?, ?)
      `, [room_id, dealerPosition, smallBlindPosition, bigBlindPosition, bigBlindPosition]);
      
      const hand_id = handResult.lastID;
      
      // Создаем и тасуем колоду
      const { createDeck, cardToString } = await import('./pokerLogic.js');
      const deck = createDeck();
      
      // Раздаем карты игрокам (по 2 карты каждому)
      for (let i = 0; i < players.length; i++) {
        const card1 = deck.pop()!;
        const card2 = deck.pop()!;
        
        await db.run(`
          INSERT INTO PokerPlayerCards (hand_id, player_id, card1, card2)
          VALUES (?, ?, ?, ?)
        `, [hand_id, players[i].id, cardToString(card1), cardToString(card2)]);
      }
      
      // Сохраняем состояние колоды
      const deckState = deck.map(cardToString);
      await db.run('UPDATE PokerHands SET deck_state = ? WHERE id = ?', [JSON.stringify(deckState), hand_id]);
      
      // Устанавливаем блайнды
      const smallBlindPlayer = players.find(p => p.seat_position === smallBlindPosition)!;
      const bigBlindPlayer = players.find(p => p.seat_position === bigBlindPosition)!;
      
      // Малый блайнд
      await db.run(`
        INSERT INTO PokerActions (hand_id, player_id, action_type, amount, round_stage, action_order)
        VALUES (?, ?, 'small_blind', ?, 'preflop', 1)
      `, [hand_id, smallBlindPlayer.id, room.small_blind]);
      
      // Большой блайнд
      await db.run(`
        INSERT INTO PokerActions (hand_id, player_id, action_type, amount, round_stage, action_order)
        VALUES (?, ?, 'big_blind', ?, 'preflop', 2)
      `, [hand_id, bigBlindPlayer.id, room.big_blind]);
      
      // Обновляем состояние комнаты и раздачи
      await db.run('UPDATE PokerRooms SET status = "playing", current_hand_id = ? WHERE id = ?', [hand_id, room_id]);
      await db.run('UPDATE PokerHands SET pot = ?, current_bet = ? WHERE id = ?', [
        room.small_blind + room.big_blind, 
        room.big_blind, 
        hand_id
      ]);
      
      await db.run('COMMIT');
      
      res.json({ 
        message: 'Игра началась!',
        hand_id,
        dealer_position: dealerPosition,
        small_blind_position: smallBlindPosition,
        big_blind_position: bigBlindPosition
      });
      
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to start poker game:', error);
    res.status(500).json({ error: 'Не удалось начать игру' });
  }
});

/**
 * @swagger
 * /api/poker/hands/{id}/action:
 *   post:
 *     summary: Сделать ход в покере
 *     tags: [Poker]
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
 *             properties:
 *               player_id:
 *                 type: integer
 *               action:
 *                 type: string
 *                 enum: [fold, call, raise, check, all_in]
 *               amount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ход сделан успешно
 */
// СТАРЫЙ API УДАЛЕН - ИСПОЛЬЗУЕМ /simple-action

// Заменён на /poker/hands/:id/simple-action (см. ниже)

/**
  try {
    const hand_id = parseInt(req.params.id);
    const { player_id, action, amount = 0 } = req.body;
    
    // Базовая валидация входных данных
    if (!player_id || !action) {
      return res.status(400).json({ error: 'player_id и action обязательны' });
    }
    
    if (isNaN(hand_id) || hand_id <= 0) {
      return res.status(400).json({ error: 'Некорректный ID раздачи' });
    }
    
    if (isNaN(player_id) || player_id <= 0) {
      return res.status(400).json({ error: 'Некорректный ID игрока' });
    }
    
    const validActions = ['fold', 'call', 'raise', 'check', 'all_in'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Недопустимое действие' });
    }
    
    if (action === 'raise' && (!amount || amount <= 0)) {
      return res.status(400).json({ error: 'Для рейза необходимо указать корректную сумму' });
    }
    
    const db = await initDB();
    
    // Получаем информацию о раздаче
    const hand = await db.get('SELECT * FROM PokerHands WHERE id = ?', [hand_id]);
    if (!hand) {
      return res.status(404).json({ error: 'Раздача не найдена' });
    }
    
    if (hand.round_stage === 'finished') {
      return res.status(400).json({ error: 'Раздача уже завершена' });
    }
    
    // Проверяем, что сейчас ход этого игрока
    if (hand.current_player_position) {
      const currentPlayer = await db.get('SELECT * FROM PokerPlayers WHERE room_id = ? AND seat_position = ?', [hand.room_id, hand.current_player_position]);
      if (!currentPlayer || currentPlayer.id !== player_id) {
        return res.status(400).json({ error: 'Сейчас не ваш ход' });
      }
    }
    
    // Проверяем игрока
    const player = await db.get('SELECT * FROM PokerPlayers WHERE id = ? AND room_id = ?', [player_id, hand.room_id]);
    if (!player) {
      return res.status(404).json({ error: 'Игрок не найден в этой комнате' });
    }
    
    if (player.status !== 'active') {
      return res.status(400).json({ error: 'Игрок не активен' });
    }
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Получаем текущий порядок действий
      const lastAction = await db.get('SELECT MAX(action_order) as max_order FROM PokerActions WHERE hand_id = ?', [hand_id]);
      const nextOrder = (lastAction?.max_order || 0) + 1;
      
      // Валидируем и выполняем действие
      let actionAmount = 0;
      let newPlayerStatus = player.status;
      
      // Проверяем, что игрок не совершал уже действие в этом раунде
      const playerActionsThisRound = await db.all(`
        SELECT * FROM PokerActions 
        WHERE hand_id = ? AND player_id = ? AND round_stage = ?
      `, [hand_id, player_id, hand.round_stage]);
      
      // Проверяем, может ли игрок делать действия
      const totalPlayerBet = playerActionsThisRound.reduce((sum, a) => sum + a.amount, 0);
      const lastPlayerAction = playerActionsThisRound[playerActionsThisRound.length - 1];
      
      // Если игрок уже поставил нужную сумму и последнее действие не fold
      if (totalPlayerBet >= hand.current_bet && lastPlayerAction && lastPlayerAction.action_type !== 'fold') {
        // Разрешаем только fold или raise
        if (action !== 'fold' && action !== 'raise') {
          throw new Error('Вы уже уровняли ставку. Можете только сделать фолд или рейз');
        }
      }
      
      // Не разрешаем дублировать одинаковые действия подряд
      if (lastPlayerAction && lastPlayerAction.action_type === action && action !== 'call') {
        throw new Error('Нельзя повторить то же действие');
      }

      switch (action) {
        case 'fold':
          newPlayerStatus = 'folded';
          break;
          
        case 'check':
          if (hand.current_bet > 0) {
            throw new Error('Нельзя чекать при наличии ставки');
          }
          // Проверяем, что игрок уже не ставил в этом раунде
          const playerBetForCheck = playerActionsThisRound.reduce((sum, a) => sum + a.amount, 0);
          if (playerBetForCheck > 0) {
            throw new Error('Нельзя чекать после ставки');
          }
          break;
          
        case 'call':
          // Рассчитываем сколько нужно доставить
          const playerBetThisRound = playerActionsThisRound.reduce((sum, a) => sum + a.amount, 0);
          actionAmount = Math.max(0, hand.current_bet - playerBetThisRound);
          
          if (hand.current_bet === 0) {
            throw new Error('Нет ставки для колла. Используйте "чек"');
          }
          
          if (actionAmount <= 0) {
            throw new Error('Вы уже уровняли ставку. Можете сделать фолд или рейз');
          }
          
          if (actionAmount > player.chips) {
            throw new Error('Недостаточно фишек для колла');
          }
          break;
          
        case 'raise':
          if (!amount || typeof amount !== 'number') {
            throw new Error('Размер рейза должен быть числом');
          }
          
          // Получаем информацию о комнате для минимального рейза
          const room = await db.get('SELECT * FROM PokerRooms WHERE id = ?', [hand.room_id]);
          const minRaise = Math.max(hand.current_bet * 2, room.big_blind);
          
          if (amount < minRaise) {
            throw new Error(`Минимальный рейз: ${minRaise} 💰`);
          }
          
          if (amount > player.chips) {
            throw new Error('Недостаточно фишек для рейза');
          }
          
          actionAmount = amount;
          break;
          
        case 'all_in':
          if (player.chips <= 0) {
            throw new Error('У вас нет фишек для all-in');
          }
          actionAmount = player.chips;
          break;
          
        default:
          throw new Error('Неизвестное действие');
      }
      
      // Записываем действие
      await db.run(`
        INSERT INTO PokerActions (hand_id, player_id, action_type, amount, round_stage, action_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [hand_id, player_id, action, actionAmount, hand.round_stage, nextOrder]);
      
      // Обновляем фишки игрока и банк
      if (actionAmount > 0) {
        await db.run('UPDATE PokerPlayers SET chips = chips - ? WHERE id = ?', [actionAmount, player_id]);
        await db.run('UPDATE PokerHands SET pot = pot + ? WHERE id = ?', [actionAmount, hand_id]);
        
        // Обновляем текущую ставку если нужно
        if (actionAmount > hand.current_bet) {
          await db.run('UPDATE PokerHands SET current_bet = ? WHERE id = ?', [actionAmount, hand_id]);
        }
      }
      
      // Обновляем статус игрока
      if (newPlayerStatus !== player.status) {
        await db.run('UPDATE PokerPlayers SET status = ? WHERE id = ?', [newPlayerStatus, player_id]);
      }
      
      // Определяем следующего игрока
      const activePlayers = await db.all(`
        SELECT pp.* FROM PokerPlayers pp 
        WHERE pp.room_id = ? AND pp.status = 'active'
        ORDER BY pp.seat_position
      `, [hand.room_id]);
      
      let nextPlayerPosition = null;
      if (activePlayers.length > 1) {
        const currentIndex = activePlayers.findIndex(p => p.seat_position === hand.current_player_position);
        const nextIndex = (currentIndex + 1) % activePlayers.length;
        nextPlayerPosition = activePlayers[nextIndex].seat_position;
      }
      
      // Проверяем, завершился ли круг торгов
      const roundActions = await db.all(`
        SELECT * FROM PokerActions 
        WHERE hand_id = ? AND round_stage = ? 
        ORDER BY action_order
      `, [hand_id, hand.round_stage]);
      
      const playersActed = new Set(roundActions.map(a => a.player_id));
      const needToAct = activePlayers.filter(p => !playersActed.has(p.id) || 
        (roundActions.find(a => a.player_id === p.id)?.amount || 0) < hand.current_bet);
      
      if (needToAct.length === 0 || activePlayers.length === 1) {
        // Переходим к следующему этапу или завершаем раздачу
        const nextStage = getNextStage(hand.round_stage);
        
        if (nextStage === 'finished' || activePlayers.length === 1) {
          // Завершаем раздачу и определяем победителя
          // await finishHand(db, parseInt(hand_id)); // УДАЛЕНО - старый API
        } else {
          // Переходим к следующему этапу
          // await advanceToNextStage(db, parseInt(hand_id), hand.round_stage); // УДАЛЕНО - старый API
        }
      } else {
        // Обновляем текущего игрока
        await db.run('UPDATE PokerHands SET current_player_position = ? WHERE id = ?', [nextPlayerPosition, hand_id]);
      }
      
      await db.run('COMMIT');
      
      res.json({ 
        message: 'Ход сделан успешно',
        action,
        amount: actionAmount,
        next_stage: hand.round_stage
      });
      
    } catch (error: any) {
      await db.run('ROLLBACK');
      
      // Определяем тип ошибки для корректного HTTP статуса
      if (error.message) {
        const userErrors = [
          'Нельзя чекать при наличии ставки',
          'Нельзя чекать после ставки',
          'Недостаточно фишек',
          'Размер рейза должен быть больше',
          'Минимальный рейз',
          'Нет ставки для колла',
          'У вас нет фишек',
          'Вы уже сделали ход',
          'Размер рейза должен быть числом'
        ];
        
        const isUserError = userErrors.some(errText => error.message.includes(errText));
        const statusCode = isUserError ? 400 : 500;
        
        return res.status(statusCode).json({ 
          error: error.message,
          type: isUserError ? 'validation_error' : 'server_error'
        });
      }
      
      console.error('Failed to make poker action (transaction):', error);
      return res.status(500).json({ 
        error: 'Внутренняя ошибка сервера при выполнении хода',
        type: 'server_error'
      });
    }
    
  } catch (error: any) {
    console.error('Failed to make poker action:', error);
    
    // Проверяем, не отправили ли мы уже ответ
    if (res.headersSent) {
      return;
    }
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      error: error.message || 'Не удалось сделать ход',
      type: statusCode === 500 ? 'server_error' : 'client_error'
    });
  }
});

/**
 * @swagger
 * /api/poker/hands/{id}/cards/{player_id}:
 *   get:
 *     summary: Получить карты игрока
 *     tags: [Poker]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: player_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Карты игрока
 */
router.get('/poker/hands/:id/cards/:player_id', async (req: Request, res: Response) => {
  try {
    const hand_id = parseInt(req.params.id);
    const player_id = parseInt(req.params.player_id);
    
    const db = await initDB();
    
    // Получаем карты игрока
    const playerCards = await db.get('SELECT * FROM PokerPlayerCards WHERE hand_id = ? AND player_id = ?', [hand_id, player_id]);
    
    if (!playerCards) {
      return res.status(404).json({ error: 'Карты не найдены' });
    }
    
    const { stringToCard } = await import('./pokerLogic.js');
    const cards = [
      stringToCard(playerCards.card1),
      stringToCard(playerCards.card2)
    ];
    
    res.json({ cards });
    
  } catch (error) {
    console.error('Failed to get player cards:', error);
    res.status(500).json({ error: 'Не удалось получить карты' });
  }
});

// Вспомогательные функции
function getNextStage(currentStage: string): string {
  switch (currentStage) {
    case 'preflop': return 'flop';
    case 'flop': return 'turn';
    case 'turn': return 'river';
    case 'river': return 'showdown';
    default: return 'finished';
  }
}


// СТАРАЯ ФУНКЦИЯ УДАЛЕНА - ИСПОЛЬЗУЕМ НОВУЮ НИЖЕ

/**
 * @swagger
 * /api/poker/rooms/{id}:
 *   delete:
 *     summary: Удалить покерную комнату
 *     tags: [Poker]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             character_id:
 *               type: integer
 *     responses:
 *       200:
 *         description: Комната успешно удалена
 *       403:
 *         description: Только создатель может удалить комнату
 *       404:
 *         description: Комната не найдена
 */
router.delete('/poker/rooms/:id', async (req: Request, res: Response) => {
  try {
    const room_id = parseInt(req.params.id);
    const { character_id } = req.body; // ID персонажа, который пытается удалить

    const db = await initDB();

    const room = await db.get('SELECT * FROM PokerRooms WHERE id = ?', [room_id]);
    if (!room) {
      return res.status(404).json({ error: 'Комната не найдена' });
    }

    if (room.creator_id !== character_id) {
      return res.status(403).json({ error: 'Только создатель может удалить комнату' });
    }
    
    if (room.status === 'playing') {
      return res.status(400).json({ error: 'Нельзя удалить комнату во время игры' });
    }

    // Возвращаем buy-in всем игрокам в комнате
    const players = await db.all('SELECT * FROM PokerPlayers WHERE room_id = ?', [room_id]);
    for (const player of players) {
      await db.run('UPDATE Characters SET currency = currency + ? WHERE id = ?', [room.buy_in, player.character_id]);
    }

    // Удаляем комнату (игроки удалятся каскадно)
    await db.run('DELETE FROM PokerRooms WHERE id = ?', [room_id]);

    res.json({ message: 'Комната успешно удалена' });
  } catch (error) {
    console.error('Failed to delete room:', error);
    res.status(500).json({ error: 'Не удалось удалить комнату' });
  }
});

// POST /api/admin/market/reset - Полный сброс биржи (только для админов)
router.post('/admin/market/reset', async (req: Request, res: Response) => {
  try {
    const adminId = req.headers['x-admin-id'] as string;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Админ ID не указан' });
    }

    const db = await initDB();
    
    console.log('Starting market reset by admin:', adminId);
    
    // Включаем WAL режим для предотвращения блокировок
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA busy_timeout = 10000'); // 10 секунд ожидания
    
    // Начинаем транзакцию для атомарности операции
    await db.run('BEGIN TRANSACTION');
    
    // 1. Обнуляем валюту у всех персонажей
    await db.run('UPDATE Characters SET currency = 0');
    console.log('✓ Валюта всех персонажей обнулена');
    
    // 2. Удаляем все портфели (акции)
    await db.run('DELETE FROM Portfolios');
    console.log('✓ Все акции удалены');
    
    // 3. Удаляем все шорты
    await db.run('DELETE FROM ShortPositions');
    console.log('✓ Все шорты удалены');
    
    // 4. Удаляем все ордера
    await db.run('DELETE FROM TradingOrders');
    console.log('✓ Все ордера удалены');
    
    // 5. Сбрасываем цены акций к базовым значениям и максимальное количество
    const basePrice = 100; // Базовая цена
    const maxShares = 1000000; // Максимальное количество акций
    
    await db.run(`
      UPDATE Stocks SET 
        current_price = ?, 
        total_shares = ?
    `, [basePrice, maxShares]);
    console.log('✓ Цены и количество акций сброшены к базовым');
    
    // 6. Очищаем историю торгов
    await db.run('DELETE FROM Trades');
    console.log('✓ История торгов очищена');
    
    // 7. Очищаем историю цен
    await db.run('DELETE FROM StockPriceHistory');
    console.log('✓ История цен очищена');
    
    // Добавляем базовую запись в историю цен для каждой акции
    const stocks = await db.all('SELECT id FROM Stocks');
    for (const stock of stocks) {
      await db.run(
        'INSERT INTO StockPriceHistory (stock_id, price, timestamp) VALUES (?, ?, ?)',
        [stock.id, basePrice, new Date().toISOString()]
      );
    }
    console.log('✓ Базовая история цен создана');
    
    // Подтверждаем транзакцию
    await db.run('COMMIT');
    console.log('Market reset completed successfully');
    
    res.json({ 
      message: 'Биржа полностью сброшена',
      details: {
        currency_reset: true,
        portfolios_cleared: true,
        shorts_cleared: true,
        orders_cleared: true,
        prices_reset: true,
        shares_reset: true,
        history_cleared: true
      }
    });
  } catch (error) {
    console.error('Market reset failed:', error);
    try {
      const db = await initDB();
      await db.run('ROLLBACK');
      console.log('Transaction rolled back');
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
    }
    res.status(500).json({ error: 'Ошибка при сбросе биржи' });
  }
});

// GET /api/poker/hands/:id/timeout-check - Проверка таймаута хода
router.get('/poker/hands/:id/timeout-check', async (req: Request, res: Response) => {
  const { id: hand_id } = req.params;
  
  const db = await initDB();
  
  try {
    const hand = await db.get('SELECT * FROM PokerHands WHERE id = ?', [hand_id]);
    if (!hand || hand.round_stage === 'finished') {
      return res.status(404).json({ error: 'Раздача не найдена или завершена' });
    }

    const now = new Date().toISOString();
    const timeoutExpired = hand.turn_timeout_at && hand.turn_timeout_at < now;

    if (timeoutExpired && hand.current_player_position) {
      // Автоматически делаем фолд для игрока, превысившего таймаут
      const timedOutPlayer = await db.get('SELECT * FROM PokerPlayers WHERE room_id = ? AND seat_position = ?', 
        [hand.room_id, hand.current_player_position]);

      if (timedOutPlayer && timedOutPlayer.status === 'active') {
        await db.run('BEGIN TRANSACTION');
        
        // Помечаем игрока как сбросившего
        await db.run('UPDATE PokerPlayers SET status = ? WHERE id = ?', ['folded', timedOutPlayer.id]);
        
        // Записываем действие фолда
        const nextOrder = await db.get('SELECT MAX(action_order) as max_order FROM PokerActions WHERE hand_id = ?', [hand_id]);
        await db.run(`
          INSERT INTO PokerActions (hand_id, player_id, action_type, amount, round_stage, action_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [hand_id, timedOutPlayer.id, 'fold', 0, hand.round_stage, (nextOrder?.max_order || 0) + 1]);

        // Определяем следующего игрока
        const roomPlayers = await db.all('SELECT * FROM PokerPlayers WHERE room_id = ? AND status IN (?, ?)', [hand.room_id, 'active', 'all_in']);
        const { getNextActivePlayer } = await import('./pokerLogic.js');
        const nextPlayer = getNextActivePlayer(roomPlayers, timedOutPlayer.seat_position);
        
        if (nextPlayer) {
          const timeoutAt = new Date(Date.now() + 60000).toISOString();
          await db.run('UPDATE PokerHands SET current_player_position = ?, turn_timeout_at = ? WHERE id = ?', 
            [nextPlayer.seat_position, timeoutAt, hand_id]);
        } else {
          // Если нет следующего игрока, завершаем раздачу
          await finishHand(db, parseInt(hand_id));
        }

        await db.run('COMMIT');
        
        res.json({ 
          timeout_expired: true, 
          action_taken: 'fold',
          timed_out_player: timedOutPlayer.id 
        });
      } else {
        res.json({ timeout_expired: false });
      }
    } else {
      res.json({ timeout_expired: false });
    }

  } catch (error) {
    console.error('Timeout check failed:', error);
    res.status(500).json({ error: 'Ошибка при проверке таймаута' });
  }
});

// NEW SIMPLIFIED POKER ACTION API
// POST /api/poker/hands/:id/simple-action - Упрощенный API для покерных действий
router.post('/poker/hands/:id/simple-action', async (req: Request, res: Response) => {
  const { id: hand_id } = req.params;
  const { player_id, action, amount } = req.body;

  if (!player_id || !action) {
    return res.status(400).json({ error: 'player_id и action обязательны', type: 'validation_error' });
  }

  const db = await initDB();
  
  try {
    await db.run('BEGIN TRANSACTION');

    // Получаем раздачу
    const hand = await db.get('SELECT * FROM PokerHands WHERE id = ?', [hand_id]);
    if (!hand || hand.round_stage === 'finished') {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Раздача завершена или не найдена', type: 'validation_error' });
    }

    // Получаем игрока
    const player = await db.get('SELECT * FROM PokerPlayers WHERE id = ? AND room_id = ?', [player_id, hand.room_id]);
    if (!player || player.status !== 'active') {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Игрок не найден или не активен', type: 'validation_error' });
    }

    // Проверяем, что сейчас ход этого игрока
    if (hand.current_player_position !== player.seat_position) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Сейчас не ваш ход', type: 'validation_error' });
    }

    // Получаем ставки игрока в текущем раунде
    const playerBetsThisRound = await db.all(`
      SELECT SUM(amount) as total_bet FROM PokerActions 
      WHERE hand_id = ? AND player_id = ? AND round_stage = ?
    `, [hand_id, player_id, hand.round_stage]);
    
    const playerTotalBet = playerBetsThisRound[0]?.total_bet || 0;
    const callAmount = Math.max(0, hand.current_bet - playerTotalBet);

    let actionAmount = 0;
    let newPlayerStatus = player.status;

    // Обрабатываем действие
    switch (action) {
      case 'fold':
        newPlayerStatus = 'folded';
        break;

      case 'check':
        if (hand.current_bet > playerTotalBet) {
          await db.run('ROLLBACK');
          return res.status(400).json({ error: 'Нельзя чекать при наличии ставки. Используйте колл или фолд', type: 'validation_error' });
        }
        break;

      case 'call':
        if (callAmount <= 0) {
          await db.run('ROLLBACK');
          return res.status(400).json({ error: 'Нет ставки для колла. Используйте чек', type: 'validation_error' });
        }
        
        actionAmount = Math.min(callAmount, player.chips);
        if (actionAmount === player.chips) {
          newPlayerStatus = 'all_in';
        }
        break;

      case 'raise':
        if (!amount || amount <= hand.current_bet) {
          await db.run('ROLLBACK');
          return res.status(400).json({ error: 'Размер рейза должен быть больше текущей ставки', type: 'validation_error' });
        }
        
        const raiseAmount = amount - playerTotalBet;
        if (raiseAmount > player.chips) {
          await db.run('ROLLBACK');
          return res.status(400).json({ error: 'Недостаточно фишек для рейза', type: 'validation_error' });
        }
        
        actionAmount = raiseAmount;
        if (actionAmount === player.chips) {
          newPlayerStatus = 'all_in';
        }
        
        // Обновляем текущую ставку
        await db.run('UPDATE PokerHands SET current_bet = ? WHERE id = ?', [amount, hand_id]);
        break;

      case 'all_in':
        actionAmount = player.chips;
        newPlayerStatus = 'all_in';
        
        const newBet = playerTotalBet + actionAmount;
        if (newBet > hand.current_bet) {
          await db.run('UPDATE PokerHands SET current_bet = ? WHERE id = ?', [newBet, hand_id]);
        }
        break;

      default:
        await db.run('ROLLBACK');
        return res.status(400).json({ error: 'Неизвестное действие', type: 'validation_error' });
    }

    // Записываем действие
    const nextOrder = await db.get('SELECT MAX(action_order) as max_order FROM PokerActions WHERE hand_id = ?', [hand_id]);
    await db.run(`
      INSERT INTO PokerActions (hand_id, player_id, action_type, amount, round_stage, action_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [hand_id, player_id, action, actionAmount, hand.round_stage, (nextOrder?.max_order || 0) + 1]);

    // Обновляем фишки и статус игрока
    if (actionAmount > 0) {
      await db.run('UPDATE PokerPlayers SET chips = chips - ? WHERE id = ?', [actionAmount, player_id]);
      await db.run('UPDATE PokerHands SET pot = pot + ? WHERE id = ?', [actionAmount, hand_id]);
    }
    
    if (newPlayerStatus !== player.status) {
      await db.run('UPDATE PokerPlayers SET status = ? WHERE id = ?', [newPlayerStatus, player_id]);
    }

    // Проверяем, закончился ли раунд торгов
    const activePlayers = await db.all('SELECT * FROM PokerPlayers WHERE room_id = ? AND status IN (?, ?)', [hand.room_id, 'active', 'all_in']);
    const allPlayersActed = await checkIfAllPlayersActed(db, parseInt(hand_id), hand.round_stage, activePlayers);
    
    let nextPlayer = null;
    
    if (allPlayersActed || activePlayers.filter(p => p.status === 'active').length === 0) {
      // Переходим к следующей стадии или завершаем
      await advanceToNextStage(db, parseInt(hand_id), hand.round_stage);
    } else {
      // Определяем следующего игрока для продолжения текущего раунда
      // Берем только активных игроков (которые могут делать ходы)
      const activePlayersOnly = await db.all('SELECT * FROM PokerPlayers WHERE room_id = ? AND status = ?', [hand.room_id, 'active']);
      const { getNextActivePlayer } = await import('./pokerLogic.js');
      nextPlayer = getNextActivePlayer(activePlayersOnly, player.seat_position);
      
      if (nextPlayer) {
        // Устанавливаем таймаут на ход (60 секунд)
        const timeoutAt = new Date(Date.now() + 60000).toISOString();
        await db.run('UPDATE PokerHands SET current_player_position = ?, turn_timeout_at = ? WHERE id = ?', 
          [nextPlayer.seat_position, timeoutAt, hand_id]);
      }
    }

    await db.run('COMMIT');
    
    res.json({ 
      message: 'Действие выполнено',
      action,
      amount: actionAmount,
      next_player: nextPlayer ? nextPlayer.seat_position : null
    });

  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Poker action failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Ошибка сервера', type: 'server_error' });
  }
});

// Вспомогательные функции
async function checkIfAllPlayersActed(db: any, hand_id: number, round_stage: string, activePlayers: any[]): Promise<boolean> {
  // Простая проверка: все активные игроки поставили одинаковую сумму или сбросили/олл-ин
  for (const player of activePlayers) {
    if (player.status === 'active') {
      const playerBet = await db.get(`
        SELECT SUM(amount) as total_bet FROM PokerActions 
        WHERE hand_id = ? AND player_id = ? AND round_stage = ?
      `, [hand_id, player.id, round_stage]);
      
      const currentBet = await db.get('SELECT current_bet FROM PokerHands WHERE id = ?', [hand_id]);
      
      if ((playerBet?.total_bet || 0) < currentBet.current_bet) {
        return false; // Этот игрок еще не уровнял ставку
      }
    }
  }
  return true;
}

async function advanceToNextStage(db: any, hand_id: number, current_stage: string) {
  const stages = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const currentIndex = stages.indexOf(current_stage);
  
  if (currentIndex >= 0 && currentIndex < stages.length - 1) {
    const nextStage = stages[currentIndex + 1];
    await db.run('UPDATE PokerHands SET round_stage = ?, current_bet = 0 WHERE id = ?', [nextStage, hand_id]);
    
    // Сбрасываем позицию хода на первого активного игрока
    const firstActivePlayer = await db.get(`
      SELECT seat_position FROM PokerPlayers 
      WHERE room_id = (SELECT room_id FROM PokerHands WHERE id = ?) 
      AND status = 'active' 
      ORDER BY seat_position ASC LIMIT 1
    `, [hand_id]);
    
    if (firstActivePlayer) {
      // Устанавливаем таймаут на ход (60 секунд)
      const timeoutAt = new Date(Date.now() + 60000).toISOString();
      await db.run('UPDATE PokerHands SET current_player_position = ?, turn_timeout_at = ? WHERE id = ?', 
        [firstActivePlayer.seat_position, timeoutAt, hand_id]);
    }
    
    // Добавляем общие карты если нужно
    if (nextStage === 'flop') {
      await dealCommunityCards(db, hand_id, 3);
    } else if (nextStage === 'turn' || nextStage === 'river') {
      await dealCommunityCards(db, hand_id, 1);
    } else if (nextStage === 'showdown') {
      await finishHand(db, hand_id);
    }
  } else {
    // Завершаем раздачу
    await finishHand(db, hand_id);
  }
}

async function dealCommunityCards(db: any, hand_id: number, count: number) {
  // Получаем текущую колоду
  const hand = await db.get('SELECT deck_state, community_cards FROM PokerHands WHERE id = ?', [hand_id]);
  const { stringToCard, cardToString } = await import('./pokerLogic.js');
  
  let deck = hand.deck_state ? JSON.parse(hand.deck_state) : [];
  let communityCards = hand.community_cards ? JSON.parse(hand.community_cards) : [];
  
  // Добавляем карты
  for (let i = 0; i < count && deck.length > 0; i++) {
    communityCards.push(deck.pop());
  }
  
  await db.run('UPDATE PokerHands SET deck_state = ?, community_cards = ? WHERE id = ?', [
    JSON.stringify(deck),
    JSON.stringify(communityCards),
    hand_id
  ]);
}

async function finishHand(db: any, hand_id: number) {
  // Определяем победителя и завершаем раздачу
  await db.run('UPDATE PokerHands SET round_stage = ? WHERE id = ?', ['finished', hand_id]);
  
  // Простая логика: последний активный игрок выигрывает
  const winner = await db.get(`
    SELECT p.*, h.pot FROM PokerPlayers p
    JOIN PokerHands h ON h.room_id = p.room_id
    WHERE h.id = ? AND p.status IN ('active', 'all_in')
    ORDER BY p.seat_position ASC LIMIT 1
  `, [hand_id]);
  
  if (winner) {
    await db.run('UPDATE PokerHands SET winner_id = ? WHERE id = ?', [winner.id, hand_id]);
    await db.run('UPDATE PokerPlayers SET chips = chips + ? WHERE id = ?', [winner.pot, winner.id]);
  }
}

// ========================================
// КРИПТОВАЛЮТЫ (Блокчейн Биржа)
// ========================================

// Получить все криптовалюты
router.get('/crypto/currencies', async (req, res) => {
  try {
    const db = await initDB();
    const cryptos = await db.all('SELECT * FROM CryptoCurrencies ORDER BY current_price DESC');
    await db.close();
    res.json(cryptos);
  } catch (error) {
    console.error('Error fetching cryptocurrencies:', error);
    res.status(500).json({ error: 'Failed to fetch cryptocurrencies' });
  }
});

// Получить конкретную крипту с графиком
router.get('/crypto/currencies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    const crypto = await db.get('SELECT * FROM CryptoCurrencies WHERE id = ?', [id]);
    if (!crypto) {
      await db.close();
      return res.status(404).json({ error: 'Cryptocurrency not found' });
    }

    // Получаем историю цен (последние 100 записей)
    const history = await db.all(`
      SELECT price, timestamp 
      FROM CryptoPriceHistory 
      WHERE crypto_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 100
    `, [id]);

    await db.close();
    res.json({ ...crypto, history: history.reverse() });
  } catch (error) {
    console.error('Error fetching cryptocurrency:', error);
    res.status(500).json({ error: 'Failed to fetch cryptocurrency' });
  }
});

// Получить портфель персонажа
router.get('/crypto/portfolio/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const db = await initDB();
    
    let portfolio = await db.get('SELECT * FROM CryptoPortfolios WHERE character_id = ?', [character_id]);
    
    // Создаём портфель если не существует
    if (!portfolio) {
      await db.run('INSERT INTO CryptoPortfolios (character_id, crypto_balances) VALUES (?, ?)', [character_id, '{}']);
      portfolio = { character_id, crypto_balances: '{}' };
    }

    // Парсим балансы
    const balances = JSON.parse(portfolio.crypto_balances || '{}');
    
    // Получаем текущие цены криптовалют
    const cryptos = await db.all('SELECT * FROM CryptoCurrencies');
    
    // Формируем детали портфеля
    const portfolioDetails = [];
    let totalValue = 0;

    for (const [cryptoId, balance] of Object.entries(balances)) {
      const crypto = cryptos.find((c: any) => c.id === parseInt(cryptoId));
      if (crypto && (balance as any).quantity > 0) {
        const currentValue = (balance as any).quantity * crypto.current_price;
        const costBasis = (balance as any).quantity * (balance as any).average_purchase_price;
        const profit = currentValue - costBasis;
        const profitPercent = (profit / costBasis) * 100;

        portfolioDetails.push({
          crypto_id: crypto.id,
          name: crypto.name,
          ticker_symbol: crypto.ticker_symbol,
          quantity: (balance as any).quantity,
          average_purchase_price: (balance as any).average_purchase_price,
          current_price: crypto.current_price,
          current_value: currentValue,
          profit,
          profit_percent: profitPercent
        });

        totalValue += currentValue;
      }
    }

    await db.close();
    res.json({
      character_id,
      total_value: totalValue,
      assets: portfolioDetails
    });
  } catch (error) {
    console.error('Error fetching crypto portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch crypto portfolio' });
  }
});

// Купить криптовалюту
router.post('/crypto/buy', async (req, res) => {
  try {
    const { character_id, crypto_id, quantity } = req.body;

    if (!character_id || !crypto_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const db = await initDB();

    // Получаем криптовалюту
    const crypto = await db.get('SELECT * FROM CryptoCurrencies WHERE id = ?', [crypto_id]);
    if (!crypto) {
      await db.close();
      return res.status(404).json({ error: 'Cryptocurrency not found' });
    }

    // Получаем персонажа
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      await db.close();
      return res.status(404).json({ error: 'Character not found' });
    }

    const totalCost = quantity * crypto.current_price;

    // Проверяем баланс
    if (character.currency < totalCost) {
      await db.close();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Списываем кредиты
    await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [totalCost, character_id]);

    // Обновляем портфель
    let portfolio = await db.get('SELECT * FROM CryptoPortfolios WHERE character_id = ?', [character_id]);
    if (!portfolio) {
      await db.run('INSERT INTO CryptoPortfolios (character_id, crypto_balances) VALUES (?, ?)', [character_id, '{}']);
      portfolio = { character_id, crypto_balances: '{}' };
    }

    const balances = JSON.parse(portfolio.crypto_balances || '{}');
    
    if (!balances[crypto_id]) {
      balances[crypto_id] = { quantity: 0, average_purchase_price: 0 };
    }

    // Обновляем среднюю цену покупки
    const oldTotalCost = balances[crypto_id].quantity * balances[crypto_id].average_purchase_price;
    const newTotalCost = oldTotalCost + totalCost;
    const newTotalQuantity = balances[crypto_id].quantity + quantity;
    
    balances[crypto_id].quantity = newTotalQuantity;
    balances[crypto_id].average_purchase_price = newTotalCost / newTotalQuantity;

    await db.run('UPDATE CryptoPortfolios SET crypto_balances = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?', 
      [JSON.stringify(balances), character_id]);

    // Записываем транзакцию
    await db.run(`
      INSERT INTO CryptoTransactions (character_id, crypto_id, transaction_type, quantity, price_per_coin, total_amount)
      VALUES (?, ?, 'buy', ?, ?, ?)
    `, [character_id, crypto_id, quantity, crypto.current_price, totalCost]);

    await db.close();
    res.json({ success: true, message: 'Cryptocurrency purchased successfully' });
  } catch (error) {
    console.error('Error buying cryptocurrency:', error);
    res.status(500).json({ error: 'Failed to buy cryptocurrency' });
  }
});

// Продать криптовалюту
router.post('/crypto/sell', async (req, res) => {
  try {
    const { character_id, crypto_id, quantity } = req.body;

    if (!character_id || !crypto_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const db = await initDB();

    // Получаем криптовалюту
    const crypto = await db.get('SELECT * FROM CryptoCurrencies WHERE id = ?', [crypto_id]);
    if (!crypto) {
      await db.close();
      return res.status(404).json({ error: 'Cryptocurrency not found' });
    }

    // Получаем портфель
    const portfolio = await db.get('SELECT * FROM CryptoPortfolios WHERE character_id = ?', [character_id]);
    if (!portfolio) {
      await db.close();
      return res.status(400).json({ error: 'No cryptocurrency holdings found' });
    }

    const balances = JSON.parse(portfolio.crypto_balances || '{}');
    
    if (!balances[crypto_id] || balances[crypto_id].quantity < quantity) {
      await db.close();
      return res.status(400).json({ error: 'Insufficient cryptocurrency balance' });
    }

    const totalProceeds = quantity * crypto.current_price;

    // Начисляем кредиты
    await db.run('UPDATE Characters SET currency = currency + ? WHERE id = ?', [totalProceeds, character_id]);

    // Обновляем портфель
    balances[crypto_id].quantity -= quantity;
    
    if (balances[crypto_id].quantity <= 0) {
      delete balances[crypto_id];
    }

    await db.run('UPDATE CryptoPortfolios SET crypto_balances = ?, updated_at = CURRENT_TIMESTAMP WHERE character_id = ?', 
      [JSON.stringify(balances), character_id]);

    // Записываем транзакцию
    await db.run(`
      INSERT INTO CryptoTransactions (character_id, crypto_id, transaction_type, quantity, price_per_coin, total_amount)
      VALUES (?, ?, 'sell', ?, ?, ?)
    `, [character_id, crypto_id, quantity, crypto.current_price, totalProceeds]);

    await db.close();
    res.json({ success: true, message: 'Cryptocurrency sold successfully' });
  } catch (error) {
    console.error('Error selling cryptocurrency:', error);
    res.status(500).json({ error: 'Failed to sell cryptocurrency' });
  }
});

// Получить историю транзакций
router.get('/crypto/transactions/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const db = await initDB();
    
    const transactions = await db.all(`
      SELECT t.*, c.name, c.ticker_symbol
      FROM CryptoTransactions t
      JOIN CryptoCurrencies c ON c.id = t.crypto_id
      WHERE t.character_id = ?
      ORDER BY t.created_at DESC
      LIMIT 100
    `, [character_id]);

    await db.close();
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching crypto transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Топ держателей криптовалют
router.get('/crypto/leaderboard', async (req, res) => {
  try {
    const db = await initDB();
    
    const portfolios = await db.all('SELECT * FROM CryptoPortfolios');
    const cryptos = await db.all('SELECT * FROM CryptoCurrencies');
    
    const leaderboard = [];

    for (const portfolio of portfolios) {
      const character = await db.get('SELECT id, character_name FROM Characters WHERE id = ?', [portfolio.character_id]);
      if (!character) continue;

      const balances = JSON.parse(portfolio.crypto_balances || '{}');
      let totalValue = 0;

      for (const [cryptoId, balance] of Object.entries(balances)) {
        const crypto = cryptos.find((c: any) => c.id === parseInt(cryptoId));
        if (crypto) {
          totalValue += (balance as any).quantity * crypto.current_price;
        }
      }

      if (totalValue > 0) {
        leaderboard.push({
          character_id: character.id,
          character_name: character.character_name,
          total_value: totalValue
        });
      }
    }

    // Сортируем по убыванию стоимости
    leaderboard.sort((a, b) => b.total_value - a.total_value);

    await db.close();
    res.json(leaderboard.slice(0, 10)); // Топ-10
  } catch (error) {
    console.error('Error fetching crypto leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Получить активные события
router.get('/crypto/events', async (req, res) => {
  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    const events = await db.all(`
      SELECT e.*, c.name as crypto_name, c.ticker_symbol
      FROM CryptoEvents e
      LEFT JOIN CryptoCurrencies c ON c.id = e.impacted_crypto_id
      WHERE e.end_time >= ?
      ORDER BY e.start_time DESC
    `, [now]);

    await db.close();
    res.json(events);
  } catch (error) {
    console.error('Error fetching crypto events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ========================================
// АДМИН ЭНДПОИНТЫ ДЛЯ КРИПТОВАЛЮТ
// ========================================

// Создать криптовалюту
router.post('/admin/crypto/create', async (req, res) => {
  try {
    const { name, ticker_symbol, description, current_price, base_volatility, total_supply } = req.body;

    if (!name || !ticker_symbol || !current_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();
    
    const result = await db.run(`
      INSERT INTO CryptoCurrencies (name, ticker_symbol, description, current_price, base_volatility, total_supply, circulating_supply)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, ticker_symbol, description, current_price, base_volatility || 0.15, total_supply || 1000000000, total_supply || 1000000000]);

    await db.close();
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating cryptocurrency:', error);
    res.status(500).json({ error: 'Failed to create cryptocurrency' });
  }
});

// Обновить криптовалюту
router.put('/admin/crypto/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ticker_symbol, description, current_price, base_volatility, total_supply } = req.body;

    const db = await initDB();
    
    await db.run(`
      UPDATE CryptoCurrencies 
      SET name = ?, ticker_symbol = ?, description = ?, current_price = ?, base_volatility = ?, total_supply = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, ticker_symbol, description, current_price, base_volatility, total_supply, id]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating cryptocurrency:', error);
    res.status(500).json({ error: 'Failed to update cryptocurrency' });
  }
});

// Удалить криптовалюту
router.delete('/admin/crypto/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    await db.run('DELETE FROM CryptoCurrencies WHERE id = ?', [id]);
    
    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting cryptocurrency:', error);
    res.status(500).json({ error: 'Failed to delete cryptocurrency' });
  }
});

// Создать событие
router.post('/admin/crypto/event', async (req, res) => {
  try {
    const { title, description, impacted_crypto_id, impact_strength, duration_hours } = req.body;

    if (!title || !description || impact_strength === undefined || !duration_hours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();
    
    const now = new Date();
    const endTime = new Date(now.getTime() + duration_hours * 60 * 60 * 1000);

    await db.run(`
      INSERT INTO CryptoEvents (title, description, impacted_crypto_id, impact_strength, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description, impacted_crypto_id || null, impact_strength, now.toISOString(), endTime.toISOString()]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating crypto event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Изменить волатильность
router.put('/admin/crypto/volatility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { base_volatility } = req.body;

    const db = await initDB();
    
    await db.run(`
      UPDATE CryptoCurrencies 
      SET base_volatility = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [base_volatility, id]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating volatility:', error);
    res.status(500).json({ error: 'Failed to update volatility' });
  }
});

// Сбросить рынок криптовалют
router.post('/admin/crypto/reset', async (req, res) => {
  try {
    const db = await initDB();
    
    // Удаляем все портфели
    await db.run('DELETE FROM CryptoPortfolios');
    // Удаляем все транзакции
    await db.run('DELETE FROM CryptoTransactions');
    // Удаляем историю цен
    await db.run('DELETE FROM CryptoPriceHistory');
    // Удаляем события
    await db.run('DELETE FROM CryptoEvents');
    
    // Пересоздаём криптовалюты с начальными ценами
    await db.run('DELETE FROM CryptoCurrencies');
    
    const cryptos = [
      { name: 'Гоголь Коин', ticker: 'GOGOL', description: 'Официальная криптовалюта литературных энтузиастов. Очень волатильная.', price: 1000, volatility: 0.15, supply: 21000000 },
      { name: 'Казах Коин', ticker: 'KAZAH', description: 'Народная криптовалюта степей. Известна своей непредсказуемостью.', price: 500, volatility: 0.20, supply: 100000000 },
      { name: 'Башня Бога РП Коин', ticker: 'BBG', description: 'Престижная крипта для элиты. Стабильная и дорогая.', price: 5000, volatility: 0.10, supply: 10000000 },
      { name: 'Я ненавижу Котов Коин', ticker: 'ICATS', description: 'Мемная крипта для собачников. Очень рискованная инвестиция!', price: 100, volatility: 0.25, supply: 500000000 },
      { name: 'Я люблю Собак Коин', ticker: 'ILOVDOGS', description: 'Крипта лучших друзей человека. К луне! 🐕🚀', price: 150, volatility: 0.18, supply: 420690000 },
      { name: 'PainCoin', ticker: 'PAIN', description: 'Для тех, кто любит боль... финансовую боль. Экстремальная волатильность!', price: 666, volatility: 0.30, supply: 66600000 }
    ];

    const stmt = await db.prepare(`
      INSERT INTO CryptoCurrencies (name, ticker_symbol, description, current_price, base_volatility, total_supply, circulating_supply)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const crypto of cryptos) {
      await stmt.run(crypto.name, crypto.ticker, crypto.description, crypto.price, crypto.volatility, crypto.supply, crypto.supply);
    }
    
    await stmt.finalize();

    await db.close();
    res.json({ success: true, message: 'Crypto market reset successfully' });
  } catch (error) {
    console.error('Error resetting crypto market:', error);
    res.status(500).json({ error: 'Failed to reset crypto market' });
  }
});

// ========================================
// ПОКУПКИ (Расширенный маркетплейс)
// ========================================

// Получить все категории
router.get('/purchases/categories', async (req, res) => {
  try {
    const db = await initDB();
    const categories = await db.all('SELECT * FROM PurchaseCategories ORDER BY display_order');
    await db.close();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching purchase categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Получить предметы с фильтрами
router.get('/purchases/items', async (req, res) => {
  try {
    const { category_id, island, rank, rarity, min_price, max_price } = req.query;
    
    const db = await initDB();
    
    let query = 'SELECT * FROM PurchaseItems WHERE available = 1';
    const params: any[] = [];

    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }

    if (island) {
      query += ' AND (island = ? OR island IS NULL)';
      params.push(island);
    }

    if (rank) {
      query += ' AND (rank_required = ? OR rank_required IS NULL)';
      params.push(rank);
    }

    if (rarity) {
      query += ' AND rarity = ?';
      params.push(rarity);
    }

    if (min_price) {
      query += ' AND base_price >= ?';
      params.push(parseInt(min_price as string));
    }

    if (max_price) {
      query += ' AND base_price <= ?';
      params.push(parseInt(max_price as string));
    }

    query += ' ORDER BY base_price DESC';

    const items = await db.all(query, params);
    
    await db.close();
    res.json(items);
  } catch (error) {
    console.error('Error fetching purchase items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Получить детали предмета
router.get('/purchases/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    const item = await db.get('SELECT * FROM PurchaseItems WHERE id = ?', [id]);
    if (!item) {
      await db.close();
      return res.status(404).json({ error: 'Item not found' });
    }

    // Получаем категорию
    const category = await db.get('SELECT * FROM PurchaseCategories WHERE id = ?', [item.category_id]);

    // Получаем список владельцев
    const owners = await db.all(`
      SELECT c.id, c.character_name, cp.purchase_price, cp.purchased_at
      FROM CharacterPurchases cp
      JOIN Characters c ON c.id = cp.character_id
      WHERE cp.item_id = ?
      ORDER BY cp.purchased_at DESC
      LIMIT 10
    `, [id]);

    await db.close();
    res.json({ ...item, category, owners });
  } catch (error) {
    console.error('Error fetching purchase item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Купить предмет
router.post('/purchases/buy', async (req, res) => {
  try {
    const { character_id, item_id } = req.body;

    if (!character_id || !item_id) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const db = await initDB();

    // Получаем предмет
    const item = await db.get('SELECT * FROM PurchaseItems WHERE id = ? AND available = 1', [item_id]);
    if (!item) {
      await db.close();
      return res.status(404).json({ error: 'Item not found or not available' });
    }

    // Получаем персонажа
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      await db.close();
      return res.status(404).json({ error: 'Character not found' });
    }

    // Проверяем баланс
    if (character.currency < item.base_price) {
      await db.close();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Проверяем ранг (если требуется)
    if (item.rank_required) {
      const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
      const characterRankIndex = rankOrder.indexOf(character.rank);
      const requiredRankIndex = rankOrder.indexOf(item.rank_required);
      
      if (characterRankIndex < requiredRankIndex) {
        await db.close();
        return res.status(400).json({ error: `Requires rank ${item.rank_required} or higher` });
      }
    }

    // Списываем кредиты
    await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [item.base_price, character_id]);

    // Записываем покупку
    await db.run(`
      INSERT INTO CharacterPurchases (character_id, item_id, purchase_price)
      VALUES (?, ?, ?)
    `, [character_id, item_id, item.base_price]);

    await db.close();
    res.json({ success: true, message: 'Item purchased successfully' });
  } catch (error) {
    console.error('Error purchasing item:', error);
    res.status(500).json({ error: 'Failed to purchase item' });
  }
});

// Получить мои покупки
router.get('/purchases/my/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const db = await initDB();
    
    const purchases = await db.all(`
      SELECT cp.*, pi.name, pi.description, pi.image_url, pi.rarity, pc.name as category_name, pc.icon as category_icon
      FROM CharacterPurchases cp
      JOIN PurchaseItems pi ON pi.id = cp.item_id
      JOIN PurchaseCategories pc ON pc.id = pi.category_id
      WHERE cp.character_id = ?
      ORDER BY cp.purchased_at DESC
    `, [character_id]);

    await db.close();
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching character purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Получить владельцев предмета
router.get('/purchases/item/:id/owners', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    const owners = await db.all(`
      SELECT c.id, c.character_name, c.rank, c.faction, cp.purchase_price, cp.purchased_at
      FROM CharacterPurchases cp
      JOIN Characters c ON c.id = cp.character_id
      WHERE cp.item_id = ?
      ORDER BY cp.purchased_at DESC
    `, [id]);

    await db.close();
    res.json(owners);
  } catch (error) {
    console.error('Error fetching item owners:', error);
    res.status(500).json({ error: 'Failed to fetch owners' });
  }
});

// ========================================
// АДМИН ЭНДПОИНТЫ ДЛЯ ПОКУПОК
// ========================================

// Создать категорию
router.post('/admin/purchases/category', async (req, res) => {
  try {
    const { name, icon, description, display_order } = req.body;

    if (!name || !icon) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();
    
    const result = await db.run(`
      INSERT INTO PurchaseCategories (name, icon, description, display_order)
      VALUES (?, ?, ?, ?)
    `, [name, icon, description, display_order || 0]);

    await db.close();
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Обновить категорию
router.put('/admin/purchases/category/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, description, display_order } = req.body;

    const db = await initDB();
    
    await db.run(`
      UPDATE PurchaseCategories 
      SET name = ?, icon = ?, description = ?, display_order = ?
      WHERE id = ?
    `, [name, icon, description, display_order, id]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Удалить категорию
router.delete('/admin/purchases/category/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    await db.run('DELETE FROM PurchaseCategories WHERE id = ?', [id]);
    
    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Создать предмет
router.post('/admin/purchases/item', async (req, res) => {
  try {
    const { category_id, name, description, base_price, island, rank_required, image_url, rarity, properties } = req.body;

    if (!category_id || !name || !description || !base_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();
    
    const result = await db.run(`
      INSERT INTO PurchaseItems (category_id, name, description, base_price, island, rank_required, image_url, rarity, properties, available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [category_id, name, description, base_price, island, rank_required, image_url, rarity || 'common', properties || '{}']);

    await db.close();
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating purchase item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Обновить предмет
router.put('/admin/purchases/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, base_price, island, rank_required, image_url, rarity, properties, available } = req.body;

    const db = await initDB();
    
    await db.run(`
      UPDATE PurchaseItems 
      SET category_id = ?, name = ?, description = ?, base_price = ?, island = ?, rank_required = ?, image_url = ?, rarity = ?, properties = ?, available = ?
      WHERE id = ?
    `, [category_id, name, description, base_price, island, rank_required, image_url, rarity, properties, available ? 1 : 0, id]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating purchase item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Удалить предмет
router.delete('/admin/purchases/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    await db.run('DELETE FROM PurchaseItems WHERE id = ?', [id]);
    
    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// ========================================
// КОЛЛЕКЦИИ
// ========================================

// Получить все серии коллекций
router.get('/collections/series', async (req, res) => {
  try {
    const db = await initDB();
    const series = await db.all('SELECT * FROM CollectionSeries WHERE active = 1 ORDER BY season DESC, id');
    await db.close();
    res.json(series);
  } catch (error) {
    console.error('Error fetching collection series:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// Получить детали серии с предметами
router.get('/collections/series/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    const series = await db.get('SELECT * FROM CollectionSeries WHERE id = ?', [id]);
    if (!series) {
      await db.close();
      return res.status(404).json({ error: 'Series not found' });
    }

    const items = await db.all('SELECT * FROM CollectionItems WHERE series_id = ? ORDER BY rarity DESC', [id]);

    await db.close();
    res.json({ ...series, items });
  } catch (error) {
    console.error('Error fetching collection series:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// Получить доступные паки
router.get('/collections/packs', async (req, res) => {
  try {
    const db = await initDB();
    const packs = await db.all(`
      SELECT p.*, s.name as series_name
      FROM CollectionPacks p
      LEFT JOIN CollectionSeries s ON s.id = p.series_id
      WHERE p.active = 1
      ORDER BY p.price
    `);
    await db.close();
    res.json(packs);
  } catch (error) {
    console.error('Error fetching collection packs:', error);
    res.status(500).json({ error: 'Failed to fetch packs' });
  }
});

// Купить пак
router.post('/collections/buy-pack', async (req, res) => {
  try {
    const { character_id, pack_id } = req.body;

    if (!character_id || !pack_id) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    const db = await initDB();

    // Получаем пак
    const pack = await db.get('SELECT * FROM CollectionPacks WHERE id = ? AND active = 1', [pack_id]);
    if (!pack) {
      await db.close();
      return res.status(404).json({ error: 'Pack not found' });
    }

    // Получаем персонажа
    const character = await db.get('SELECT * FROM Characters WHERE id = ?', [character_id]);
    if (!character) {
      await db.close();
      return res.status(404).json({ error: 'Character not found' });
    }

    // Проверяем баланс
    if (character.currency < pack.price) {
      await db.close();
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Списываем кредиты
    await db.run('UPDATE Characters SET currency = currency - ? WHERE id = ?', [pack.price, character_id]);

    // Возвращаем pack_id для последующего открытия
    await db.close();
    res.json({ 
      success: true, 
      message: 'Pack purchased successfully',
      purchase_id: pack_id // Используем pack_id как purchase_id для открытия
    });
  } catch (error) {
    console.error('Error buying pack:', error);
    res.status(500).json({ error: 'Failed to buy pack' });
  }
});

// Открыть пак
router.post('/collections/open-pack/:pack_id', async (req, res) => {
  try {
    const { pack_id } = req.params;
    let { character_id } = req.body;

    // Поддержка передачи character_id в query параметрах для совместимости
    if (!character_id && req.query.character_id) {
      character_id = req.query.character_id;
    }

    if (!character_id) {
      return res.status(400).json({ error: 'Character ID required' });
    }

    const db = await initDB();

    const pack = await db.get('SELECT * FROM CollectionPacks WHERE id = ?', [pack_id]);
    if (!pack) {
      await db.close();
      return res.status(404).json({ error: 'Pack not found' });
    }

    // Получаем доступные предметы
    let items;
    if (pack.series_id) {
      items = await db.all('SELECT * FROM CollectionItems WHERE series_id = ?', [pack.series_id]);
    } else {
      items = await db.all('SELECT * FROM CollectionItems');
    }

    if (items.length === 0) {
      await db.close();
      return res.status(400).json({ error: 'No items available in this pack' });
    }

    // Генерируем выпавшие предметы
    const droppedItems = [];
    const rarityWeights = {
      'mythic': 0.001,
      'legendary': 0.01,
      'epic': 0.05,
      'rare': 0.15,
      'uncommon': 0.30,
      'common': 0.489
    };

    // Гарантируем минимальную редкость
    const guaranteedRarity = pack.guaranteed_rarity || 'common';
    let hasGuaranteed = false;

    for (let i = 0; i < pack.items_count; i++) {
      let selectedItem;

      // Последняя карта - гарантированная
      if (i === pack.items_count - 1 && !hasGuaranteed) {
        const guaranteedItems = items.filter((item: any) => item.rarity === guaranteedRarity);
        if (guaranteedItems.length > 0) {
          selectedItem = guaranteedItems[Math.floor(Math.random() * guaranteedItems.length)];
          hasGuaranteed = true;
        }
      }

      if (!selectedItem) {
        // Взвешенный случайный выбор
        const rand = Math.random();
        let cumulative = 0;
        let selectedRarity = 'common';

        for (const [rarity, weight] of Object.entries(rarityWeights)) {
          cumulative += weight;
          if (rand <= cumulative) {
            selectedRarity = rarity;
            break;
          }
        }

        const rarityItems = items.filter((item: any) => item.rarity === selectedRarity);
        if (rarityItems.length > 0) {
          selectedItem = rarityItems[Math.floor(Math.random() * rarityItems.length)];
          
          if (selectedRarity === guaranteedRarity || 
              Object.keys(rarityWeights).indexOf(selectedRarity) > Object.keys(rarityWeights).indexOf(guaranteedRarity)) {
            hasGuaranteed = true;
          }
        } else {
          // Если нет предметов такой редкости, берём случайный
          selectedItem = items[Math.floor(Math.random() * items.length)];
        }
      }

      if (selectedItem) {
        droppedItems.push(selectedItem);

        // Добавляем в коллекцию персонажа
        const existing = await db.get('SELECT * FROM CharacterCollection WHERE character_id = ? AND item_id = ?', 
          [character_id, selectedItem.id]);

        if (existing) {
          await db.run('UPDATE CharacterCollection SET quantity = quantity + 1 WHERE character_id = ? AND item_id = ?', 
            [character_id, selectedItem.id]);
        } else {
          await db.run('INSERT INTO CharacterCollection (character_id, item_id, quantity) VALUES (?, ?, 1)', 
            [character_id, selectedItem.id]);
        }
      }
    }

    await db.close();
    res.json(droppedItems);
  } catch (error) {
    console.error('Error opening pack:', error);
    res.status(500).json({ error: 'Failed to open pack' });
  }
});

// Получить мою коллекцию
router.get('/collections/my/:character_id', async (req, res) => {
  try {
    const { character_id } = req.params;
    const { series_id } = req.query;

    const db = await initDB();
    
    let collection;
    if (series_id) {
      collection = await db.all(`
        SELECT cc.*, ci.name, ci.description, ci.rarity, ci.image_url, ci.lore_text, ci.series_id
        FROM CharacterCollection cc
        JOIN CollectionItems ci ON ci.id = cc.item_id
        WHERE cc.character_id = ? AND ci.series_id = ?
        ORDER BY ci.rarity DESC, ci.name
      `, [character_id, series_id]);
    } else {
      collection = await db.all(`
        SELECT cc.*, ci.name, ci.description, ci.rarity, ci.image_url, ci.lore_text, ci.series_id,
               cs.name as series_name
        FROM CharacterCollection cc
        JOIN CollectionItems ci ON ci.id = cc.item_id
        JOIN CollectionSeries cs ON cs.id = ci.series_id
        WHERE cc.character_id = ?
        ORDER BY ci.series_id, ci.rarity DESC, ci.name
      `, [character_id]);
    }

    await db.close();
    res.json(collection);
  } catch (error) {
    console.error('Error fetching character collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// Топ коллекционеров
router.get('/collections/leaderboard', async (req, res) => {
  try {
    const db = await initDB();
    
    const leaderboard = await db.all(`
      SELECT c.id as character_id, c.character_name,
             COUNT(DISTINCT cc.item_id) as unique_items,
             SUM(cc.quantity) as total_items
      FROM Characters c
      JOIN CharacterCollection cc ON cc.character_id = c.id
      GROUP BY c.id
      ORDER BY unique_items DESC, total_items DESC
      LIMIT 10
    `);

    await db.close();
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching collections leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ========================================
// АДМИН ЭНДПОИНТЫ ДЛЯ КОЛЛЕКЦИЙ
// ========================================

// Создать серию
router.post('/admin/collections/series', async (req, res) => {
  try {
    const { name, description, total_items, season } = req.body;

    if (!name || !total_items) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();
    
    const result = await db.run(`
      INSERT INTO CollectionSeries (name, description, total_items, season, active)
      VALUES (?, ?, ?, ?, 1)
    `, [name, description, total_items, season || 1]);

    await db.close();
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating series:', error);
    res.status(500).json({ error: 'Failed to create series' });
  }
});

// Обновить серию
router.put('/admin/collections/series/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, total_items, season, active } = req.body;

    const db = await initDB();
    
    await db.run(`
      UPDATE CollectionSeries 
      SET name = ?, description = ?, total_items = ?, season = ?, active = ?
      WHERE id = ?
    `, [name, description, total_items, season, active ? 1 : 0, id]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating series:', error);
    res.status(500).json({ error: 'Failed to update series' });
  }
});

// Удалить серию
router.delete('/admin/collections/series/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    await db.run('DELETE FROM CollectionSeries WHERE id = ?', [id]);
    
    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting series:', error);
    res.status(500).json({ error: 'Failed to delete series' });
  }
});

// Создать предмет коллекции
router.post('/admin/collections/item', async (req, res) => {
  try {
    const { series_id, name, description, rarity, image_url, lore_text, drop_rate, properties } = req.body;

    if (!series_id || !name || !rarity || drop_rate === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();
    
    const result = await db.run(`
      INSERT INTO CollectionItems (series_id, name, description, rarity, image_url, lore_text, drop_rate, properties)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [series_id, name, description, rarity, image_url, lore_text, drop_rate, properties || '{}']);

    await db.close();
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating collection item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Обновить предмет коллекции
router.put('/admin/collections/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { series_id, name, description, rarity, image_url, lore_text, drop_rate, properties } = req.body;

    const db = await initDB();
    
    await db.run(`
      UPDATE CollectionItems 
      SET series_id = ?, name = ?, description = ?, rarity = ?, image_url = ?, lore_text = ?, drop_rate = ?, properties = ?
      WHERE id = ?
    `, [series_id, name, description, rarity, image_url, lore_text, drop_rate, properties, id]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating collection item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Удалить предмет коллекции
router.delete('/admin/collections/item/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await initDB();
    
    await db.run('DELETE FROM CollectionItems WHERE id = ?', [id]);
    
    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Создать пак
router.post('/admin/collections/pack', async (req, res) => {
  try {
    const { name, description, price, guaranteed_rarity, items_count, series_id } = req.body;

    if (!name || !price || !guaranteed_rarity || !items_count) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();
    
    const result = await db.run(`
      INSERT INTO CollectionPacks (name, description, price, guaranteed_rarity, items_count, series_id, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [name, description, price, guaranteed_rarity, items_count, series_id || null]);

    await db.close();
    res.json({ success: true, id: result.lastID });
  } catch (error) {
    console.error('Error creating pack:', error);
    res.status(500).json({ error: 'Failed to create pack' });
  }
});

// Обновить пак
router.put('/admin/collections/pack/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, guaranteed_rarity, items_count, series_id, active } = req.body;

    const db = await initDB();
    
    await db.run(`
      UPDATE CollectionPacks 
      SET name = ?, description = ?, price = ?, guaranteed_rarity = ?, items_count = ?, series_id = ?, active = ?
      WHERE id = ?
    `, [name, description, price, guaranteed_rarity, items_count, series_id, active ? 1 : 0, id]);

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating pack:', error);
    res.status(500).json({ error: 'Failed to update pack' });
  }
});

// Выдать предмет персонажу
router.post('/admin/collections/give-item', async (req, res) => {
  try {
    const { character_id, item_id, quantity } = req.body;

    if (!character_id || !item_id || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await initDB();

    const existing = await db.get('SELECT * FROM CharacterCollection WHERE character_id = ? AND item_id = ?', 
      [character_id, item_id]);

    if (existing) {
      await db.run('UPDATE CharacterCollection SET quantity = quantity + ? WHERE character_id = ? AND item_id = ?', 
        [quantity, character_id, item_id]);
    } else {
      await db.run('INSERT INTO CharacterCollection (character_id, item_id, quantity) VALUES (?, ?, ?)', 
        [character_id, item_id, quantity]);
    }

    await db.close();
    res.json({ success: true });
  } catch (error) {
    console.error('Error giving collection item:', error);
    res.status(500).json({ error: 'Failed to give item' });
  }
});

// Backup database
router.get('/admin/backup', async (req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.resolve('./database.db');
    
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    
    const dbBuffer = fs.readFileSync(dbPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.db`;
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(dbBuffer);
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

export default router;
