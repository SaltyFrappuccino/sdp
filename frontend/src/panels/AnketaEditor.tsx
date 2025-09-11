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

export const AnketaEditor: FC<NavIdProps & { setModal: (modal: ReactNode | null) => void; fetchedUser?: UserInfo }> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;

  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const handleImportAnketa = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

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
        contracts: importedData.contracts,
        inventory: importedData.inventory,
        currency: importedData.currency,
        admin_note: importedData.admin_note,
        status: character?.status || 'на рассмотрении',
        life_status: importedData.life_status
      };
      
      if (characterData && character) {
        // Заполняем форму импортированными данными
        setCharacter(characterData);
        
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            Анкета успешно импортирована!
          </Snackbar>
        );
      } else {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            Ошибка при импорте анкеты. Проверьте формат файла.
          </Snackbar>
        );
      }
    } catch (error) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при чтении файла
        </Snackbar>
      );
    }
  };
  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/characters/${characterId}`);
        const data = await response.json();
        // Преобразование для обратной совместимости, если appearance - строка
        if (typeof data.appearance === 'string' || !data.appearance) {
          data.appearance = { text: data.appearance || '', images: [] };
        } else if (data.appearance && typeof data.appearance.text === 'string' && data.appearance.text.startsWith('{')) {
          // Если text содержит JSON, парсим его
          try {
            const parsedAppearance = JSON.parse(data.appearance.text);
            data.appearance = parsedAppearance;
          } catch (e) {
            // Если не удалось распарсить, оставляем как есть
          }
        }
        if (!data.character_images) {
          data.character_images = [];
        }
        if (data.contracts) {
            data.contracts.forEach((c: Contract) => {
                if (!c.creature_images) c.creature_images = [];
            });
        }
        if (data.inventory) {
            data.inventory.forEach((i: Item) => {
                if (!i.image_url) i.image_url = [];
                if (!i.sinki_type) i.sinki_type = undefined;
                if (!i.rank) i.rank = undefined;
            });
        }
        setCharacter(data);
      } catch (error) {
        console.error('Failed to fetch character:', error);
      } finally {
        setLoading(false);
      }
    };

    if (characterId) {
      fetchCharacter();
    } else {
      // Это новая анкета, устанавливаем значения по умолчанию
      setCharacter(getDefaultCharacterData());
      setLoading(false);
    }
  }, [characterId]);

  const handleClearForm = () => {
    if (window.confirm('Вы уверены, что хотите очистить всю анкету? Все несохраненные данные будут потеряны.')) {
      setCharacter(getDefaultCharacterData());
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (character) {
        const nameParts = name.split('.');
        if (nameParts.length > 1 && nameParts[0] === 'appearance') {
            setCharacter({
                ...character,
                appearance: {
                    ...character.appearance,
                    [nameParts[1]]: value
                }
            });
        } else {
            let processedValue: string | number = value;
            if (name === 'age' || name === 'currency') {
                processedValue = parseInt(value, 10) || 0;
            }
            setCharacter({ ...character, [name]: processedValue });
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
    setCharacter(prev => prev ? ({
      ...prev,
      attributes: newAttributes
    }) : null);
  };

  const handleArchetypeChange = (archetype: string, isSelected: boolean) => {
    if (!character) return;
    setCharacter(prev => prev ? ({
      ...prev,
      archetypes: isSelected
        ? [...prev.archetypes, archetype]
        : prev.archetypes.filter(a => a !== archetype)
    }) : null);
  };

  const handleContractChange = (index: number, fieldOrObject: string | Partial<Contract>, value?: any) => {
    if (!character) return;

    const newContracts = [...character.contracts];
    let updatedContract = { ...newContracts[index] };

    if (typeof fieldOrObject === 'string') {
      // Обновление одного поля
      updatedContract = { ...updatedContract, [fieldOrObject]: value };
      if (fieldOrObject === 'sync_level') {
        updatedContract.unity_stage = getUnityStage(Number(value));
      }
    } else {
      // Обновление нескольких полей из объекта
      updatedContract = { ...updatedContract, ...fieldOrObject };
      if (fieldOrObject.sync_level !== undefined) {
        updatedContract.unity_stage = getUnityStage(fieldOrObject.sync_level);
      }
    }

    newContracts[index] = updatedContract;
    setCharacter(prev => prev ? { ...prev, contracts: newContracts } : null);
  };

  const addContract = () => {
    if (!character) return;
    setCharacter(prev => prev ? ({ ...prev, contracts: [...prev.contracts, { ...emptyContract }] }) : null);
  };

  const removeContract = (index: number) => {
    if (!character || character.contracts.length <= 1) return;
    const newContracts = character.contracts.filter((_, i) => i !== index);
    setCharacter(prev => prev ? ({ ...prev, contracts: newContracts }) : null);
  };

  const handleInventoryChange = (newInventory: Item[]) => {
      if (!character) return;
      setCharacter(prev => prev ? ({ ...prev, inventory: newInventory }) : null);
  }

  const handleCharacterImageChange = (index: number, value: string) => {
    if (!character) return;
    const newImages = [...character.character_images];
    newImages[index] = value;
    setCharacter(prev => prev ? ({ ...prev, character_images: newImages }) : null);
  };

  const addCharacterImage = () => {
    if (!character) return;
    setCharacter(prev => prev ? ({ ...prev, character_images: [...prev.character_images, ''] }) : null);
  };

  const removeCharacterImage = (index: number) => {
    if (!character) return;
    const newImages = character.character_images.filter((_, i) => i !== index);
    setCharacter(prev => prev ? ({ ...prev, character_images: newImages }) : null);
  };


  const validateCharacter = (char: any) => {
    const errors: { [key: string]: string } = {};

    // Проверка лимита очков атрибутов
    if (char.attributes) {
      const attributeCosts: { [key: string]: number } = {
        "Дилетант": 1, "Новичок": 2, "Опытный": 4, "Эксперт": 7, "Мастер": 10
      };
      
      const getAttributePointsForRank = (rank: string): number => {
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
      
      const spentPoints = Object.values(char.attributes).reduce((acc: number, level: unknown) => {
        const levelStr = level as string;
        return acc + (attributeCosts[levelStr] || 0);
      }, 0);
      const totalPoints = getAttributePointsForRank(char.rank);
      
      if (spentPoints > totalPoints) {
        errors.attributes = `Превышен лимит очков атрибутов! Потрачено: ${spentPoints}, доступно: ${totalPoints}`;
      }
    }

    // Проверка контрактов (только если они есть)
    if (char.contracts && char.contracts.length > 0) {
      char.contracts.forEach((contract: any, contractIndex: number) => {
        // Проверка обязательных полей контракта только если контракт не пустой
        const hasAnyContractData = contract.contract_name?.trim() || 
                                  contract.creature_name?.trim() || 
                                  contract.creature_spectrum?.trim() || 
                                  contract.creature_description?.trim() || 
                                  contract.gift?.trim();
        
        if (hasAnyContractData) {
          if (!contract.contract_name?.trim()) {
            errors[`contract_${contractIndex}_name`] = 'Название контракта обязательно';
          }
          if (!contract.creature_name?.trim()) {
            errors[`contract_${contractIndex}_creature_name`] = 'Имя существа обязательно';
          }
          if (!contract.creature_spectrum?.trim()) {
            errors[`contract_${contractIndex}_creature_spectrum`] = 'Спектр существа обязателен';
          }
          if (!contract.creature_description?.trim()) {
            errors[`contract_${contractIndex}_creature_description`] = 'Описание существа обязательно';
          }
          if (!contract.gift?.trim()) {
            errors[`contract_${contractIndex}_gift`] = 'Дар существа обязателен';
          }
        }

        // Проверка способностей контракта
        if (contract.abilities && contract.abilities.length > 0) {
          contract.abilities.forEach((ability: any, abilityIndex: number) => {
            // Проверка бюджета способности
            const cellSpecs: Record<string, { budget: number; maxTagRank: string }> = {
              'Нулевая': { budget: 5, maxTagRank: 'F' },
              'Малая (I)': { budget: 20, maxTagRank: 'C' },
              'Значительная (II)': { budget: 50, maxTagRank: 'A' }, 
              'Предельная (III)': { budget: 150, maxTagRank: 'SSS' },
            };

            const tagCosts: Record<string, number> = {
              'F': 1, 'E': 2, 'D': 5, 'C': 10, 'B': 20, 'A': 35, 'S': 70, 'SS': 100, 'SSS': 150
            };

            const spec = cellSpecs[ability.cell_type];
            if (spec) {
              const budget = spec.budget * ability.cell_cost;
              const spentPoints = Object.values(ability.tags || {}).reduce((acc: number, rank: unknown) => {
                const rankStr = rank as string;
                return acc + (tagCosts[rankStr] || 0);
              }, 0);
              
              if (spentPoints > budget) {
                errors[`contract_${contractIndex}_ability_${abilityIndex}_budget`] = `Превышен бюджет способности! Потрачено: ${spentPoints}, доступно: ${budget}`;
              }
            }

            // Проверка обязательных тегов для способностей призыва
            if (ability.is_summon) {
              const requiredTags = ['Пробивающий', 'Защитный', 'Неотвратимый', 'Область'];
              const missingTags = requiredTags.filter(tag => !ability.tags?.[tag]);
              
              if (missingTags.length > 0) {
                errors[`contract_${contractIndex}_ability_${abilityIndex}_tags`] = `Отсутствуют обязательные теги для призыва: ${missingTags.join(', ')}`;
              }
            }
          });
        }
      });
    }

    return errors;
  };

  const handleSave = async () => {
    if (!character) return;

    // Валидация перед сохранением
    const validationErrors = validateCharacter(character);
    if (Object.keys(validationErrors).length > 0) {
      const errorMessages = Object.values(validationErrors).filter(Boolean);
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>
        Ошибки валидации: {errorMessages.join('; ')}
      </Snackbar>);
      return;
    }

    const adminId = localStorage.getItem('adminId');

    try {
      let response;
      let successMessage;

      if (character.status === 'Принято') {
        response = await fetch(`${API_URL}/characters/${characterId}/updates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-id': adminId || '',
            'x-user-vk-id': fetchedUser?.id?.toString() || '',
          },
          body: JSON.stringify({ updated_data: character }),
        });
        successMessage = "Изменения отправлены на проверку";
      } else {
        response = await fetch(`${API_URL}/characters/${characterId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-id': adminId || '',
            'x-user-vk-id': fetchedUser?.id?.toString() || '',
          },
          body: JSON.stringify(character),
        });
        successMessage = "Анкета успешно обновлена!";
      }

      if (response.ok) {
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
        >{successMessage}</Snackbar>);
        routeNavigator.back();
      } else {
        const errorData = await response.text();
        console.error("Server response:", errorData);
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{`Ошибка сохранения: ${message}`}</Snackbar>);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
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
            <AttributeManager
              attributes={character.attributes}
              onAttributeChange={handleAttributeChange}
              totalPoints={getAttributePointsForRank(character.rank)}
            />
            <AuraCellsCalculator
              contracts={character.contracts}
              currentRank={character.rank}
            />
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
            <Button size="l" stretched onClick={handleSave}>
              {character.status === 'Принято' ? 'Отправить на проверку' : 'Сохранить изменения'}
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