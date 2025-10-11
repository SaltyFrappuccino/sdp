// Mutation Engine - система расчёта классов мутаций и Резидуальной Ауры

interface Location {
  id: number;
  island: string;
  region: string;
  min_rank: string;
}

interface EchoZone {
  id: number;
  location_id: number;
  intensity: number; // 1-5
  residual_aura_level: number; // 0.0-1.0
  last_beast_migration: Date | null;
  active_until: Date | null;
  spawned_mutations: TemporaryMutation[];
}

interface TemporaryMutation {
  trait: string;
  strength: number;
  duration: number; // в минутах
}

export type MutationClass = 'Затронутые' | 'Искажённые' | 'Бестии';

export class MutationEngine {
  private static rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

  /**
   * Определяет доступный класс мутации на основе локации, Эхо-Зоны и Ранга Проводника
   */
  static calculateAvailableMutationClasses(
    location: Location,
    echoZone: EchoZone | null,
    conductorRank: string
  ): MutationClass[] {
    const availableClasses: MutationClass[] = ['Затронутые'];
    
    // Ранг Проводника влияет на доступ к более опасным существам
    const rankIndex = this.rankOrder.indexOf(conductorRank);
    
    // Искажённые доступны с D ранга или в слабых Эхо-Зонах
    if (rankIndex >= 2 || (echoZone && echoZone.intensity >= 2)) {
      availableClasses.push('Искажённые');
    }
    
    // Бестии доступны только с B ранга в сильных Эхо-Зонах
    if (rankIndex >= 4 && echoZone && echoZone.intensity >= 4) {
      availableClasses.push('Бестии');
    }
    
    return availableClasses;
  }

  /**
   * Рассчитывает вероятность встречи каждого класса мутации
   */
  static calculateMutationProbabilities(
    availableClasses: MutationClass[],
    echoZone: EchoZone | null,
    conductorRank: string
  ): Map<MutationClass, number> {
    const probabilities = new Map<MutationClass, number>();
    
    if (!availableClasses.length) {
      return probabilities;
    }
    
    const rankIndex = this.rankOrder.indexOf(conductorRank);
    const echoIntensity = echoZone?.intensity || 0;
    const residualAura = echoZone?.residual_aura_level || 0;
    
    // Базовые вероятности
    let touchedChance = 0.70;
    let distortedChance = 0.25;
    let beastChance = 0.05;
    
    // Эхо-Зоны сдвигают вероятности в сторону редких мутаций
    if (echoZone) {
      const intensityMod = echoIntensity * 0.10;
      const auraMod = residualAura * 0.15;
      
      touchedChance -= (intensityMod + auraMod);
      distortedChance += intensityMod;
      beastChance += auraMod;
    }
    
    // Высокий ранг Проводника увеличивает шанс встретить сильных существ
    if (rankIndex >= 4) { // B+
      const rankMod = (rankIndex - 3) * 0.05;
      touchedChance -= rankMod;
      beastChance += rankMod;
    }
    
    // Нормализуем вероятности
    const total = touchedChance + distortedChance + beastChance;
    
    if (availableClasses.includes('Затронутые')) {
      probabilities.set('Затронутые', touchedChance / total);
    }
    if (availableClasses.includes('Искажённые')) {
      probabilities.set('Искажённые', distortedChance / total);
    }
    if (availableClasses.includes('Бестии')) {
      probabilities.set('Бестии', beastChance / total);
    }
    
    return probabilities;
  }

  /**
   * Выбирает конкретный класс мутации на основе рассчитанных вероятностей
   */
  static selectMutationClass(probabilities: Map<MutationClass, number>): MutationClass {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const [mutationClass, probability] of probabilities.entries()) {
      cumulative += probability;
      if (roll <= cumulative) {
        return mutationClass;
      }
    }
    
    // Fallback на самый распространённый класс
    return 'Затронутые';
  }

  /**
   * Генерирует временные мутации от Резидуальной Ауры
   */
  static generateResidualMutations(auraLevel: number): TemporaryMutation[] {
    const mutations: TemporaryMutation[] = [];
    
    if (auraLevel < 0.3) {
      return mutations; // Слишком слабая Аура для мутаций
    }
    
    const mutationCount = Math.floor(auraLevel * 3); // 0-3 мутации
    
    const possibleTraits = [
      { trait: 'Увеличенный размер', strength: auraLevel },
      { trait: 'Агрессивность', strength: auraLevel * 1.2 },
      { trait: 'Укреплённая защита', strength: auraLevel * 0.8 },
      { trait: 'Ускоренная регенерация', strength: auraLevel * 0.6 },
      { trait: 'Элементальная аура', strength: auraLevel },
      { trait: 'Улучшенные чувства', strength: auraLevel * 0.9 },
    ];
    
    // Выбираем случайные уникальные мутации
    const selectedTraits = new Set<string>();
    while (mutations.length < mutationCount && mutations.length < possibleTraits.length) {
      const randomTrait = possibleTraits[Math.floor(Math.random() * possibleTraits.length)];
      if (!selectedTraits.has(randomTrait.trait)) {
        selectedTraits.add(randomTrait.trait);
        mutations.push({
          trait: randomTrait.trait,
          strength: randomTrait.strength,
          duration: Math.floor(30 + auraLevel * 60), // 30-90 минут
        });
      }
    }
    
    return mutations;
  }

  /**
   * Рассчитывает шанс встречи Бестии на основе последней миграции
   */
  static calculateBeastSpawnChance(
    echoZoneIntensity: number,
    lastMigration: Date | null
  ): number {
    if (echoZoneIntensity < 4) {
      return 0; // Бестии появляются только в сильных Эхо-Зонах
    }
    
    let baseChance = 0.05; // 5% базовый шанс
    
    // Увеличиваем шанс на основе интенсивности
    baseChance += (echoZoneIntensity - 3) * 0.03;
    
    // Если была недавняя миграция, шанс выше
    if (lastMigration) {
      const hoursSinceMigration = (Date.now() - lastMigration.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceMigration < 24) {
        // В течение 24 часов после миграции шанс встретить Бестию выше
        baseChance += 0.10 * (1 - hoursSinceMigration / 24);
      } else if (hoursSinceMigration > 168) {
        // Если прошло больше недели, шанс новой миграции растёт
        baseChance += Math.min(0.15, (hoursSinceMigration - 168) / 168 * 0.05);
      }
    }
    
    return Math.min(0.35, baseChance); // Максимум 35% шанс
  }

  /**
   * Определяет, нужно ли обновить Резидуальную Ауру после векторного переноса
   */
  static shouldUpdateResidualAura(
    currentLevel: number,
    beastEncountered: boolean
  ): { shouldUpdate: boolean; newLevel: number } {
    if (!beastEncountered) {
      // Естественное рассеивание Ауры
      const decay = 0.05;
      const newLevel = Math.max(0, currentLevel - decay);
      return {
        shouldUpdate: newLevel !== currentLevel,
        newLevel,
      };
    }
    
    // Встреча с Бестией усиливает Резидуальную Ауру
    const increase = 0.15;
    const newLevel = Math.min(1.0, currentLevel + increase);
    
    return {
      shouldUpdate: true,
      newLevel,
    };
  }

  /**
   * Генерирует модификаторы для добычи на основе класса мутации
   */
  static getMutationLootModifiers(mutationClass: MutationClass): {
    qualityMultiplier: number;
    rareMaterialChance: number;
    creditValueMultiplier: number;
  } {
    switch (mutationClass) {
      case 'Затронутые':
        return {
          qualityMultiplier: 1.0,
          rareMaterialChance: 0.10,
          creditValueMultiplier: 1.0,
        };
      
      case 'Искажённые':
        return {
          qualityMultiplier: 1.3,
          rareMaterialChance: 0.35,
          creditValueMultiplier: 1.5,
        };
      
      case 'Бестии':
        return {
          qualityMultiplier: 1.8,
          rareMaterialChance: 0.75,
          creditValueMultiplier: 3.0,
        };
      
      default:
        return {
          qualityMultiplier: 1.0,
          rareMaterialChance: 0.05,
          creditValueMultiplier: 1.0,
        };
    }
  }
}

export default MutationEngine;

