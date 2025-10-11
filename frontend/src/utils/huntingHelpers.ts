// Helper функции для систем охоты и рыбалки

export const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export const RANK_COLORS: Record<string, string> = {
  F: '#9E9E9E',
  E: '#795548',
  D: '#4CAF50',
  C: '#2196F3',
  B: '#9C27B0',
  A: '#FF9800',
  S: '#F44336',
  SS: '#E91E63',
  SSS: '#FFD700'
};

export const MUTATION_CLASS_COLORS: Record<string, string> = {
  'Затронутые': '#4CAF50',
  'Искажённые': '#FF9800',
  'Бестии': '#F44336'
};

/**
 * Проверяет, может ли персонаж получить доступ к локации по рангу
 */
export function canAccessLocation(characterRank: string, locationRank: string): boolean {
  const characterIndex = RANK_ORDER.indexOf(characterRank);
  const locationIndex = RANK_ORDER.indexOf(locationRank);
  return characterIndex >= locationIndex;
}

/**
 * Определяет доступные классы мутаций на основе ранга и Эхо-Зоны
 */
export function getAvailableMutationClasses(
  characterRank: string,
  echoZoneIntensity: number = 0
): Array<'Затронутые' | 'Искажённые' | 'Бестии'> {
  const classes: Array<'Затронутые' | 'Искажённые' | 'Бестии'> = ['Затронутые'];
  
  const rankIndex = RANK_ORDER.indexOf(characterRank);
  
  // Искажённые доступны с D ранга или в Эхо-Зоне intensity >= 2
  if (rankIndex >= 2 || echoZoneIntensity >= 2) {
    classes.push('Искажённые');
  }
  
  // Бестии доступны только с B ранга в сильных Эхо-Зонах
  if (rankIndex >= 4 && echoZoneIntensity >= 4) {
    classes.push('Бестии');
  }
  
  return classes;
}

/**
 * Рассчитывает бонус синергий между Контрактами и снаряжением
 */
export function calculateSynergyBonus(
  characterContracts: Array<{ contract_name: string }>,
  gearItem: { synergy_contracts?: string }
): { hasSync: boolean; bonusPercent: number } {
  if (!gearItem.synergy_contracts) {
    return { hasSync: false, bonusPercent: 0 };
  }
  
  try {
    const requiredContracts: string[] = JSON.parse(gearItem.synergy_contracts);
    
    const matchingContracts = requiredContracts.filter(req =>
      characterContracts.some(c => c.contract_name === req)
    );
    
    if (matchingContracts.length === requiredContracts.length) {
      // Полная синергия = 20% бонус
      return { hasSync: true, bonusPercent: 20 };
    } else if (matchingContracts.length > 0) {
      // Частичная синергия = 10% бонус
      return { hasSync: true, bonusPercent: 10 };
    }
  } catch (error) {
    console.error('Error parsing synergy contracts:', error);
  }
  
  return { hasSync: false, bonusPercent: 0 };
}

/**
 * Форматирует стоимость материалов для отображения
 */
export function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}Млрд₭`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}М₭`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}к₭`;
  } else {
    return `${value}₭`;
  }
}

/**
 * Получает иконку для типа материала
 */
export function getMaterialIcon(materialType: string): string {
  const icons: Record<string, string> = {
    organic: '🥩',
    essence: '✨',
    crystal: '💎',
    metal: '⚙️',
    special: '⭐'
  };
  return icons[materialType] || '📦';
}

/**
 * Получает текст качества материала
 */
export function getQualityText(qualityModifier: number): string {
  if (qualityModifier >= 1.5) return '🏆 Превосходное';
  if (qualityModifier >= 1.2) return '✨ Отличное';
  if (qualityModifier >= 1.0) return '✓ Хорошее';
  if (qualityModifier >= 0.8) return '- Среднее';
  return '↓ Низкое';
}

/**
 * Рассчитывает рекомендуемое снаряжение для локации
 */
export function getRecommendedGear(
  location: { min_rank: string; water_type?: string },
  characterRank: string,
  characterContracts: Array<{ contract_name: string }>
): { message: string; priority: 'high' | 'medium' | 'low' } {
  const rankDifference = RANK_ORDER.indexOf(location.min_rank) - RANK_ORDER.indexOf(characterRank);
  
  if (rankDifference > 2) {
    return {
      message: 'Рекомендуется улучшенное снаряжение и синергии с Контрактами',
      priority: 'high'
    };
  } else if (rankDifference > 0) {
    return {
      message: 'Желательно использовать качественное снаряжение',
      priority: 'medium'
    };
  } else {
    return {
      message: 'Базовое снаряжение подойдёт',
      priority: 'low'
    };
  }
}

/**
 * Генерирует звёзды для редкости
 */
export function getRarityStars(tier: number): string {
  return '⭐'.repeat(Math.min(tier, 5));
}

/**
 * Проверяет активность Эхо-Зоны
 */
export function isEchoZoneActive(echoZone: { active_until?: string } | null): boolean {
  if (!echoZone || !echoZone.active_until) {
    return false;
  }
  
  const now = new Date();
  const activeUntil = new Date(echoZone.active_until);
  return now < activeUntil;
}

/**
 * Рассчитывает время до окончания события
 */
export function getTimeUntilEventEnd(eventEndTime: string): string {
  const now = new Date();
  const end = new Date(eventEndTime);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return 'Событие завершено';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}д ${hours % 24}ч`;
  } else if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  } else {
    return `${minutes}м`;
  }
}

/**
 * Конвертирует успешность мини-игры в качество добычи
 */
export function calculateHarvestQuality(
  minigameScore: number,
  perfectHits: number = 0,
  difficulty: number = 1.0
): { quality: number; grade: string } {
  let quality = minigameScore; // 0-100
  
  // Бонус за сложность
  quality += (difficulty - 1.0) * 10;
  
  // Бонус за перфектные действия
  quality += perfectHits * 5;
  
  // Ограничиваем диапазон
  quality = Math.min(100, Math.max(0, quality));
  
  let grade = 'F';
  if (quality >= 95) grade = 'S';
  else if (quality >= 85) grade = 'A';
  else if (quality >= 75) grade = 'B';
  else if (quality >= 65) grade = 'C';
  else if (quality >= 50) grade = 'D';
  else if (quality >= 35) grade = 'E';
  
  return { quality, grade };
}

export default {
  canAccessLocation,
  getAvailableMutationClasses,
  calculateSynergyBonus,
  formatCurrency,
  getMaterialIcon,
  getQualityText,
  getRecommendedGear,
  getRarityStars,
  isEchoZoneActive,
  getTimeUntilEventEnd,
  calculateHarvestQuality,
  RANK_ORDER,
  RANK_COLORS,
  MUTATION_CLASS_COLORS
};

