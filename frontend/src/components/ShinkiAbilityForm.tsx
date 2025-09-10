import { FC } from 'react';
import { FormItem, Input, Textarea, Button, Select, Header, Div, Checkbox, Text } from '@vkontakte/vkui';
import { Icon24Delete, Icon24Add } from '@vkontakte/icons';
import { AbilityBuilder, Rank, SelectedTags } from './AbilityBuilder';

export interface ShinkiAbility {
  name: string;
  cell_type: 'Нулевая' | 'Малая (I)' | 'Значительная (II)' | 'Предельная (III)';
  cell_cost: number;
  description: string;
  tags: SelectedTags;
  is_summon?: boolean;
}

interface ShinkiAbilityFormProps {
  abilities: ShinkiAbility[];
  onAbilitiesChange: (abilities: ShinkiAbility[]) => void;
  characterRank: Rank;
}

export const ShinkiAbilityForm: FC<ShinkiAbilityFormProps> = ({ abilities, onAbilitiesChange, characterRank }) => {

  const handleAbilityChange = (abilityIndex: number, field: keyof ShinkiAbility, value: string | number | boolean | SelectedTags) => {
    const newAbilities = [...abilities];
    newAbilities[abilityIndex] = { ...newAbilities[abilityIndex], [field]: value };
    onAbilitiesChange(newAbilities);
  };

  const addAbility = () => {
    const newAbility: ShinkiAbility = { name: '', cell_type: 'Нулевая', cell_cost: 1, description: '', tags: {}, is_summon: false };
    onAbilitiesChange([...abilities, newAbility]);
  };

  const removeAbility = (abilityIndex: number) => {
    const newAbilities = abilities.filter((_, i) => i !== abilityIndex);
    onAbilitiesChange(newAbilities);
  };

  const handleTagChange = (abilityIndex: number, tagName: string, rank: Rank | '-') => {
    const newAbilities = [...abilities];
    const ability = newAbilities[abilityIndex];
    const newTags = { ...ability.tags };

    if (rank === '-') {
      delete newTags[tagName];
    } else {
      newTags[tagName] = rank;
    }
    
    handleAbilityChange(abilityIndex, 'tags', newTags);
  };

  return (
    <div>
      <Header>Способности Синки</Header>
      {abilities.map((ability, abilityIndex) => {
        const isSummon = ability.is_summon;
        const requiredTags = ['Пробивающий', 'Защитный', 'Неотвратимый', 'Область'];
        const missingTags = isSummon ? requiredTags.filter(tag => !ability.tags[tag]) : [];

        return (
          <Div key={abilityIndex} style={{ border: '1px solid var(--vkui--color_separator_primary)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <FormItem top="Название способности">
              <Input
                value={ability.name}
                onChange={(e) => handleAbilityChange(abilityIndex, 'name', e.target.value)}
              />
            </FormItem>
            <div style={{ display: 'flex', gap: '8px' }}>
              <FormItem top="Тип Ячейки" style={{ flex: 1 }}>
                <Select
                  value={ability.cell_type}
                  onChange={(e) => handleAbilityChange(abilityIndex, 'cell_type', e.target.value)}
                  options={[
                    { label: 'Нулевая', value: 'Нулевая' },
                    { label: 'Малая (I)', value: 'Малая (I)' },
                    { label: 'Значительная (II)', value: 'Значительная (II)' },
                    { label: 'Предельная (III)', value: 'Предельная (III)' },
                  ]}
                />
              </FormItem>
              <FormItem top="Стоимость">
                <Input
                  type="number"
                  value={String(ability.cell_cost)}
                  onChange={(e) => handleAbilityChange(abilityIndex, 'cell_cost', parseInt(e.target.value, 10) || 1)}
                  min="1"
                  style={{ width: '80px' }}
                />
              </FormItem>
            </div>
            <FormItem top="Описание">
              <Textarea
                value={ability.description}
                onChange={(e) => handleAbilityChange(abilityIndex, 'description', e.target.value)}
              />
            </FormItem>
            
            <FormItem>
              <Checkbox
                  checked={ability.is_summon || false}
                  onChange={(e) => handleAbilityChange(abilityIndex, 'is_summon', e.target.checked)}
              >
                  Способность является Призывом Существа
              </Checkbox>
            </FormItem>

            {isSummon && (
                <FormItem>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                        <b>Правило Четырёх Основ:</b> Способность призыва должна включать в себя как минимум четыре Тега: [Пробивающий] (сила атаки), [Защитный] (здоровье), [Неотвратимый] (скорость) и [Область] (радиус действия).
                    </Text>
                </FormItem>
            )}

            {missingTags.length > 0 && (
                <FormItem>
                    <Text style={{ color: 'var(--vkui--color_text_negative)' }}>
                    Отсутствуют обязательные теги: {missingTags.join(', ')}
                    </Text>
                </FormItem>
            )}

            <AbilityBuilder
              cellType={ability.cell_type}
              cellCost={ability.cell_cost}
              characterRank={characterRank}
              selectedTags={ability.tags}
              onTagChange={(tagName, rank) => handleTagChange(abilityIndex, tagName, rank)}
            />

            <FormItem>
              <Button appearance="negative" onClick={() => removeAbility(abilityIndex)} before={<Icon24Delete />}>
                Удалить способность
              </Button>
            </FormItem>
          </Div>
        )
      })}
      
      <FormItem>
        <Button onClick={addAbility} before={<Icon24Add />}>
          Добавить способность
        </Button>
      </FormItem>
    </div>
  );
};
