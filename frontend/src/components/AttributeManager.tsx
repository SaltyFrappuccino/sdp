import { FC, useMemo } from 'react';
import { FormItem, Select, Header, Text } from '@vkontakte/vkui';

const attributesList = [
  "Сила", "Реакция", "Ловкость", "Выносливость", "Меткость",
  "Рукопашный Бой", "Холодное Оружие", "Техника", "Восприятие", "Скрытность"
];

const attributeLevels = [
  { label: 'Дилетант (1 очко)', value: 'Дилетант', cost: 1 },
  { label: 'Новичок (2 очка)', value: 'Новичок', cost: 2 },
  { label: 'Опытный (4 очка)', value: 'Опытный', cost: 4 },
  { label: 'Эксперт (7 очков)', value: 'Эксперт', cost: 7 },
  { label: 'Мастер (10 очков)', value: 'Мастер', cost: 10 },
];

const attributeCosts: { [key: string]: number } = {
  "Дилетант": 1, "Новичок": 2, "Опытный": 4, "Эксперт": 7, "Мастер": 10
};

interface AttributeManagerProps {
  attributes: { [key: string]: string };
  onAttributeChange: (name: string, value: string) => void;
  totalPoints: number;
}

export const AttributeManager: FC<AttributeManagerProps> = ({ attributes, onAttributeChange, totalPoints }) => {
  const spentPoints = useMemo(() => {
    return Object.values(attributes).reduce((acc, level) => acc + (attributeCosts[level] || 0), 0);
  }, [attributes]);

  const remainingPoints = totalPoints - spentPoints;

  return (
    <>
      <Header>Атрибуты</Header>
      <FormItem>
        <Text>
          Вы получаете <b>{totalPoints}</b> очков для распределения.
          <br />
          Потрачено: <b>{spentPoints}</b>
          <br />
          Осталось: <b style={{ color: remainingPoints < 0 ? 'var(--vkui--color_text_negative)' : 'inherit' }}>{remainingPoints}</b>
        </Text>
        {remainingPoints < 0 && (
            <Text style={{ color: 'var(--vkui--color_text_negative)', marginTop: '8px' }}>
                Превышен лимит очков!
            </Text>
        )}
      </FormItem>

      {attributesList.map(attr => (
        <FormItem top={attr} key={attr}>
          <Select
            placeholder="Выберите уровень"
            value={attributes[attr] || 'Дилетант'}
            onChange={(e) => onAttributeChange(attr, e.target.value)}
            options={attributeLevels.map(level => ({ label: level.label, value: level.value }))}
          />
        </FormItem>
      ))}
    </>
  );
};