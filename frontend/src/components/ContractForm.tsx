import { FC, useState } from 'react';
import { FormItem, Input, Textarea, Button, Select, Header, Div, ModalRoot, ModalPage, ModalPageHeader, FormLayoutGroup, IconButton, Checkbox, Text } from '@vkontakte/vkui';
import { Icon24Delete, Icon24Add, Icon24Cancel } from '@vkontakte/icons';
import { AbilityBuilder, Rank, SelectedTags } from './AbilityBuilder';
import { ManifestationForm, ManifestationData } from './ManifestationForm';
import { DominionForm, DominionData } from './DominionForm';

interface Ability {
  name: string;
  cell_type: 'Нулевая' | 'Малая (I)' | 'Значительная (II)' | 'Предельная (III)';
  cell_cost: number;
  description: string;
  tags: SelectedTags;
  is_summon?: boolean;
}

interface Contract {
  contract_name: string;
  creature_name: string;
  creature_rank: string;
  creature_spectrum: string;
  creature_description: string;
  creature_images?: string[];
  gift: string;
  sync_level: number;
  unity_stage: string;
  manifestation?: ManifestationData & { modus: 'Аватар' | 'Проекция' | 'Вооружение' | 'Слияние' | '' };
  dominion?: DominionData;
  abilities: Ability[];
}

interface ContractFormProps {
  contract: Contract;
  index: number;
  onChange: (index: number, fieldOrObject: keyof Contract | Partial<Contract>, value?: any) => void;
  onRemove: (index: number) => void;
  characterRank: Rank;
  fullCharacterData: any;
}

export const ContractForm: FC<ContractFormProps> = ({ contract, index, onChange, onRemove, characterRank, fullCharacterData }) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value, 10) || 0 : e.target.value;
    onChange(index, e.target.name as keyof Contract, value);
  };

  const handleAbilityChange = (abilityIndex: number, field: keyof Ability, value: string | number | boolean) => {
    const newAbilities = [...contract.abilities];
    newAbilities[abilityIndex] = { ...newAbilities[abilityIndex], [field]: value };
    onChange(index, 'abilities', newAbilities);
  };

  const addAbility = () => {
    const newAbility: Ability = { name: '', cell_type: 'Нулевая', cell_cost: 1, description: '', tags: {}, is_summon: false };
    onChange(index, 'abilities', [...contract.abilities, newAbility]);
  };

  const removeAbility = (abilityIndex: number) => {
    const newAbilities = contract.abilities.filter((_, i) => i !== abilityIndex);
    onChange(index, 'abilities', newAbilities);
  };

  const handleTagChange = (abilityIndex: number, tagName: string, rank: Rank | '-') => {
    const newAbilities = [...contract.abilities];
    const ability = newAbilities[abilityIndex];
    const newTags = { ...ability.tags };

    if (rank === '-') {
      delete newTags[tagName];
    } else {
      newTags[tagName] = rank;
    }
    
    newAbilities[abilityIndex] = { ...ability, tags: newTags };
    onChange(index, 'abilities', newAbilities);
  };

  const pollTaskResult = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/ai-api/tasks/${taskId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setIsLoading(false);
          setActiveModal(null);
          const result = data.result;
          // Передаем весь объект целиком для атомарного обновления
          onChange(index, result);
        } else if (data.status === 'error') {
          clearInterval(interval);
          setIsLoading(false);
          setActiveModal(null);
          console.error('Contract generation failed:', data.detail);
        }
      } catch (error) {
        clearInterval(interval);
        setIsLoading(false);
        setActiveModal(null);
        console.error('Failed to poll task status:', error);
      }
    }, 8000);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/ai-api/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_data: fullCharacterData,
          user_prompt: userPrompt,
        }),
      });
      const data = await response.json();
      pollTaskResult(data.task_id);
    } catch (error) {
      setIsLoading(false);
      console.error('Failed to start contract generation:', error);
    }
  };

  const handleUrlChange = (url: string, urlIndex: number) => {
    const newImages = [...(contract.creature_images || [])];
    newImages[urlIndex] = url;
    onChange(index, 'creature_images', newImages);
  };

  const addUrlField = () => {
    const newImages = [...(contract.creature_images || []), ''];
    onChange(index, 'creature_images', newImages);
  };

  const removeUrlField = (urlIndex: number) => {
    const newImages = [...(contract.creature_images || [])];
    newImages.splice(urlIndex, 1);
    onChange(index, 'creature_images', newImages);
  };

  return (
    <div>
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id="generate-contract"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Сгенерировать идею для контракта</ModalPageHeader>}
        >
          <FormLayoutGroup>
            <FormItem top="Ваш запрос для ИИ">
              <Textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} />
            </FormItem>
            <FormItem>
              <Button size="l" stretched onClick={handleGenerate} loading={isLoading}>
                Сгенерировать
              </Button>
            </FormItem>
          </FormLayoutGroup>
        </ModalPage>
      </ModalRoot>

      <FormItem top="Название Контракта">
        <Input name="contract_name" value={contract.contract_name} onChange={handleChange} />
      </FormItem>
      <FormItem top="Имя/Название Существа">
        <Input name="creature_name" value={contract.creature_name} onChange={handleChange} />
      </FormItem>
      <FormItem top="Изображения существа (URL)">
        {contract.creature_images?.map((url, urlIndex) => (
          <div key={urlIndex} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Input
              value={url}
              onChange={(e) => handleUrlChange(e.target.value, urlIndex)}
              style={{ marginRight: 8 }}
            />
            <IconButton onClick={() => removeUrlField(urlIndex)}>
              <Icon24Cancel />
            </IconButton>
          </div>
        ))}
        <Button onClick={addUrlField} before={<Icon24Add />}>
          Добавить URL
        </Button>
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
          value={String(contract.sync_level)}
          onChange={handleChange}
          onBlur={(e) => {
            let value = parseInt(e.target.value, 10);
            if (isNaN(value) || value < 0) value = 0;
            if (value > 100) value = 100;
            onChange(index, 'sync_level', value);
          }}
          min="0"
          max="100"
        />
      </FormItem>
      <FormItem top="Ступень Единения">
        <Input name="unity_stage" value={contract.unity_stage} readOnly />
      </FormItem>

      {contract.sync_level >= 75 && (
        <ManifestationForm
          manifestation={contract.manifestation || { modus: '', avatar_description: '', passive_enhancement: '', ultimate_technique: '' }}
          onChange={(field, value) => {
            const newManifestation = { ...contract.manifestation, [field]: value };
            onChange(index, 'manifestation', newManifestation);
          }}
        />
      )}

      {contract.sync_level >= 100 && (
        <DominionForm
          dominion={contract.dominion || { name: '', environment_description: '', law_name: '', law_description: '', tactical_effects: '' }}
          onChange={(field, value) => {
            const newDominion = { ...contract.dominion, [field]: value };
            onChange(index, 'dominion', newDominion);
          }}
        />
      )}

      <Header>Способности Контракта</Header>
      {contract.abilities.map((ability, abilityIndex) => {
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
        );
      })}
      
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