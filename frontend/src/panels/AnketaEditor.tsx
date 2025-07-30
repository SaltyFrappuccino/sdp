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
  ModalRoot,
  ModalPage,
  ModalPageHeader,
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, ReactNode, useEffect } from 'react';
import { UserInfo } from '@vkontakte/vk-bridge';
import { Icon24ErrorCircle, Icon24CheckCircleOutline, Icon24Add } from '@vkontakte/icons';
import ReactMarkdown from 'react-markdown';
import { AI_API_URL } from '../api';
import { ContractForm } from '../components/ContractForm';
import { AttributeManager } from '../components/AttributeManager';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { InventoryManager } from '../components/InventoryManager';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { Rank } from '../components/AbilityBuilder';
import { API_URL } from '../api';

// Эти интерфейсы и функции можно вынести в общий файл
interface Item {
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
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
}

interface CharacterData {
    character_name: string;
    nickname: string;
    age: number | string;
    rank: Rank;
    faction: string;
    home_island: string;
    appearance: string;
    personality: string;
    biography: string;
    archetypes: string[];
    attributes: { [key: string]: string };
    contracts: Contract[];
    inventory: Item[];
    currency: number;
    admin_note: string;
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

export const AnketaEditor: FC<NavIdProps & { setModal: (modal: ReactNode | null) => void; fetchedUser?: UserInfo }> = ({ id, setModal, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;

  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string>('');

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/characters/${characterId}`);
        const data = await response.json();
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
        let processedValue: string | number = value;
        if (name === 'age' || name === 'currency') {
            processedValue = parseInt(value, 10) || 0;
        }
        setCharacter({ ...character, [name]: processedValue });
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

  const pollTaskResult = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${AI_API_URL}/tasks/${taskId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setLoading(false);
          setModal(
            <ModalRoot activeModal="ai-result">
              <ModalPage
                id="ai-result"
                onClose={() => setModal(null)}
                header={<ModalPageHeader>Результат проверки ИИ</ModalPageHeader>}
              >
                <Div>
                  <ReactMarkdown>{data.result}</ReactMarkdown>
                </Div>
              </ModalPage>
            </ModalRoot>
          );
        } else if (data.status === 'error') {
          clearInterval(interval);
          setLoading(false);
          throw new Error(data.detail || 'AI check failed');
        }
      } catch (error) {
        clearInterval(interval);
        setLoading(false);
        const message = error instanceof Error ? error.message : 'Unknown error';
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >{`Ошибка проверки ИИ: ${message}`}</Snackbar>);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(interval);
      if (loading) {
        setLoading(false);
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >Проверка ИИ заняла слишком много времени.</Snackbar>);
      }
    }, 120000); // 2 minutes timeout
  };

  const handleAICheck = async () => {
    if (!character) return;
    setLoading(true);
    setSnackbar(<Snackbar
      onClose={() => setSnackbar(null)}
    >Проверка ИИ запущена...</Snackbar>);

    try {
      const response = await fetch(`${AI_API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_data: character,
          vk_id: fetchedUser?.id || 0,
          admin_id: localStorage.getItem('adminId'),
          character_id: characterId,
        }),
      });

      if (response.status !== 200) {
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.detail || 'Failed to start AI check');
        } catch (e) {
            throw new Error(errorText || 'Failed to start AI check');
        }
      }

      const data = await response.json();
      pollTaskResult(data.task_id);

    } catch (error) {
      setLoading(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{`Ошибка запуска проверки ИИ: ${message}`}</Snackbar>);
    }
  };

  const handleShowHistory = async () => {
    if (!characterId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/ai-analysis`);
      const data = await response.json();
      setModal(
        <ModalRoot activeModal="ai-history">
          <ModalPage
            id="ai-history"
            onClose={() => setModal(null)}
            header={<ModalPageHeader>История проверок ИИ</ModalPageHeader>}
          >
            <Div>
              {data.length > 0 ? (
                data.map((item: any) => (
                  <div key={item.id}>
                    <p><strong>{new Date(item.timestamp).toLocaleString()}</strong></p>
                    <ReactMarkdown>{item.result}</ReactMarkdown>
                    <Separator />
                  </div>
                ))
              ) : (
                <p>История проверок пуста.</p>
              )}
            </Div>
          </ModalPage>
        </ModalRoot>
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{`Ошибка загрузки истории: ${message}`}</Snackbar>);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const adminId = localStorage.getItem('adminId');
    if (!character || !adminId) return;

    try {
      const response = await fetch(`${API_URL}/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId,
        },
        body: JSON.stringify(character),
      });

      if (response.ok) {
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
        >Анкета успешно обновлена!</Snackbar>);
        routeNavigator.push('/admin_panel');
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
            <FormItem top="Внешность">
              <Textarea name="appearance" value={character.appearance} onChange={handleChange} />
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
              totalPoints={20} // Это значение может быть нужно будет сделать динамическим
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
                  onChange={handleContractChange}
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
              Сохранить
            </Button>
            <Button size="l" stretched mode="secondary" onClick={handleAICheck}>
              Проверить ИИ
            </Button>
            <Button size="l" stretched mode="secondary" onClick={handleShowHistory}>
              История проверок ИИ
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