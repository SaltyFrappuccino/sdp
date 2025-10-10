import { Rank } from '../components/AbilityBuilder';

/**
 * Получить максимальное количество контрактов для ранга
 * F/E/D → 1, C/B → 3, A → 5, S → 7, SS → 9, SSS → 11
 */
export function getMaxContractsForRank(rank: Rank): number {
  const contractLimits: Record<Rank, number> = {
    'F': 1,
    'E': 1,
    'D': 1,
    'C': 3,
    'B': 3,
    'A': 5,
    'S': 7,
    'SS': 9,
    'SSS': 11,
  };

  return contractLimits[rank] || 1;
}

/**
 * Валидация количества контрактов
 */
export function validateContractCount(rank: Rank, contractsCount: number): {
  valid: boolean;
  max: number;
  current: number;
  message?: string;
} {
  const max = getMaxContractsForRank(rank);
  const valid = contractsCount <= max;

  return {
    valid,
    max,
    current: contractsCount,
    message: valid ? undefined : `Превышен лимит контрактов для ранга ${rank}. Максимум: ${max}, текущее: ${contractsCount}`,
  };
}

