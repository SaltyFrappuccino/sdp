import { FC, useMemo } from 'react';
import { Group, Header, Checkbox, Text, Div } from '@vkontakte/vkui';

// --- DATA ---

export type Rank = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
export type CellType = 'Нулевая' | 'Малая (I)' | 'Значительная (II)' | 'Предельная (III)';

const tagCosts: Record<Rank, number> = {
  'F': 1, 'E': 2, 'D': 3, 'C': 5, 'B': 8, 'A': 10, 'S': 20, 'SS': 30, 'SSS': 45
};

const cellSpecs: Record<CellType, { budget: number; maxTagRank: Rank }> = {
  'Нулевая': { budget: 2, maxTagRank: 'F' },
  'Малая (I)': { budget: 10, maxTagRank: 'C' },
  'Значительная (II)': { budget: 15, maxTagRank: 'A' },
  'Предельная (III)': { budget: 30, maxTagRank: 'SSS' },
};

const allTags: { name: string; rank: Rank; description: string }[] = [
  { name: 'Пробивающий', rank: 'F', description: 'Слабое пробитие' },
  { name: 'Пробивающий', rank: 'D', description: 'Среднее пробитие' },
  { name: 'Пробивающий', rank: 'B', description: 'Сильное пробитие' },
  { name: 'Пробивающий', rank: 'S', description: 'Экстремальное пробитие' },
  { name: 'Неотвратимый', rank: 'E', description: 'Слегка усложняет уклонение' },
  { name: 'Неотвратимый', rank: 'C', description: 'Сложно увернуться' },
  { name: 'Неотвратимый', rank: 'A', description: 'Почти невозможно увернуться' },
  { name: 'Область', rank: 'F', description: 'Радиус 1-2 метра' },
  { name: 'Область', rank: 'C', description: 'Радиус до 10 метров' },
  { name: 'Область', rank: 'A', description: 'Радиус до 50 метров' },
  { name: 'Область', rank: 'SS', description: 'Огромная область (квартал)' },
  { name: 'Контроль', rank: 'D', description: 'Кратковременное ослепление/замедление' },
  { name: 'Контроль', rank: 'B', description: 'Временный паралич конечности' },
  { name: 'Контроль', rank: 'S', description: 'Полный паралич на несколько секунд' },
  { name: 'Защитный', rank: 'E', description: 'Блокирует слабый удар' },
  { name: 'Защитный', rank: 'C', description: 'Блокирует несколько выстрелов' },
  { name: 'Защитный', rank: 'A', description: 'Прочный барьер для нескольких человек' },
  { name: 'Концептуальный', rank: 'SSS', description: 'Атака, игнорирующая обычную защиту' },
];

const rankOrder: Rank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

// --- INTERFACES ---

export interface Tag {
  name: string;
  rank: Rank;
}

interface AbilityBuilderProps {
  cellType: CellType;
  characterRank: Rank;
  selectedTags: Tag[];
  onTagChange: (tag: Tag, isSelected: boolean) => void;
}

// --- COMPONENT ---

export const AbilityBuilder: FC<AbilityBuilderProps> = ({ cellType, characterRank, selectedTags, onTagChange }) => {
  const spec = cellSpecs[cellType];
  const budget = spec.budget;

  const availableTags = useMemo(() => {
    const maxCellRankIndex = rankOrder.indexOf(spec.maxTagRank);
    const characterRankIndex = rankOrder.indexOf(characterRank);
    const effectiveRankIndex = Math.min(maxCellRankIndex, characterRankIndex);

    return allTags.filter(tag => rankOrder.indexOf(tag.rank) <= effectiveRankIndex);
  }, [spec.maxTagRank, characterRank]);

  const spentPoints = useMemo(() => {
    return selectedTags.reduce((acc, tag) => acc + (tagCosts[tag.rank] || 0), 0);
  }, [selectedTags]);

  const remainingPoints = budget - spentPoints;

  return (
    <Group header={<Header>Конструктор Способности</Header>}>
      <Div>
        <Text>Бюджет Мощи: <b>{budget}</b></Text>
        <Text>Потрачено: <b>{spentPoints}</b></Text>
        <Text>Осталось: <b style={{ color: remainingPoints < 0 ? 'var(--vkui--color_text_negative)' : 'inherit' }}>{remainingPoints}</b></Text>
        {remainingPoints < 0 && (
          <Text style={{ color: 'var(--vkui--color_text_negative)', marginTop: '8px' }}>
            Превышен бюджет!
          </Text>
        )}
      </Div>
      <Div>
        {availableTags.map(tag => {
          const tagIdentifier = `${tag.name}@${tag.rank}`;
          const isChecked = selectedTags.some(t => t.name === tag.name && t.rank === tag.rank);
          const cost = tagCosts[tag.rank];
          const isDisabled = !isChecked && remainingPoints < cost;

          return (
            <Checkbox
              key={tagIdentifier}
              checked={isChecked}
              disabled={isDisabled}
              onChange={(e) => onTagChange(tag, e.target.checked)}
            >
              {tag.name} ({tag.rank}) - {tag.description} <b>(Стоимость: {cost})</b>
            </Checkbox>
          );
        })}
      </Div>
    </Group>
  );
};