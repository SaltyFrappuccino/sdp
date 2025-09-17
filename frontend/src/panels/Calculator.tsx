import { FC, useState } from 'react';
import { Panel, PanelHeader, Group, FormItem, Select, Header, Div, Button, Input, Textarea, PanelHeaderBack } from '@vkontakte/vkui';
import { NavIdProps } from '@vkontakte/vkui';
import { AttributeManager } from '../components/AttributeManager';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { AbilityBuilder, Rank, CellType, SelectedTags } from '../components/AbilityBuilder';
import { Icon24Add, Icon24Delete } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

interface Ability {
  name: string;
  cell_type: CellType;
  cell_cost: number;
  description: string;
  tags: SelectedTags;
}

export const Calculator: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [rank, setRank] = useState<Rank>('F');
  const [attributes, setAttributes] = useState<{ [key: string]: string }>({});
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [totalAttributePoints, setTotalAttributePoints] = useState(20);

  const handleAttributeChange = (name: string, value: string) => {
    setAttributes(prev => {
      const newAttrs = { ...prev };
      if (value === 'none') {
        delete newAttrs[name];
      } else {
        newAttrs[name] = value;
      }
      return newAttrs;
    });
  };

  const addAbility = () => {
    setAbilities([...abilities, { name: '', cell_type: 'Нулевая', cell_cost: 1, description: '', tags: {} }]);
  };

  const removeAbility = (index: number) => {
    setAbilities(abilities.filter((_, i) => i !== index));
  };

  const handleAbilityChange = (index: number, field: keyof Ability, value: any) => {
    const newAbilities = [...abilities];
    newAbilities[index] = { ...newAbilities[index], [field]: value };
    setAbilities(newAbilities);
  };

  const handleTagChange = (abilityIndex: number, tagName: string, tagRank: Rank | '-') => {
    const newAbilities = [...abilities];
    const ability = newAbilities[abilityIndex];
    const newTags = { ...ability.tags };

    if (tagRank === '-') {
      delete newTags[tagName];
    } else {
      newTags[tagName] = tagRank;
    }
    
    newAbilities[abilityIndex] = { ...ability, tags: newTags };
    setAbilities(newAbilities);
  };

  const copyToClipboard = () => {
    let result = `**Ранг Персонажа:** ${rank}\n\n`;

    result += `**Атрибуты (Всего очков: ${totalAttributePoints}):**\n`;
    for (const [attr, value] of Object.entries(attributes)) {
      result += `- ${attr}: ${value}\n`;
    }

    result += '\n**Способности:**\n';
    abilities.forEach((ability, index) => {
      result += `\n**${index + 1}. ${ability.name}**\n`;
      result += `- **Тип/Стоимость:** ${ability.cell_type} / ${ability.cell_cost}\n`;
      result += `- **Описание:** ${ability.description}\n`;
      result += '- **Теги:**\n';
      for (const [tag, tagRank] of Object.entries(ability.tags)) {
        result += `  - ${tag}: ${tagRank}\n`;
      }
    });

    if (!navigator.clipboard) {
      fallbackCopyToClipboard(result);
      return;
    }
    navigator.clipboard.writeText(result).then(function() {
      alert('Данные скопированы в буфер обмена!');
    }, function(err) {
      alert('Ошибка при копировании. Попробуйте другой метод.');
      fallbackCopyToClipboard(result);
    });
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
  
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
  
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert('Данные скопированы в буфер обмена!');
      } else {
        alert('Не удалось скопировать данные.');
      }
    } catch (err) {
      alert('Ошибка при копировании: ' + err);
    }
  
    document.body.removeChild(textArea);
  }


  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>Калькулятор Персонажа</PanelHeader>
      <Group>
        <FormItem top="Ранг Персонажа">
          <Select
            value={rank}
            onChange={(e) => setRank(e.target.value as Rank)}
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
      </Group>

      <Group>
        <FormItem top="Всего очков атрибутов">
          <Input
            type="number"
            value={String(totalAttributePoints)}
            onChange={(e) => setTotalAttributePoints(parseInt(e.target.value, 10) || 0)}
          />
        </FormItem>
        <AttributeManager
          attributes={attributes}
          onAttributeChange={handleAttributeChange}
          totalPoints={totalAttributePoints}
        />
      </Group>

      <Group>
        <Header>Калькулятор Способностей</Header>
        {abilities.map((ability, index) => (
          <Div key={index} style={{ border: '1px solid var(--vkui--color_separator_primary)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <FormItem top="Название способности">
              <Input
                value={ability.name}
                onChange={(e) => handleAbilityChange(index, 'name', e.target.value)}
              />
            </FormItem>
            <div style={{ display: 'flex', gap: '8px' }}>
              <FormItem top="Тип Ячейки" style={{ flex: 1 }}>
                <Select
                  value={ability.cell_type}
                  onChange={(e) => handleAbilityChange(index, 'cell_type', e.target.value)}
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
                  onChange={(e) => handleAbilityChange(index, 'cell_cost', parseInt(e.target.value, 10) || 1)}
                  min="1"
                  style={{ width: '80px' }}
                />
              </FormItem>
            </div>
            <FormItem top="Описание">
              <Textarea
                value={ability.description}
                onChange={(e) => handleAbilityChange(index, 'description', e.target.value)}
              />
            </FormItem>
            
            <AbilityBuilder
              cellType={ability.cell_type}
              cellCost={ability.cell_cost}
              characterRank={rank}
              selectedTags={ability.tags}
              onTagChange={(tagName, tagRank) => handleTagChange(index, tagName, tagRank)}
            />

            <FormItem>
              <Button appearance="negative" onClick={() => removeAbility(index)} before={<Icon24Delete />}>
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
      </Group>

      <Group>
        <AuraCellsCalculator
          currentRank={rank}
          contracts={[]} // В калькуляторе контракты не учитываются
        />
      </Group>
      
      <Group>
        <Div>
          <Button size="l" stretched onClick={copyToClipboard}>
            Копировать в буфер обмена
          </Button>
        </Div>
      </Group>
    </Panel>
  );
};