import { FC } from 'react';
import { FormItem, Checkbox, Header } from '@vkontakte/vkui';
import { HandbookTooltip } from './HandbookTooltip';
import { HANDBOOK_TOOLTIPS } from '../utils/handbookHelpers';

const archetypeGroups = {
  "Ударная Сила": ["Дуэлянт", "Канонир", "Берсерк", "Снайпер", "Ассасин", "Гладиатор"],
  "Защитники": ["Бастион", "Страж", "Паладин", "Фаланга"],
  "Тактики": ["Кукловод", "Иллюзионист", "Ловчий", "Энтропик", "Геомант", "Архитектор", "Нуллификатор", "Призыватель"],
  "Поддержка": ["Целитель", "Алхимик/Баффер", "Агент/Разведчик", "Призыватель", "Батарейка", "Ремесленник"]
};

interface ArchetypeSelectorProps {
  selectedArchetypes: string[];
  onArchetypeChange: (archetype: string, isSelected: boolean) => void;
}

export const ArchetypeSelector: FC<ArchetypeSelectorProps> = ({ selectedArchetypes, onArchetypeChange }) => {
  return (
    <>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        Архетип(ы)
        <HandbookTooltip
          tooltipText={HANDBOOK_TOOLTIPS.archetypes.text}
          handbookSection={HANDBOOK_TOOLTIPS.archetypes.section}
        />
      </Header>
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