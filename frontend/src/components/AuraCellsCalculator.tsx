import { FC, useMemo } from 'react';
import { Header, Group, RichCell, Text } from '@vkontakte/vkui';

interface Contract {
  sync_level: number;
}

interface AuraCellsCalculatorProps {
  rank: string;
  contracts: Contract[];
}

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

export const AuraCellsCalculator: FC<AuraCellsCalculatorProps> = ({ rank, contracts }) => {
  const totalCells = useMemo(() => {
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
      small: baseCells.small + bonusCells.small,
      medium: baseCells.medium + bonusCells.medium,
      large: baseCells.large + bonusCells.large,
    };
  }, [rank, contracts]);

  return (
    <Group header={<Header>Ячейки Ауры</Header>}>
      <RichCell
        subtitle="Мелкие, атмосферные эффекты без реальной мощи. Безграничны."
      >
        Нулевые Ячейки
      </RichCell>
      <RichCell
        subtitle="Основные тактические способности."
        after={<Text>{totalCells.small}</Text>}
      >
        Малые Ячейки (I)
      </RichCell>
      <RichCell
        subtitle="Мощные способности, меняющие ход боя."
        after={<Text>{totalCells.medium}</Text>}
      >
        Значительные Ячейки (II)
      </RichCell>
      <RichCell
        subtitle="Ультимативные техники, козырь в рукаве."
        after={<Text>{totalCells.large}</Text>}
      >
        Предельные Ячейки (III)
      </RichCell>
    </Group>
  );
};