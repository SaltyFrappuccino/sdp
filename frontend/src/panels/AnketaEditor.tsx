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
    manifestation?: {
        avatar_description: string;
        passive_enhancement: string;
        ultimate_technique: string;
    };
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
}

const emptyContract = {
  contract_name: '',
  creature_name: '',
  creature_rank: '',
  creature_spectrum: '',
  creature_description: '',
  gift: '',
  sync_level: 0,
  unity_stage: 'Ступень I - Активация',
  abilities: [],
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
    }
  }, [characterId]);

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


  const handleSave = async () => {
    if (!character) return;

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
              totalPoints={220}
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

          <Div style={{ display: 'flex', gap: '8px' }}>
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