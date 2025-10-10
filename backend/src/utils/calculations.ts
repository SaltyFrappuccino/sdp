// Calculation utilities

import { Rank, AuraCells } from '../types/index.js';

export const getAttributePointsForRank = (rank: string): number => {
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

export const calculateAuraCells = (rank: string, contracts: any[]): AuraCells => {
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

export const calculateOdds = (believersPool: number, unbelieversPool: number, margin = 0.07) => {
  const total = believersPool + unbelieversPool;

  if (total === 0) {
    return {
      believer_odds: 2.0,
      unbeliever_odds: 2.0
    };
  }

  const rawBelieverOdds = believersPool > 0 ? total / believersPool : 2.0;
  const rawUnbelieverOdds = unbelieversPool > 0 ? total / unbelieversPool : 2.0;

  const believer_odds = Math.max(1.01, rawBelieverOdds * (1 - margin));
  const unbeliever_odds = Math.max(1.01, rawUnbelieverOdds * (1 - margin));

  return {
    believer_odds: parseFloat(believer_odds.toFixed(2)),
    unbeliever_odds: parseFloat(unbeliever_odds.toFixed(2))
  };
};

