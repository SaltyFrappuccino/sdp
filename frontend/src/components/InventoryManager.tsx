import { FC } from 'react';
import { Group, Header, FormItem, Input, Select, Button, Div, Accordion, IconButton} from '@vkontakte/vkui';
import { Icon24Add, Icon24Cancel } from '@vkontakte/icons';
import { ShinkiAbilityForm, ShinkiAbility } from './ShinkiAbilityForm';
import { Rank } from './AbilityBuilder';

interface Item {
  name: string;
  description: string;
  type: 'Обычный' | 'Синки';
  sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
  rank?: string;
  image_url?: string[];
  aura_cells?: {
    small: number;
    significant: number;
    ultimate: number;
  };
  abilities?: ShinkiAbility[];
}

interface InventoryManagerProps {
  inventory: Item[];
  onInventoryChange: (inventory: Item[]) => void;
  characterRank: Rank;
}

export const InventoryManager: FC<InventoryManagerProps> = ({ inventory, onInventoryChange, characterRank }) => {

  const handleItemChange = (index: number, field: keyof Item, value: any) => {
    const newInventory = [...inventory];
    newInventory[index] = { ...newInventory[index], [field]: value };
    onInventoryChange(newInventory);
  };

  const addItem = () => {
    onInventoryChange([...inventory, { name: '', description: '', type: 'Обычный' }]);
  };

  const removeItem = (index: number) => {
    const newInventory = inventory.filter((_, i) => i !== index);
    onInventoryChange(newInventory);
  };

  const handleUrlChange = (itemIndex: number, url: string, urlIndex: number) => {
    const newInventory = [...inventory];
    const newImages = [...(newInventory[itemIndex].image_url || [])];
    newImages[urlIndex] = url;
    handleItemChange(itemIndex, 'image_url', newImages);
  };

  const addUrlField = (itemIndex: number) => {
    const newInventory = [...inventory];
    const newImages = [...(newInventory[itemIndex].image_url || []), ''];
    handleItemChange(itemIndex, 'image_url', newImages);
  };

  const removeUrlField = (itemIndex: number, urlIndex: number) => {
    const newInventory = [...inventory];
    const newImages = [...(newInventory[itemIndex].image_url || [])];
    newImages.splice(urlIndex, 1);
    handleItemChange(itemIndex, 'image_url', newImages);
  };

  return (
    <>
    <Group header={<Header>V. ИНВЕНТАРЬ</Header>}>
      {inventory.map((item, index) => (
        <Div key={index} style={{ marginBottom: '12px' }}>
          <Accordion>
            <Accordion.Summary>{item.name || 'Новый предмет'}</Accordion.Summary>
            <Accordion.Content>
              <Div>
                <FormItem top="Название">
                <Input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} />
              </FormItem>
              <FormItem top="Описание">
                <Input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
              </FormItem>
              <FormItem top="Изображения предмета (URL)">
                {item.image_url?.map((url, urlIndex) => (
                  <div key={urlIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <Input
                      value={url}
                      onChange={(e) => handleUrlChange(index, e.target.value, urlIndex)}
                      style={{ marginRight: 8 }}
                    />
                    <IconButton onClick={() => removeUrlField(index, urlIndex)}>
                      <Icon24Cancel />
                    </IconButton>
                  </div>
                ))}
                <Button onClick={() => addUrlField(index)} before={<Icon24Add />}>
                  Добавить URL
                </Button>
              </FormItem>
              <FormItem top="Тип">
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
                <>
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
                  <FormItem top="Ранг">
                    <Select
                      value={item.rank}
                      onChange={(e) => handleItemChange(index, 'rank', e.target.value)}
                      options={[
                        { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
                        { label: 'C', value: 'C' }, { label: 'B', value: 'B' }, { label: 'A', value: 'A' },
                        { label: 'S', value: 'S' }, { label: 'SS', value: 'SS' }, { label: 'SSS', value: 'SSS' },
                      ]}
                    />
                  </FormItem>
                  {item.sinki_type === 'Эхо' && (
                    <>
                      <Header subtitle="Запас Ячеек Эха" />
                      <FormItem top="Малые (I)">
                        <Input
                          type="number"
                          value={String(item.aura_cells?.small || 0)}
                          onChange={(e) => handleItemChange(index, 'aura_cells', { ...item.aura_cells, small: parseInt(e.target.value) || 0 })}
                        />
                      </FormItem>
                      <FormItem top="Значительные (II)">
                        <Input
                          type="number"
                          value={String(item.aura_cells?.significant || 0)}
                          onChange={(e) => handleItemChange(index, 'aura_cells', { ...item.aura_cells, significant: parseInt(e.target.value) || 0 })}
                        />
                      </FormItem>
                      <FormItem top="Предельные (III)">
                        <Input
                          type="number"
                          value={String(item.aura_cells?.ultimate || 0)}
                          onChange={(e) => handleItemChange(index, 'aura_cells', { ...item.aura_cells, ultimate: parseInt(e.target.value) || 0 })}
                        />
                      </FormItem>
                      <ShinkiAbilityForm
                        abilities={item.abilities || []}
                        onAbilitiesChange={(abilities) => handleItemChange(index, 'abilities', abilities)}
                        characterRank={characterRank}
                      />
                    </>
                  )}
                </>
              )}
              <FormItem>
                <Button appearance="negative" onClick={() => removeItem(index)}>Удалить предмет</Button>
              </FormItem>
            </Div>
          </Accordion.Content>
        </Accordion>
        </Div>
      ))}
      <FormItem>
        <Button onClick={addItem} before={<Icon24Add />}>Добавить предмет</Button>
      </FormItem>
    </Group>
    </>
  );
};