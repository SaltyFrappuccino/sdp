import { FC } from 'react';
import { FormItem, Input, Textarea, Button, Select, Header, Div, Group } from '@vkontakte/vkui';
import { Icon24Delete, Icon24Add } from '@vkontakte/icons';

interface Item {
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
}

interface InventoryManagerProps {
    inventory: Item[];
    onInventoryChange: (inventory: Item[]) => void;
}

export const InventoryManager: FC<InventoryManagerProps> = ({ inventory, onInventoryChange }) => {

    const handleItemChange = (index: number, field: keyof Item, value: string) => {
        const newInventory = [...inventory];
        newInventory[index] = { ...newInventory[index], [field]: value };
        onInventoryChange(newInventory);
    };

    const addItem = () => {
        const newItem: Item = { name: '', description: '', type: 'Обычный' };
        onInventoryChange([...inventory, newItem]);
    };

    const removeItem = (index: number) => {
        const newInventory = inventory.filter((_, i) => i !== index);
        onInventoryChange(newInventory);
    };

    return (
        <Group>
            <Header>Инвентарь</Header>
            {inventory.map((item, index) => (
                <Div key={index} style={{ border: '1px solid var(--vkui--color_separator_primary)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    <FormItem top="Название предмета">
                        <Input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} />
                    </FormItem>
                    <FormItem top="Описание предмета">
                        <Textarea value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                    </FormItem>
                    <FormItem top="Тип предмета">
                        <Select
                            value={item.type}
                            onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                            options={[
                                { label: 'Обычный', value: 'Обычный' },
                                { label: 'Синки', value: 'Синки' },
                            ]}
                        />
                    </FormItem>
                    {item.type === 'Синки' && (
                        <FormItem top="Тип Синки">
                            <Select
                                value={item.sinki_type}
                                onChange={(e) => handleItemChange(index, 'sinki_type', e.target.value)}
                                options={[
                                    { label: 'Осколок', value: 'Осколок' },
                                    { label: 'Фокус', value: 'Фокус' },
                                    { label: 'Эхо', value: 'Эхо' },
                                ]}
                            />
                        </FormItem>
                    )}
                    {item.type === 'Синки' && (
                        <FormItem top="Ранг Синки">
                            <Select
                                placeholder="Не выбрано"
                                value={item.rank}
                                onChange={(e) => handleItemChange(index, 'rank', e.target.value)}
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
                    )}
                    <FormItem>
                        <Button appearance="negative" onClick={() => removeItem(index)} before={<Icon24Delete />}>
                            Удалить предмет
                        </Button>
                    </FormItem>
                </Div>
            ))}
            <FormItem>
                <Button onClick={addItem} before={<Icon24Add />}>
                    Добавить предмет
                </Button>
            </FormItem>
        </Group>
    );
};