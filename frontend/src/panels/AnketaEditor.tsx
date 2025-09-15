import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  FormItem,
  Input,
  Button,
  Select,
  PanelHeaderBack,
  Snackbar,
  ScreenSpinner,
  Textarea,
  Separator,
  Header,
  Div,
  IconButton,
  FormLayoutGroup,
} from '@vkontakte/vkui';
import { Icon24Cancel } from '@vkontakte/icons';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, ReactNode, useEffect } from 'react';
import { UserInfo } from '@vkontakte/vk-bridge';
import { Icon24ErrorCircle, Icon24CheckCircleOutline, Icon24Add } from '@vkontakte/icons';
import { ContractForm } from '../components/ContractForm';
import { AttributeManager } from '../components/AttributeManager';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { InventoryManager } from '../components/InventoryManager';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { Rank } from '../components/AbilityBuilder';
import { API_URL } from '../api';
import { readJsonFile } from '../utils/anketaExport';
import { ManifestationData } from '../components/ManifestationForm';

const getAttributePointsForRank = (rank: Rank): number => {
  switch (rank) {
    case 'F': return 10;
    case 'E': return 14;
    case 'D': return 16;
    case 'C': return 20;
    case 'B': return 30;
    case 'A': return 40;
    case 'S': return 50;
    case 'SS': return 60;
    case 'SSS': return 70;
    default: return 10;
  }
};

const getDefaultCharacterData = (): CharacterData => {
  const defaultRank: Rank = 'F';
  return {
    character_name: '',
    nickname: '',
    age: '',
    rank: defaultRank,
    faction: 'Нейтрал',
    faction_position: '',
    home_island: 'Кага',
    appearance: { text: '' },
    character_images: [],
    personality: '',
    biography: '',
    archetypes: [],
    attributes: {},
    contracts: [{ ...emptyContract }],
    inventory: [],
    currency: 0,
    admin_note: '',
    status: 'на рассмотрении',
    life_status: 'Жив',
  };
};

interface Item {
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: string;
    image_url?: string[];
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
    abilities: any[];
    creature_images?: string[];
    manifestation?: ManifestationData;
    dominion?: {
        name: string;
        environment_description: string;
        law_name: string;
        law_description: string;
        tactical_effects: string;
    };
}

interface CharacterData {
    character_name: string;
    nickname: string;
    age: number | string;
    rank: Rank;
    faction: string;
    faction_position: string;
    home_island: string;
    appearance: {
        text: string;
    };
    character_images: string[];
    personality: string;
    biography: string;
    archetypes: string[];
    attributes: { [key: string]: string };
    attribute_points_total?: number;
    aura_cells?: {
      "Малые (I)": number;
      "Значительные (II)": number;
      "Предельные (III)": number;
    };
    contracts: Contract[];
    inventory: Item[];
    currency: number;
    admin_note: string;
    status: string;
    life_status: 'Жив' | 'Мёртв';
}

const emptyContract: Contract = {
  contract_name: '',
  creature_name: '',
  creature_rank: 'F',
  creature_spectrum: '',
  creature_description: '',
  gift: '',
  sync_level: 0,
  unity_stage: 'Ступень I - Активация',
  abilities: [],
  manifestation: {
    modus: '',
    avatar_description: '',
    passive_enhancement: '',
    ultimate_technique: ''
  },
};

const getUnityStage = (syncLevel: number): string => {
  if (syncLevel >= 100) return 'Ступень IV - Доминион';
  if (syncLevel >= 75) return 'Ступень III - Манифестация';
  if (syncLevel >= 25) return 'Ступень II - Воплощение';
  return 'Ступень I - Активация';
};

export const AnketaEditor: FC<NavIdProps & {
  setModal: (modal: ReactNode | null) => void;
  fetchedUser?: UserInfo;
  isAdminEditor?: boolean;
  character: CharacterData | null;
  onCharacterChange: (character: CharacterData) => void;
  onSave: () => void;
  onAICheck?: () => void;
  onShowHistory?: () => void;
  snackbar?: ReactNode | null;
}> = ({
  id,
  fetchedUser,
  isAdminEditor,
  character,
  onCharacterChange,
  onSave,
  onAICheck,
  onShowHistory,
  snackbar
}) => {
  const routeNavigator = useRouteNavigator();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    setIsAdmin(!!adminId);
  }, []);

  const handleImportAnketa = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !character) return;

    try {
      const content = await readJsonFile(file);
      const importedData = JSON.parse(content as string);

      if (importedData.contracts && Array.isArray(importedData.contracts)) {
        importedData.contracts.forEach((contract: any) => {
          if (contract.manifestation && typeof contract.manifestation.modus === 'undefined') {
            contract.manifestation.modus = '';
          }
        });
      }

      const characterData = {
        ...character,
        character_name: importedData.character_name,
        nickname: importedData.nickname,
        age: importedData.age,
        rank: importedData.rank as Rank,
        faction: importedData.faction,
        faction_position: importedData.faction_position,
        home_island: importedData.home_island,
        appearance: importedData.appearance,
        character_images: importedData.character_images,
        personality: importedData.personality,
        biography: importedData.biography,
        archetypes: importedData.archetypes,
        attributes: importedData.attributes,
        attribute_points_total: importedData.attribute_points_total,
        aura_cells: importedData.aura_cells,
        contracts: importedData.contracts,
        inventory: importedData.inventory,
        currency: importedData.currency,
        admin_note: importedData.admin_note,
        status: character?.status || 'на рассмотрении',
        life_status: importedData.life_status
      };
      
      onCharacterChange(characterData);
      
    } catch (error) {
      // Handle error, maybe show a snackbar
    }
  };

  const handleClearForm = () => {
    if (window.confirm('Вы уверены, что хотите очистить всю анкету? Все несохраненные данные будут потеряны.')) {
      onCharacterChange(getDefaultCharacterData());
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (character) {
        const nameParts = name.split('.');
        if (nameParts.length > 1 && nameParts[1] === 'appearance') {
            onCharacterChange({
                ...character,
                appearance: {
                    ...character.appearance,
                    text: value
                }
            });
        } else {
            let processedValue: string | number = value;
            if (name === 'age' || name === 'currency') {
                processedValue = parseInt(value, 10) || 0;
            }
            onCharacterChange({ ...character, [name]: processedValue });
        }
    }
  };

  const handleAttributeChange = (name: string, value: string) => {
    if (!character) return;
    const newAttributes = { ...character.attributes };
    if (value === 'none') {
      delete newAttributes[name];
    } else {
      newAttributes[name] = value;
    }
    onCharacterChange({
      ...character,
      attributes: newAttributes
    });
  };

  const handleArchetypeChange = (archetype: string, isSelected: boolean) => {
    if (!character) return;
    onCharacterChange({
      ...character,
      archetypes: isSelected
        ? [...character.archetypes, archetype]
        : character.archetypes.filter(a => a !== archetype)
    });
  };

  const handleContractChange = (index: number, fieldOrObject: string | Partial<Contract>, value?: any) => {
    if (!character) return;

    const newContracts = [...character.contracts];
    let updatedContract = { ...newContracts[index] };

    if (typeof fieldOrObject === 'string') {
      updatedContract = { ...updatedContract, [fieldOrObject]: value };
      if (fieldOrObject === 'sync_level') {
        updatedContract.unity_stage = getUnityStage(Number(value));
      }
    } else {
      updatedContract = { ...updatedContract, ...fieldOrObject };
      if (fieldOrObject.sync_level !== undefined) {
        updatedContract.unity_stage = getUnityStage(fieldOrObject.sync_level);
      }
    }

    newContracts[index] = updatedContract;
    onCharacterChange({ ...character, contracts: newContracts });
  };

  const addContract = () => {
    if (!character) return;
    onCharacterChange({ ...character, contracts: [...character.contracts, { ...emptyContract }] });
  };

  const removeContract = (index: number) => {
    if (!character || character.contracts.length <= 1) return;
    const newContracts = character.contracts.filter((_, i) => i !== index);
    onCharacterChange({ ...character, contracts: newContracts });
  };

  const handleInventoryChange = (newInventory: Item[]) => {
      if (!character) return;
      onCharacterChange({ ...character, inventory: newInventory });
  }

  const handleCharacterImageChange = (index: number, value: string) => {
    if (!character) return;
    const newImages = [...character.character_images];
    newImages[index] = value;
    onCharacterChange({ ...character, character_images: newImages });
  };

  const addCharacterImage = () => {
    if (!character) return;
    onCharacterChange({ ...character, character_images: [...character.character_images, ''] });
  };

  const removeCharacterImage = (index: number) => {
    if (!character) return;
    const newImages = character.character_images.filter((_, i) => i !== index);
    onCharacterChange({ ...character, character_images: newImages });
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Редактировать анкету
      </PanelHeader>
      {loading ? (
        <ScreenSpinner />
      ) : character ? (
        <>
          <Group header={<Header>I. ОБЩАЯ ИНФОРМАЦИЯ</Header>}>
            <FormItem top="Имя и Фамилия">
              <Input name="character_name" value={character.character_name} onChange={handleChange} />
            </FormItem>
            <FormItem top="Ранг Проводника">
              <Select
                name="rank"
                value={character.rank}
                onChange={handleChange}
                options={[
                  { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
                  { label: 'C', value: 'C' }, { label: 'B', value: 'B' }, { label: 'A', value: 'A' },
                  { label: 'S', value: 'S' }, { label: 'SS', value: 'SS' }, { label: 'SSS', value: 'SSS' },
                ]}
              />
            </FormItem>
            <FormItem top="Прозвище/Позывной">
              <Input name="nickname" value={character.nickname} onChange={handleChange} />
            </FormItem>
            <FormItem top="Возраст">
              <Input name="age" type="number" value={String(character.age)} onChange={handleChange} />
            </FormItem>
            <FormItem top="Фракция">
              <Select
                name="faction"
                placeholder="Выберите фракцию"
                value={character.faction}
                onChange={handleChange}
                options={[
                  { label: 'Отражённый Свет Солнца', value: 'Отражённый Свет Солнца' },
                  { label: 'Чёрная Лилия', value: 'Чёрная Лилия' },
                  { label: 'Порядок', value: 'Порядок' },
                  { label: 'Нейтрал', value: 'Нейтрал' },
                ]}
              />
            </FormItem>
            <FormItem top="Позиция во фракции">
              <Input name="faction_position" value={character.faction_position} onChange={handleChange} />
            </FormItem>
            <FormItem top="Родной остров">
              <Select
                name="home_island"
                placeholder="Выберите родной остров"
                value={character.home_island}
                onChange={handleChange}
                options={[
                  { label: 'Кага', value: 'Кага' }, { label: 'Хоши', value: 'Хоши' },
                  { label: 'Ичи', value: 'Ичи' }, { label: 'Куро', value: 'Куро' },
                  { label: 'Мидзу', value: 'Мидзу' }, { label: 'Сора', value: 'Сора' },
                ]}
              />
            </FormItem>
          </Group>

          <Group header={<Header>II. ЛИЧНОСТЬ И ВНЕШНОСТЬ</Header>}>
            <FormItem top="Внешность (описание)">
              <Textarea name="appearance.text" value={character.appearance.text} onChange={handleChange} />
            </FormItem>
            <FormItem top="Ссылки на внешность">
              {character.character_images.map((img, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <Input
                    value={img}
                    onChange={(e) => handleCharacterImageChange(index, e.target.value)}
                    style={{ marginRight: '8px' }}
                    placeholder="https://example.com/image.png"
                  />
                  <IconButton onClick={() => removeCharacterImage(index)} aria-label="Удалить ссылку">
                    <Icon24Cancel />
                  </IconButton>
                </div>
              ))}
              <Button onClick={addCharacterImage} before={<Icon24Add />}>
                Добавить ссылку на внешность
              </Button>
            </FormItem>
            <FormItem top="Характер">
              <Textarea name="personality" value={character.personality} onChange={handleChange} />
            </FormItem>
            <FormItem top="Биография">
              <Textarea name="biography" value={character.biography} onChange={handleChange} />
            </FormItem>
          </Group>

          <Group header={<Header>III. БОЕВЫЕ ХАРАКТЕРИСТИКИ</Header>}>
            <ArchetypeSelector
              selectedArchetypes={character.archetypes}
              onArchetypeChange={handleArchetypeChange}
            />
            {isAdmin ? (
              <>
                <Header>Атрибуты (ручная настройка)</Header>
                <FormItem top="Всего очков атрибутов">
                  <Input
                    type="number"
                    value={String(character.attribute_points_total ?? getAttributePointsForRank(character.rank))}
                    onChange={(e) => character && onCharacterChange({ ...character, attribute_points_total: Number(e.target.value) })}
                    placeholder="Автоматически по рангу"
                  />
                </FormItem>
              </>
            ) : null}
            {!isAdminEditor && (
              <FormItem top="⚡ Общее количество очков атрибутов">
                <Input
                  type="number"
                  value={String(character.attribute_points_total ?? getAttributePointsForRank(character.rank))}
                  onChange={(e) => character && onCharacterChange({ ...character, attribute_points_total: Number(e.target.value) })}
                  placeholder={`По умолчанию: ${getAttributePointsForRank(character.rank)} для ранга ${character.rank}`}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Эти очки распределяются по навыкам ниже. При отправке анкеты на проверку администратор увидит ваши изменения.
                </div>
              </FormItem>
            )}
            <AttributeManager
              attributes={character.attributes}
              onAttributeChange={handleAttributeChange}
              totalPoints={character.attribute_points_total ?? getAttributePointsForRank(character.rank)}
            />
            <AuraCellsCalculator
              contracts={character.contracts}
              currentRank={character.rank}
              manualAuraCells={character.aura_cells}
            />
            {isAdmin ? (
               <>
                <Header>Ячейки Ауры (ручная настройка)</Header>
                <FormLayoutGroup mode="horizontal">
                  <FormItem top="Малые (I)">
                    <Input
                      type="number"
                      value={String(character.aura_cells?.["Малые (I)"] ?? '')}
                      onChange={(e) => character && onCharacterChange({ ...character, aura_cells: { ...character.aura_cells, "Малые (I)": Number(e.target.value) } as any })}
                    />
                  </FormItem>
                  <FormItem top="Значительные (II)">
                    <Input
                      type="number"
                      value={String(character.aura_cells?.["Значительные (II)"] ?? '')}
                      onChange={(e) => character && onCharacterChange({ ...character, aura_cells: { ...character.aura_cells, "Значительные (II)": Number(e.target.value) } as any })}
                    />
                  </FormItem>
                  <FormItem top="Предельные (III)">
                    <Input
                      type="number"
                      value={String(character.aura_cells?.["Предельные (III)"] ?? '')}
                      onChange={(e) => character && onCharacterChange({ ...character, aura_cells: { ...character.aura_cells, "Предельные (III)": Number(e.target.value) } as any })}
                    />
                  </FormItem>
                </FormLayoutGroup>
              </>
            ) : null}
          </Group>

          <Group header={<Header>IV. КОНТРАКТ(Ы)</Header>}>
            {character.contracts.map((contract, index) => (
              <Div key={index}>
                {index > 0 && <Separator style={{ marginBottom: '12px' }} />}
                <ContractForm
                  contract={contract}
                  index={index}
                  onChange={handleContractChange as any}
                  onRemove={removeContract}
                  characterRank={character.rank}
                  fullCharacterData={character}
                />
              </Div>
            ))}
            <FormItem>
              <Button onClick={addContract} before={<Icon24Add />}>
                Добавить контракт
              </Button>
            </FormItem>
          </Group>

          <InventoryManager
            inventory={character.inventory}
            onInventoryChange={handleInventoryChange}
            characterRank={character.rank}
          />
          <Group>
             <FormItem top="Валюта (Кредиты ₭)">
              <Input name="currency" type="number" value={String(character.currency)} onChange={handleChange} />
            </FormItem>
          </Group>

          <Group header={<Header>VI. ПРИМЕЧАНИЕ ДЛЯ АДМИНИСТРАЦИИ</Header>}>
            <FormItem>
              <Textarea name="admin_note" value={character.admin_note} onChange={handleChange} />
            </FormItem>
          </Group>

          <Div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <Button 
                size="l" 
                mode="outline" 
                style={{ width: '100%' }}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = handleImportAnketa;
                  input.click();
                }}
              >
                📥 Импорт анкеты
              </Button>
              <Button 
                size="l" 
                mode="secondary"
                appearance="negative"
                style={{ width: '100%' }}
                onClick={handleClearForm}
              >
                Очистить
              </Button>
            </div>
            <Button size="l" stretched onClick={onSave}>
              {(() => {
                console.log('AnketaEditor button logic:', { isAdminEditor, characterStatus: character.status });
                return isAdminEditor ? 'Сохранить изменения' : (character.status === 'Принято' ? 'Отправить на проверку' : 'Сохранить изменения');
              })()}
            </Button>
          </Div>
          {snackbar}
        </>
      ) : (
        <Div>Не удалось загрузить данные анкеты.</Div>
      )}
    </Panel>
  );
};