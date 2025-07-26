import { FC } from 'react';
import { FormItem, Checkbox, Header } from '@vkontakte/vkui';

const archetypeGroups = {
  "Ударная Сила": ["Дуэлянт", "Канонир", "Берсерк", "Снайпер", "Ассасин", "Гладиатор"],
  "Защитники": ["Бастион", "Страж", "Паладин", "Фаланга"],
  "Тактики": ["Кукловод", "Иллюзионист", "Ловчий", "Энтропик", "Геомант", "Архитектор", "Нуллификатор"],
  "Поддержка": ["Целитель", "Алхимик/Баффер", "Агент/Разведчик", "Призыватель", "Батарейка", "Ремесленник"]
};

interface ArchetypeSelectorProps {
  selectedArchetypes: string[];
  onArchetypeChange: (archetype: string, isSelected: boolean) => void;
}

export const ArchetypeSelector: FC<ArchetypeSelectorProps> = ({ selectedArchetypes, onArchetypeChange }) => {
  return (
    <>
      <Header>Архетип(ы)</Header>
      {Object.entries(archetypeGroups).map(([groupName, archetypes]) => (
        <FormItem top={groupName} key={groupName}>
          {archetypes.map(archetype => (
            <Checkbox
              key={archetype}
              checked={selectedArchetypes.includes(archetype)}
              onChange={(e) => onArchetypeChange(archetype, e.target.checked)}
            >
              {archetype}
            </Checkbox>
          ))}
        </FormItem>
      ))}
    </>
  );
};