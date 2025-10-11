// Crafting Service - система крафта Синки из материалов

import { Database } from 'sqlite';

interface MaterialRequirement {
  material_id?: number;
  material_name?: string;
  quantity: number;
}

interface MaterialStack {
  material_id: number;
  quantity: number;
  quality_modifier: number;
}

interface CraftRecipe {
  id: number;
  sinki_name: string;
  sinki_rank: string;
  sinki_type: string;
  required_materials: string; // JSON
  success_chance_base: number;
  requires_crafter_rank: string;
  sinki_properties: string; // JSON
  description: string;
}

interface CraftResult {
  success: boolean;
  sinki?: {
    name: string;
    rank: string;
    type: string;
    properties: any;
  };
  message: string;
  materialsReturned?: number; // Процент возврата при провале
}

export class CraftingService {
  private static rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

  /**
   * Получить доступные рецепты для персонажа
   */
  static async getAvailableRecipes(
    db: Database,
    characterId: number
  ): Promise<CraftRecipe[]> {
    // Получаем ранг персонажа
    const character = await db.get(
      'SELECT rank FROM Characters WHERE id = ?',
      characterId
    );
    
    if (!character) {
      return [];
    }
    
    const characterRankIndex = this.rankOrder.indexOf(character.rank);
    
    // Получаем все активные рецепты
    const allRecipes = await db.all<CraftRecipe[]>(
      'SELECT * FROM SinkiCraftRecipes WHERE is_active = 1'
    );
    
    // Фильтруем по рангу персонажа
    const availableRecipes = allRecipes.filter(recipe => {
      const requiredRankIndex = this.rankOrder.indexOf(recipe.requires_crafter_rank);
      return characterRankIndex >= requiredRankIndex;
    });
    
    return availableRecipes;
  }

  /**
   * Проверить, есть ли у персонажа необходимые материалы
   */
  static async checkMaterials(
    db: Database,
    characterId: number,
    recipeId: number
  ): Promise<{ hasAll: boolean; missing: MaterialRequirement[] }> {
    const recipe = await db.get<CraftRecipe>(
      'SELECT * FROM SinkiCraftRecipes WHERE id = ?',
      recipeId
    );
    
    if (!recipe) {
      return { hasAll: false, missing: [] };
    }
    
    const requiredMaterials: MaterialRequirement[] = JSON.parse(recipe.required_materials);
    const missing: MaterialRequirement[] = [];
    
    for (const requirement of requiredMaterials) {
      // Получаем материал персонажа
      const characterMaterial = await db.get(
        `SELECT SUM(cm.quantity) as total
         FROM CharacterMaterials cm
         JOIN CraftingMaterials m ON cm.material_id = m.id
         WHERE cm.character_id = ? AND (m.id = ? OR m.name = ?)`,
        characterId,
        requirement.material_id || null,
        requirement.material_name || null
      );
      
      const available = characterMaterial?.total || 0;
      
      if (available < requirement.quantity) {
        missing.push({
          ...requirement,
          quantity: requirement.quantity - available,
        });
      }
    }
    
    return {
      hasAll: missing.length === 0,
      missing,
    };
  }

  /**
   * Крафт Синки
   */
  static async craftSinki(
    db: Database,
    characterId: number,
    recipeId: number
  ): Promise<CraftResult> {
    // Получаем рецепт
    const recipe = await db.get<CraftRecipe>(
      'SELECT * FROM SinkiCraftRecipes WHERE id = ? AND is_active = 1',
      recipeId
    );
    
    if (!recipe) {
      return {
        success: false,
        message: 'Рецепт не найден',
      };
    }
    
    // Проверяем ранг персонажа
    const character = await db.get(
      'SELECT rank, inventory FROM Characters WHERE id = ?',
      characterId
    );
    
    if (!character) {
      return {
        success: false,
        message: 'Персонаж не найден',
      };
    }
    
    const characterRankIndex = this.rankOrder.indexOf(character.rank);
    const requiredRankIndex = this.rankOrder.indexOf(recipe.requires_crafter_rank);
    
    if (characterRankIndex < requiredRankIndex) {
      return {
        success: false,
        message: `Требуется минимум ${recipe.requires_crafter_rank} ранг для крафта`,
      };
    }
    
    // Проверяем материалы
    const materialCheck = await this.checkMaterials(db, characterId, recipeId);
    if (!materialCheck.hasAll) {
      return {
        success: false,
        message: 'Недостаточно материалов',
      };
    }
    
    // Расход материалов
    const requiredMaterials: MaterialRequirement[] = JSON.parse(recipe.required_materials);
    const usedMaterials: MaterialStack[] = [];
    
    for (const requirement of requiredMaterials) {
      await this.consumeMaterials(
        db,
        characterId,
        requirement,
        usedMaterials
      );
    }
    
    // Рассчитываем шанс успеха
    const successChance = this.calculateSuccessChance(
      recipe,
      usedMaterials,
      character.rank
    );
    
    const roll = Math.random();
    const craftSuccess = roll <= successChance;
    
    // Сохраняем в историю крафта
    const materialsUsedJson = JSON.stringify(usedMaterials);
    
    if (craftSuccess) {
      // Создаём Синки
      const sinki = this.generateSinki(recipe, usedMaterials);
      
      // Добавляем в инвентарь персонажа
      await this.addSinkiToInventory(db, characterId, sinki);
      
      // Сохраняем в историю
      await db.run(
        `INSERT INTO CraftingHistory (character_id, recipe_id, success, materials_used, sinki_created)
         VALUES (?, ?, 1, ?, ?)`,
        characterId,
        recipeId,
        materialsUsedJson,
        JSON.stringify(sinki)
      );
      
      return {
        success: true,
        sinki,
        message: `Успешно создан ${sinki.name}!`,
      };
    } else {
      // Провал - частичный возврат материалов
      const returnPercentage = this.calculateMaterialReturn(successChance);
      await this.returnMaterials(db, characterId, usedMaterials, returnPercentage);
      
      // Сохраняем в историю
      await db.run(
        `INSERT INTO CraftingHistory (character_id, recipe_id, success, materials_used, sinki_created)
         VALUES (?, ?, 0, ?, NULL)`,
        characterId,
        recipeId,
        materialsUsedJson
      );
      
      return {
        success: false,
        message: 'Крафт провалился. Часть материалов вернулась.',
        materialsReturned: returnPercentage,
      };
    }
  }

  /**
   * Расходует материалы из инвентаря
   */
  private static async consumeMaterials(
    db: Database,
    characterId: number,
    requirement: MaterialRequirement,
    usedMaterials: MaterialStack[]
  ): Promise<void> {
    let remainingToConsume = requirement.quantity;
    
    // Получаем стаки материалов персонажа (сначала старые, потом новые)
    const materialStacks = await db.all(
      `SELECT cm.id, cm.material_id, cm.quantity, cm.quality_modifier
       FROM CharacterMaterials cm
       JOIN CraftingMaterials m ON cm.material_id = m.id
       WHERE cm.character_id = ? AND (m.id = ? OR m.name = ?)
       ORDER BY cm.obtained_at ASC`,
      characterId,
      requirement.material_id || null,
      requirement.material_name || null
    );
    
    for (const stack of materialStacks) {
      if (remainingToConsume <= 0) break;
      
      const toConsume = Math.min(stack.quantity, remainingToConsume);
      
      // Записываем использованные материалы
      usedMaterials.push({
        material_id: stack.material_id,
        quantity: toConsume,
        quality_modifier: stack.quality_modifier,
      });
      
      // Уменьшаем количество в стаке
      if (toConsume >= stack.quantity) {
        // Удаляем стак полностью
        await db.run(
          'DELETE FROM CharacterMaterials WHERE id = ?',
          stack.id
        );
      } else {
        // Уменьшаем количество
        await db.run(
          'UPDATE CharacterMaterials SET quantity = quantity - ? WHERE id = ?',
          toConsume,
          stack.id
        );
      }
      
      remainingToConsume -= toConsume;
    }
  }

  /**
   * Рассчитывает шанс успеха крафта
   */
  private static calculateSuccessChance(
    recipe: CraftRecipe,
    usedMaterials: MaterialStack[],
    characterRank: string
  ): number {
    let chance = recipe.success_chance_base;
    
    // Качество материалов влияет на шанс
    const avgQuality = usedMaterials.reduce((sum, m) => sum + m.quality_modifier, 0) / usedMaterials.length;
    chance += (avgQuality - 1.0) * 0.15; // +15% за отличное качество, -15% за плохое
    
    // Ранг персонажа выше требуемого даёт бонус
    const characterRankIndex = this.rankOrder.indexOf(characterRank);
    const recipeRankIndex = this.rankOrder.indexOf(recipe.requires_crafter_rank);
    const rankDifference = characterRankIndex - recipeRankIndex;
    
    if (rankDifference > 0) {
      chance += rankDifference * 0.05; // +5% за каждый ранг выше
    }
    
    return Math.min(0.95, Math.max(0.25, chance)); // 25-95%
  }

  /**
   * Генерирует Синки на основе рецепта
   */
  private static generateSinki(
    recipe: CraftRecipe,
    usedMaterials: MaterialStack[]
  ): any {
    const baseProperties = JSON.parse(recipe.sinki_properties);
    
    // Качество материалов влияет на свойства Синки
    const avgQuality = usedMaterials.reduce((sum, m) => sum + m.quality_modifier, 0) / usedMaterials.length;
    
    // Усиливаем свойства на основе качества
    const properties = { ...baseProperties };
    if (properties.bonus && avgQuality > 1.2) {
      // Бонус к эффективности для качественных материалов
      properties.bonus = Math.floor(properties.bonus * avgQuality);
    }
    
    return {
      name: recipe.sinki_name,
      rank: recipe.sinki_rank,
      type: recipe.sinki_type,
      properties,
      description: recipe.description,
      craftedFrom: usedMaterials.map(m => m.material_id),
    };
  }

  /**
   * Добавляет Синки в инвентарь персонажа
   */
  private static async addSinkiToInventory(
    db: Database,
    characterId: number,
    sinki: any
  ): Promise<void> {
    const character = await db.get(
      'SELECT inventory FROM Characters WHERE id = ?',
      characterId
    );
    
    if (!character) return;
    
    let inventory = [];
    try {
      inventory = character.inventory ? JSON.parse(character.inventory) : [];
    } catch (error) {
      inventory = [];
    }
    
    // Добавляем Синки
    inventory.push({
      type: 'sinki',
      ...sinki,
      obtained_at: new Date().toISOString(),
    });
    
    await db.run(
      'UPDATE Characters SET inventory = ? WHERE id = ?',
      JSON.stringify(inventory),
      characterId
    );
  }

  /**
   * Рассчитывает процент возврата материалов при провале
   */
  private static calculateMaterialReturn(successChance: number): number {
    // Чем выше был шанс успеха, тем больше материалов вернётся
    // 25% шанс = 10% возврат
    // 95% шанс = 50% возврат
    const returnPercentage = 10 + (successChance * 40);
    return Math.floor(returnPercentage);
  }

  /**
   * Возвращает часть материалов при провале крафта
   */
  private static async returnMaterials(
    db: Database,
    characterId: number,
    usedMaterials: MaterialStack[],
    returnPercentage: number
  ): Promise<void> {
    for (const material of usedMaterials) {
      const returnQuantity = Math.floor(material.quantity * (returnPercentage / 100));
      
      if (returnQuantity > 0) {
        // Проверяем, есть ли уже стак этого материала
        const existingStack = await db.get(
          'SELECT id, quantity FROM CharacterMaterials WHERE character_id = ? AND material_id = ?',
          characterId,
          material.material_id
        );
        
        if (existingStack) {
          // Добавляем к существующему стаку
          await db.run(
            'UPDATE CharacterMaterials SET quantity = quantity + ? WHERE id = ?',
            returnQuantity,
            existingStack.id
          );
        } else {
          // Создаём новый стак
          await db.run(
            `INSERT INTO CharacterMaterials (character_id, material_id, quantity, quality_modifier)
             VALUES (?, ?, ?, ?)`,
            characterId,
            material.material_id,
            returnQuantity,
            material.quality_modifier * 0.8 // Качество немного снижается
          );
        }
      }
    }
  }

  /**
   * Получить историю крафта персонажа
   */
  static async getCraftingHistory(
    db: Database,
    characterId: number,
    limit: number = 20
  ): Promise<any[]> {
    const history = await db.all(
      `SELECT ch.*, scr.sinki_name, scr.sinki_rank, scr.sinki_type
       FROM CraftingHistory ch
       JOIN SinkiCraftRecipes scr ON ch.recipe_id = scr.id
       WHERE ch.character_id = ?
       ORDER BY ch.crafted_at DESC
       LIMIT ?`,
      characterId,
      limit
    );
    
    return history;
  }

  /**
   * Получить статистику крафта персонажа
   */
  static async getCraftingStats(
    db: Database,
    characterId: number
  ): Promise<{
    totalCrafts: number;
    successfulCrafts: number;
    failedCrafts: number;
    successRate: number;
  }> {
    const stats = await db.get(
      `SELECT 
        COUNT(*) as totalCrafts,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successfulCrafts,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failedCrafts
       FROM CraftingHistory
       WHERE character_id = ?`,
      characterId
    );
    
    return {
      totalCrafts: stats?.totalCrafts || 0,
      successfulCrafts: stats?.successfulCrafts || 0,
      failedCrafts: stats?.failedCrafts || 0,
      successRate: stats?.totalCrafts > 0 
        ? (stats.successfulCrafts / stats.totalCrafts) * 100 
        : 0,
    };
  }
}

export default CraftingService;

