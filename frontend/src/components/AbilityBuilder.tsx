import { FC, useMemo } from 'react';
import { Group, Header, Text, Div, FormItem, Select } from '@vkontakte/vkui';

// --- TYPES ---
export type Rank = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
export type CellType = 'Нулевая' | 'Малая (I)' | 'Значительная (II)' | 'Предельная (III)';
export type SelectedTags = Record<string, Rank>;

// --- DATA ---
const tagCosts: Record<Rank, number> = {
  'F': 1, 'E': 2, 'D': 3, 'C': 5, 'B': 8, 'A': 10, 'S': 20, 'SS': 30, 'SSS': 45
};

const cellSpecs: Record<CellType, { budget: number; maxTagRank: Rank }> = {
  'Нулевая': { budget: 2, maxTagRank: 'F' },
  'Малая (I)': { budget: 10, maxTagRank: 'C' },
  'Значительная (II)': { budget: 15, maxTagRank: 'A' }, 
  'Предельная (III)': { budget: 30, maxTagRank: 'SSS' },
};

const tagTypes = [
  'Пробивающий', 'Неотвратимый', 'Область', 'Контроль', 'Защитный', 'Концептуальный'
];

const rankOrder: Rank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

// --- INTERFACES ---
interface AbilityBuilderProps {
  cellType: CellType;
  cellCost: number;
  characterRank: Rank;
  selectedTags: SelectedTags;
  onTagChange: (tagName: string, rank: Rank | '-') => void;
}

// --- COMPONENT ---
export const AbilityBuilder: FC<AbilityBuilderProps> = ({
  cellType,
  cellCost,
  characterRank,
  selectedTags,
  onTagChange
}) => {
  const spec = cellSpecs[cellType];
  // 1. Бюджет умножается на количество ячеек
  const budget = spec.budget * cellCost;

  // 3. Определяем максимально допустимый ранг
  const maxAllowedRankIndex = useMemo(() => {
    const maxCellRankIndex = rankOrder.indexOf(spec.maxTagRank);
    //const characterRankIndex = rankOrder.indexOf(characterRank);
    //return Math.min(maxCellRankIndex, characterRankIndex);
    return maxCellRankIndex
  }, [spec.maxTagRank, characterRank]);

  // Генерируем опции для Select на основе макс. ранга
  const rankOptions = useMemo(() => {
    const availableRanks = rankOrder.slice(0, maxAllowedRankIndex + 1);
    const options = availableRanks.map(rank => ({
      label: `${rank} (стоимость: ${tagCosts[rank]})`,
      value: rank,
    }));
    // Добавляем опцию "Не выбрано"
    return [{ label: 'Не выбрано', value: '-' }, ...options];
  }, [maxAllowedRankIndex]);


  const spentPoints = useMemo(() => {
    return Object.values(selectedTags).reduce((acc, rank) => acc + (tagCosts[rank] || 0), 0);
  }, [selectedTags]);

  const remainingPoints = budget - spentPoints;

  return (
    <Group header={<Header>Конструктор Способности</Header>}>
      <Div>
        <Text>Бюджет Мощи: <b>{budget}</b> ( {spec.budget} x {cellCost} )</Text>
        <Text>Потрачено: <b>{spentPoints}</b></Text>
        <Text>Осталось: <b style={{ color: remainingPoints < 0 ? 'var(--vkui--color_text_negative)' : 'inherit' }}>{remainingPoints}</b></Text>
        {remainingPoints < 0 && (
          <Text style={{ color: 'var(--vkui--color_text_negative)', marginTop: '8px' }}>
            Превышен бюджет!
          </Text>
        )}
      </Div>
      {/* 2. Новый интерфейс выбора тегов */}
      {tagTypes.map(tagName => {
        const currentRank = selectedTags[tagName] || '-';
        return (
          <FormItem top={tagName} key={tagName}>
            <Select
              placeholder="Не выбрано"
              value={currentRank}
              onChange={(e) => onTagChange(tagName, e.target.value as Rank | '-')}
              options={rankOptions}
            />
          </FormItem>
        );
      })}
    </Group>
  );
};