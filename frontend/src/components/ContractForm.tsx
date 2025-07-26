import { FC } from 'react';
import { FormItem, Input, Textarea, Button } from '@vkontakte/vkui';
import { Icon24Delete } from '@vkontakte/icons';

interface Contract {
  contract_name: string;
  creature_name: string;
  creature_rank: string;
  creature_spectrum: string;
  creature_description: string;
  gift: string;
  // ... другие поля контракта
}

interface ContractFormProps {
  contract: Contract;
  index: number;
  onChange: (index: number, field: keyof Contract, value: any) => void;
  onRemove: (index: number) => void;
}

export const ContractForm: FC<ContractFormProps> = ({ contract, index, onChange, onRemove }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(index, e.target.name as keyof Contract, e.target.value);
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
        <Input name="creature_rank" value={contract.creature_rank} onChange={handleChange} />
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
      {/* TODO: Добавить поля для способностей */}
      <FormItem>
        <Button appearance="negative" onClick={() => onRemove(index)} before={<Icon24Delete />}>
          Удалить контракт
        </Button>
      </FormItem>
    </div>
  );
};