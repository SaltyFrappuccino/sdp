// Loot Engine - система генерации материалов из охоты и рыбалки

import { MutationClass } from './mutation.engine.js';

interface BestiarySpecies {
  id: number;
  name: string;
  mutation_class: MutationClass;
  danger_rank: string;
  habitat_type: string;
  drop_items?: string; // JSON string
  credit_value_min: number;
  credit_value_max: number;
}

interface Material {
  material_id?: number; // Если материал уже существует в БД
  name: string;
  material_type: 'organic' | 'essence' | 'crystal' | 'metal' | 'special';
  mutation_class: MutationClass;
  source_species_id: number;
  aura_property?: string;
  rarity_tier: number; // 1-5
  quantity: number;
  quality_modifier: number; // 0.5-2.0
  credit_value: number;
}

interface LootResult {
  materials: Material[];
  totalValue: number;
  bonusItems: string[];
}

export class LootEngine {
  private static rankTiers: { [key: string]: number } = {
    F: 1,
    E: 1,
    D: 2,
    C: 2,
    B: 3,
    A: 4,
    S: 5,
    SS: 5,
    SSS: 5,
  };

  /**
   * Генерирует материалы из добытого существа
   */
  static generateMaterials(
    species: BestiarySpecies,
    actualMutationClass: MutationClass,
    harvestQuality: number, // 0-100 из мини-игры
    conductorRank: string,
    echoZoneIntensity: number = 0
  ): LootResult {
    const materials: Material[] = [];
    const bonusItems: string[] = [];
    
    // Преобразуем качество в множитель (0.5 - 2.0)
    const qualityMultiplier = 0.5 + (harvestQuality / 100) * 1.5;
    
    // Генерируем базовые материалы (всегда дропаются)
    materials.push(...this.generateBaseMaterials(species, actualMutationClass, qualityMultiplier));
    
    // Генерируем специальные материалы на основе класса мутации
    materials.push(...this.generateSpecialMaterials(
      species,
      actualMutationClass,
      qualityMultiplier,
      harvestQuality
    ));
    
    // Шанс на редкие материалы зависит от класса и качества добычи
    const rareMaterialRoll = Math.random() * 100;
    const rareMaterialThreshold = this.getRareMaterialThreshold(
      actualMutationClass,
      harvestQuality,
      echoZoneIntensity
    );
    
    if (rareMaterialRoll < rareMaterialThreshold) {
      materials.push(...this.generateRareMaterials(
        species,
        actualMutationClass,
        qualityMultiplier
      ));
    }
    
    // Бонусные айтемы из JSON описания существа
    if (species.drop_items) {
      try {
        const dropItems = JSON.parse(species.drop_items);
        bonusItems.push(...dropItems);
      } catch (error) {
        console.error('Failed to parse drop_items:', error);
      }
    }
    
    // Рассчитываем общую стоимость
    const totalValue = this.calculateTotalValue(materials, species, actualMutationClass);
    
    return {
      materials,
      totalValue,
      bonusItems,
    };
  }

  /**
   * Генерирует базовые органические материалы
   */
  private static generateBaseMaterials(
    species: BestiarySpecies,
    mutationClass: MutationClass,
    qualityMultiplier: number
  ): Material[] {
    const materials: Material[] = [];
    const rankTier = this.rankTiers[species.danger_rank] || 1;
    
    // Определяем тип базового материала на основе habitat_type
    let baseMaterialType: 'organic' = 'organic';
    let baseMaterialName = '';
    
    if (species.habitat_type === 'Водные') {
      baseMaterialName = `Мясо ${species.name}`;
    } else if (species.habitat_type === 'Воздушные') {
      baseMaterialName = `Перья ${species.name}`;
    } else {
      baseMaterialName = `Шкура ${species.name}`;
    }
    
    // Базовое количество зависит от размера и ранга
    const baseQuantity = Math.floor(2 + rankTier * 2);
    const quantity = Math.floor(baseQuantity * qualityMultiplier);
    
    materials.push({
      name: baseMaterialName,
      material_type: baseMaterialType,
      mutation_class: mutationClass,
      source_species_id: species.id,
      rarity_tier: rankTier,
      quantity,
      quality_modifier: qualityMultiplier,
      credit_value: this.calculateMaterialValue(rankTier, mutationClass, 'base'),
    });
    
    // Вторичный материал (кости, зубы и т.д.)
    const secondaryMaterialName = species.habitat_type === 'Водные' 
      ? `Чешуя ${species.name}`
      : `Кости ${species.name}`;
    
    materials.push({
      name: secondaryMaterialName,
      material_type: 'organic',
      mutation_class: mutationClass,
      source_species_id: species.id,
      rarity_tier: rankTier,
      quantity: Math.floor(quantity * 0.6),
      quality_modifier: qualityMultiplier,
      credit_value: this.calculateMaterialValue(rankTier, mutationClass, 'secondary'),
    });
    
    return materials;
  }

  /**
   * Генерирует специальные материалы на основе класса мутации
   */
  private static generateSpecialMaterials(
    species: BestiarySpecies,
    mutationClass: MutationClass,
    qualityMultiplier: number,
    harvestQuality: number
  ): Material[] {
    const materials: Material[] = [];
    const rankTier = this.rankTiers[species.danger_rank] || 1;
    
    switch (mutationClass) {
      case 'Затронутые':
        // Укреплённые части (только если качество добычи > 60)
        if (harvestQuality > 60) {
          materials.push({
            name: `Укреплённая часть ${species.name}`,
            material_type: 'organic',
            mutation_class: mutationClass,
            source_species_id: species.id,
            rarity_tier: rankTier,
            quantity: 1,
            quality_modifier: qualityMultiplier,
            credit_value: this.calculateMaterialValue(rankTier, mutationClass, 'special'),
          });
        }
        break;
      
      case 'Искажённые':
        // Элементальные компоненты (всегда дропаются)
        const elementType = this.determineElementType(species.name);
        materials.push({
          name: `${elementType} компонент`,
          material_type: this.getElementMaterialType(elementType),
          mutation_class: mutationClass,
          source_species_id: species.id,
          aura_property: elementType,
          rarity_tier: Math.min(5, rankTier + 1),
          quantity: Math.floor(1 + qualityMultiplier),
          quality_modifier: qualityMultiplier,
          credit_value: this.calculateMaterialValue(rankTier + 1, mutationClass, 'elemental'),
        });
        break;
      
      case 'Бестии':
        // Эссенция Ауры (гарантированно)
        materials.push({
          name: `Эссенция Ауры: ${species.name}`,
          material_type: 'essence',
          mutation_class: mutationClass,
          source_species_id: species.id,
          aura_property: 'Чистая Аура',
          rarity_tier: 5,
          quantity: 1,
          quality_modifier: qualityMultiplier,
          credit_value: this.calculateMaterialValue(rankTier, mutationClass, 'essence'),
        });
        
        // Редкие органы
        if (harvestQuality > 70) {
          materials.push({
            name: `Сердце Бестии: ${species.name}`,
            material_type: 'special',
            mutation_class: mutationClass,
            source_species_id: species.id,
            aura_property: 'Концентрированная мощь',
            rarity_tier: 5,
            quantity: 1,
            quality_modifier: qualityMultiplier,
            credit_value: this.calculateMaterialValue(5, mutationClass, 'heart'),
          });
        }
        break;
    }
    
    return materials;
  }

  /**
   * Генерирует редкие материалы (с низким шансом дропа)
   */
  private static generateRareMaterials(
    species: BestiarySpecies,
    mutationClass: MutationClass,
    qualityMultiplier: number
  ): Material[] {
    const materials: Material[] = [];
    const rankTier = this.rankTiers[species.danger_rank] || 1;
    
    // Кристаллы Ауры (универсальный редкий материал)
    materials.push({
      name: `Кристалл Ауры (${mutationClass})`,
      material_type: 'crystal',
      mutation_class: mutationClass,
      source_species_id: species.id,
      aura_property: 'Кристаллизованная Аура',
      rarity_tier: Math.min(5, rankTier + 2),
      quantity: 1,
      quality_modifier: qualityMultiplier,
      credit_value: this.calculateMaterialValue(rankTier + 2, mutationClass, 'crystal'),
    });
    
    return materials;
  }

  /**
   * Рассчитывает порог для получения редких материалов
   */
  private static getRareMaterialThreshold(
    mutationClass: MutationClass,
    harvestQuality: number,
    echoZoneIntensity: number
  ): number {
    let baseThreshold = 10; // 10% базовый шанс
    
    // Качество добычи влияет на шанс
    baseThreshold += harvestQuality * 0.3;
    
    // Класс мутации влияет на шанс
    switch (mutationClass) {
      case 'Затронутые':
        baseThreshold += 5;
        break;
      case 'Искажённые':
        baseThreshold += 15;
        break;
      case 'Бестии':
        baseThreshold += 30;
        break;
    }
    
    // Эхо-Зоны увеличивают шанс
    baseThreshold += echoZoneIntensity * 5;
    
    return Math.min(95, baseThreshold);
  }

  /**
   * Определяет тип элемента на основе названия существа
   */
  private static determineElementType(speciesName: string): string {
    const lowerName = speciesName.toLowerCase();
    
    if (lowerName.includes('вольт') || lowerName.includes('электр')) return 'Электричество';
    if (lowerName.includes('кристалл') || lowerName.includes('лёд')) return 'Лёд';
    if (lowerName.includes('огн') || lowerName.includes('пламен')) return 'Огонь';
    if (lowerName.includes('туман') || lowerName.includes('яд')) return 'Яд';
    if (lowerName.includes('камен') || lowerName.includes('скал')) return 'Камень';
    if (lowerName.includes('ветр') || lowerName.includes('возд')) return 'Воздух';
    
    return 'Нейтральная энергия';
  }

  /**
   * Определяет тип материала для элемента
   */
  private static getElementMaterialType(elementType: string): Material['material_type'] {
    if (elementType === 'Электричество') return 'crystal';
    if (elementType === 'Лёд' || elementType === 'Кристалл') return 'crystal';
    if (elementType === 'Камень') return 'metal';
    if (elementType === 'Яд') return 'essence';
    return 'special';
  }

  /**
   * Рассчитывает стоимость материала
   */
  private static calculateMaterialValue(
    rarityTier: number,
    mutationClass: MutationClass,
    materialCategory: string
  ): number {
    let baseValue = 1000;
    
    // Базовая стоимость по редкости
    baseValue *= Math.pow(5, rarityTier - 1);
    
    // Множитель класса мутации
    switch (mutationClass) {
      case 'Затронутые':
        baseValue *= 1.0;
        break;
      case 'Искажённые':
        baseValue *= 2.5;
        break;
      case 'Бестии':
        baseValue *= 10.0;
        break;
    }
    
    // Множитель категории материала
    switch (materialCategory) {
      case 'base':
        baseValue *= 1.0;
        break;
      case 'secondary':
        baseValue *= 0.7;
        break;
      case 'special':
        baseValue *= 1.5;
        break;
      case 'elemental':
        baseValue *= 3.0;
        break;
      case 'essence':
        baseValue *= 8.0;
        break;
      case 'heart':
        baseValue *= 15.0;
        break;
      case 'crystal':
        baseValue *= 20.0;
        break;
      default:
        baseValue *= 1.0;
    }
    
    return Math.floor(baseValue);
  }

  /**
   * Рассчитывает общую стоимость лута
   */
  private static calculateTotalValue(
    materials: Material[],
    species: BestiarySpecies,
    mutationClass: MutationClass
  ): number {
    let totalValue = 0;
    
    // Суммируем стоимость всех материалов
    for (const material of materials) {
      totalValue += material.credit_value * material.quantity;
    }
    
    // Добавляем базовую стоимость существа (если её продать целиком)
    const baseCreatureValue = 
      (species.credit_value_min + species.credit_value_max) / 2;
    
    // Множитель класса мутации
    let classMultiplier = 1.0;
    switch (mutationClass) {
      case 'Искажённые':
        classMultiplier = 1.5;
        break;
      case 'Бестии':
        classMultiplier = 3.0;
        break;
    }
    
    totalValue += baseCreatureValue * classMultiplier;
    
    return Math.floor(totalValue);
  }

  /**
   * Генерирует модификатор качества на основе результата мини-игры
   */
  static calculateHarvestQuality(
    minigameScore: number,
    difficulty: number,
    perfectHits: number = 0
  ): number {
    let quality = minigameScore; // 0-100
    
    // Бонус за сложность (высокая сложность = больше награда)
    quality += (difficulty - 1.0) * 10;
    
    // Бонус за перфектные действия
    quality += perfectHits * 5;
    
    return Math.min(100, Math.max(0, quality));
  }
}

export default LootEngine;

