import { FC } from 'react';
import { FormItem, Input, Textarea, Button, Select, Header, Div } from '@vkontakte/vkui';
import { Icon24Delete, Icon24Add } from '@vkontakte/icons';

interface Ability {
  name: string;
  cell_type: string;
  description: string;
}

interface Contract {
  contract_name: string;
  creature_name: string;
  creature_rank: string;
  creature_spectrum: string;
  creature_description: string;
  gift: string;
  sync_level: number;
  unity_stage: string;
  abilities: Ability[];
}

interface ContractFormProps {
  contract: Contract;
  index: number;
  onChange: (index: number, field: keyof Contract, value: any) => void;
  onRemove: (index: number) => void;
}

export const ContractForm: FC<ContractFormProps> = ({ contract, index, onChange, onRemove }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value, 10) : e.target.value;
    onChange(index, e.target.name as keyof Contract, value);
  };

  const handleAbilityChange = (abilityIndex: number, field: keyof Ability, value: string) => {
    const newAbilities = [...contract.abilities];
    newAbilities[abilityIndex] = { ...newAbilities[abilityIndex], [field]: value };
    onChange(index, 'abilities', newAbilities);
  };

  const addAbility = () => {
    const newAbility: Ability = { name: '', cell_type: 'Нулевая', description: '' };
    onChange(index, 'abilities', [...contract.abilities, newAbility]);
  };

  const removeAbility = (abilityIndex: number) => {
    const newAbilities = contract.abilities.filter((_, i) => i !== abilityIndex);
    onChange(index, 'abilities', newAbilities);
  };

  return (
    <div>
      <FormItem top="Название Контракта">
        <Input name="contract_name" value={contract.contract_name} onChange={handleChange} />
      </FormItem>
      <FormItem top="Имя/Название Существа">
        <Input name="creature_name" value={contract.creature_name} onChange={handleChange} />
      </FormItem>
      <FormItem top="Ранг Существа">
        <Select
          name="creature_rank"
          value={contract.creature_rank}
          onChange={handleChange}
          options={[
            { label: 'F', value: 'F' },
            { label: 'E', value: 'E' },
            { label: 'D', value: 'D' },
            { label: 'C', value: 'C' },
            { label: 'B', value: 'B' },
            { label: 'A', value: 'A' },
            { label: 'S', value: 'S' },
            { label: 'SS', value: 'SS' },
            { label: 'SSS', value: 'SSS' },
          ]}
        />
      </FormItem>
      <FormItem top="Спектр/Тематика">
        <Input name="creature_spectrum" value={contract.creature_spectrum} onChange={handleChange} />
      </FormItem>
      <FormItem top="Описание Существа">
        <Textarea name="creature_description" value={contract.creature_description} onChange={handleChange} />
      </FormItem>
      <FormItem top="Дар (Пассивный эффект)">
        <Textarea name="gift" value={contract.gift} onChange={handleChange} />
      </FormItem>
      <FormItem top="Уровень Синхронизации (%)">
        <Input
          name="sync_level"
          type="number"
          value={contract.sync_level}
          onChange={handleChange}
          min="0"
          max="100"
        />
      </FormItem>
      <FormItem top="Ступень Единения">
        <Select
          name="unity_stage"
          value={contract.unity_stage}
          onChange={handleChange}
          options={[
            { label: 'Ступень I - Активация', value: 'Ступень I - Активация' },
            { label: 'Ступень II - Воплощение', value: 'Ступень II - Воплощение' },
            { label: 'Ступень III - Манифестация', value: 'Ступень III - Манифестация' },
            { label: 'Ступень IV - Доминион', value: 'Ступень IV - Доминион' },
          ]}
        />
      </FormItem>

      <Header>Способности Контракта</Header>
      {contract.abilities.map((ability, abilityIndex) => (
        <Div key={abilityIndex} style={{ border: '1px solid var(--vkui--color_separator_primary)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <FormItem top="Название способности">
            <Input
              value={ability.name}
              onChange={(e) => handleAbilityChange(abilityIndex, 'name', e.target.value)}
            />
          </FormItem>
          <FormItem top="Тип Ячейки">
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
          <FormItem top="Описание">
            <Textarea
              value={ability.description}
              onChange={(e) => handleAbilityChange(abilityIndex, 'description', e.target.value)}
            />
          </FormItem>
          <FormItem>
            <Button appearance="negative" onClick={() => removeAbility(abilityIndex)} before={<Icon24Delete />}>
              Удалить способность
            </Button>
          </FormItem>
        </Div>
      ))}
      
      <FormItem>
        <Button onClick={addAbility} before={<Icon24Add />}>
          Добавить способность
        </Button>
      </FormItem>

      <FormItem>
        <Button appearance="negative" onClick={() => onRemove(index)} before={<Icon24Delete />}>
          Удалить контракт
        </Button>
      </FormItem>
    </div>
  );
};