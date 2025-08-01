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
import { ContractForm } from '../components/ContractForm';
import { AttributeManager } from '../components/AttributeManager';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { InventoryManager } from '../components/InventoryManager';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { Rank } from '../components/AbilityBuilder';
import { API_URL, AI_API_URL } from '../api';
import ReactMarkdown from 'react-markdown';

export interface AnketaProps extends NavIdProps {
  fetchedUser?: UserInfo;
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

const emptyContract: Contract = {
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

const attributesList = [
  "Сила", "Реакция", "Ловкость", "Выносливость", "Меткость",
  "Рукопашный Бой", "Холодное Оружие", "Техника", "Восприятие", "Скрытность"
];

const initialAttributes = attributesList.reduce((acc, attr) => {
  acc[attr] = 'Дилетант';
  return acc;
}, {} as { [key: string]: string });

export const Anketa: FC<AnketaProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;
  const isEditing = !!characterId;

  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const [formData, setFormData] = useState({
    character_name: '',
    nickname: '',
    age: '',
    rank: 'F' as Rank,
    faction: '',
    faction_position: '',
    home_island: '',
    appearance: '',
    personality: '',
    biography: '',
    archetypes: [] as string[],
    attributes: initialAttributes,
    contracts: [emptyContract],
    inventory: [] as any[],
    currency: 0,
    admin_note: '',
  });

  useEffect(() => {
    if (isEditing) {
      setPopout(<ScreenSpinner />);
      fetch(`${API_URL}/characters/${characterId}`)
        .then(res => res.json())
        .then(data => {
          setFormData({ ...data, age: data.age.toString() });
          setPopout(null);
        })
        .catch(err => {
          console.error(err);
          setPopout(null);
          setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>Ошибка загрузки анкеты</Snackbar>);
        });
    }
  }, [isEditing, characterId]);

  const [formErrors, setFormErrors] = useState<Partial<typeof formData>>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    const requiredFields: (keyof typeof formData)[] = [
      'character_name', 'age', 'faction', 'rank', 'faction_position', 'home_island'
    ];

    requiredFields.forEach(field => {
      const value = formData[field];
      if (value === null || value === undefined || String(value).trim() === '') {
        errors[field] = 'Это поле обязательно для заполнения';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAttributeChange = (name: string, value: string) => {
    const newAttributes = { ...formData.attributes };
    if (value === 'none') {
      delete newAttributes[name];
    } else {
      newAttributes[name] = value;
    }
    setFormData(prev => ({ ...prev, attributes: newAttributes }));
  };

  const handleArchetypeChange = (archetype: string, isSelected: boolean) => {
    setFormData(prev => ({
      ...prev,
      archetypes: isSelected
        ? [...prev.archetypes, archetype]
        : prev.archetypes.filter(a => a !== archetype)
    }));
  };

  const handleContractChange = (index: number, fieldOrObject: string | Partial<Contract>, value?: any) => {
    const newContracts = [...formData.contracts];
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
    setFormData(prev => ({ ...prev, contracts: newContracts }));
  };

  const addContract = () => {
    setFormData(prev => ({ ...prev, contracts: [...prev.contracts, { ...emptyContract }] }));
  };

  const removeContract = (index: number) => {
    if (formData.contracts.length <= 1) return;
    const newContracts = formData.contracts.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, contracts: newContracts }));
  };

  const handleShowHistory = async () => {
    if (!characterId) return;
    setPopout(<ScreenSpinner />);
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/ai-analysis`);
      const data = await response.json();
      // Здесь нужна логика отображения модального окна.
      // Так как Anketa не имеет setModal, я пока выведу в консоль.
      console.log(data);
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>История проверок в консоли</Snackbar>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{`Ошибка загрузки истории: ${message}`}</Snackbar>);
    } finally {
      setPopout(null);
    }
  };
 
   const [activeModal, setActiveModal] = useState<string | null>(null);
   const [aiResult, setAiResult] = useState<string>('');
 
   const pollTaskResult = (taskId: string) => {
     const interval = setInterval(async () => {
       try {
         const response = await fetch(`${AI_API_URL}/tasks/${taskId}`);
         const data = await response.json();
 
         if (data.status === 'completed') {
           clearInterval(interval);
           setPopout(null);
           setAiResult(data.result);
           setActiveModal("ai-result");
         } else if (data.status === 'error') {
           clearInterval(interval);
           setPopout(null);
           throw new Error(data.detail || 'AI check failed');
         }
       } catch (error) {
         clearInterval(interval);
         setPopout(null);
         const message = error instanceof Error ? error.message : 'Unknown error';
         setSnackbar(<Snackbar
           onClose={() => setSnackbar(null)}
           before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
         >{`Ошибка проверки ИИ: ${message}`}</Snackbar>);
       }
     }, 3000);
 
     setTimeout(() => {
       clearInterval(interval);
       if (popout) {
         setPopout(null);
         setSnackbar(<Snackbar
           onClose={() => setSnackbar(null)}
           before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
         >Проверка ИИ заняла слишком много времени.</Snackbar>);
       }
     }, 120000); // 2 minutes timeout
   };
 
   const handleAICheck = async () => {
     setPopout(<ScreenSpinner />);
     setSnackbar(<Snackbar
       onClose={() => setSnackbar(null)}
     >Проверка ИИ запущена...</Snackbar>);
 
     try {
       const payload = {
         ...formData,
         age: parseInt(formData.age, 10) || 0,
       };
 
       const response = await fetch(`${AI_API_URL}/validate`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           character_data: payload,
           vk_id: fetchedUser?.id || 0,
           admin_id: localStorage.getItem('adminId') || '',
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
       setPopout(null);
       const message = error instanceof Error ? error.message : 'Unknown error';
       setSnackbar(<Snackbar
         onClose={() => setSnackbar(null)}
         before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
       >{`Ошибка запуска проверки ИИ: ${message}`}</Snackbar>);
     }
   };
 
   const handleSubmit = async () => {
     if (!validateForm()) {
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>Пожалуйста, заполните все обязательные поля.</Snackbar>);
      return;
    }

    if (!fetchedUser && !isEditing) {
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>Не удалось получить данные пользователя.</Snackbar>);
      return;
    }

    setPopout(<ScreenSpinner />);

    const payload = {
      ...formData,
      vk_id: isEditing ? undefined : fetchedUser?.id,
      age: parseInt(formData.age, 10) || 0,
    };

    const url = isEditing ? `${API_URL}/characters/${characterId}` : `${API_URL}/characters`;
    const method = isEditing ? 'PUT' : 'POST';
    const adminId = localStorage.getItem('adminId');

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...(isEditing && adminId && { 'x-admin-id': adminId }) },
        body: JSON.stringify(payload),
      });

      setPopout(null);
      const result = await response.json();

      if (response.ok) {
        setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24CheckCircleOutline />}>{isEditing ? 'Анкета обновлена!' : `Анкета создана! ID: ${result.characterId}`}</Snackbar>);
        routeNavigator.push(isEditing ? `/admin_panel` : '/');
      } else {
        const errorData = result.error || 'Неизвестная ошибка сервера';
        const missingFields = result.missing ? ` (${result.missing.join(', ')})` : '';
        throw new Error(`${errorData}${missingFields}`);
      }
    } catch (error) {
      setPopout(null);
      const errorMessage = error instanceof Error ? error.message : 'Сетевая ошибка';
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>{errorMessage}</Snackbar>);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        {isEditing ? 'Редактирование анкеты' : 'Создание анкеты'}
      </PanelHeader>

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id="ai-result"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>Результат проверки ИИ</ModalPageHeader>}
        >
          <Div>
            <ReactMarkdown>{aiResult}</ReactMarkdown>
          </Div>
        </ModalPage>
      </ModalRoot>
      
      <Group header={<Header>I. ОБЩАЯ ИНФОРМАЦИЯ</Header>}>
        <FormItem top="Имя и Фамилия" status={formErrors.character_name ? 'error' : 'default'} bottom={formErrors.character_name}>
          <Input name="character_name" value={formData.character_name} onChange={handleChange} />
        </FormItem>
        <FormItem top="Ранг Проводника">
          <Select
            name="rank"
            value={formData.rank}
            onChange={handleChange}
            options={[
              { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
              { label: 'C', value: 'C' }, { label: 'B', value: 'B' }, { label: 'A', value: 'A' },
              { label: 'S', value: 'S' }, { label: 'SS', value: 'SS' }, { label: 'SSS', value: 'SSS' },
            ]}
          />
        </FormItem>
        <FormItem top="Прозвище/Позывной">
          <Input name="nickname" value={formData.nickname} onChange={handleChange} />
        </FormItem>
        <FormItem top="Возраст" status={formErrors.age ? 'error' : 'default'} bottom={formErrors.age}>
          <Input name="age" type="number" value={formData.age} onChange={handleChange} />
        </FormItem>
        <FormItem top="Фракция" status={formErrors.faction ? 'error' : 'default'} bottom={formErrors.faction}>
          <Select
            name="faction"
            placeholder="Выберите фракцию"
            value={formData.faction}
            onChange={handleChange}
            options={[
              { label: 'Отражённый Свет Солнца', value: 'Отражённый Свет Солнца' },
              { label: 'Чёрная Лилия', value: 'Чёрная Лилия' },
              { label: 'Порядок', value: 'Порядок' },
              { label: 'Нейтрал', value: 'Нейтрал' },
            ]}
          />
        </FormItem>
        <FormItem top="Позиция во фракции" status={formErrors.faction_position ? 'error' : 'default'} bottom={formErrors.faction_position}>
          <Input name="faction_position" value={formData.faction_position} onChange={handleChange} />
        </FormItem>
        <FormItem top="Родной остров" status={formErrors.home_island ? 'error' : 'default'} bottom={formErrors.home_island}>
          <Select
            name="home_island"
            placeholder="Выберите родной остров"
            value={formData.home_island}
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
          <Textarea name="appearance" value={formData.appearance} onChange={handleChange} />
        </FormItem>
        <FormItem top="Характер">
          <Textarea name="personality" value={formData.personality} onChange={handleChange} />
        </FormItem>
        <FormItem top="Биография">
          <Textarea name="biography" value={formData.biography} onChange={handleChange} />
        </FormItem>
      </Group>

      <Group header={<Header>III. БОЕВЫЕ ХАРАКТЕРИСТИКИ</Header>}>
        <ArchetypeSelector
          selectedArchetypes={formData.archetypes}
          onArchetypeChange={handleArchetypeChange}
        />
        <AttributeManager
          attributes={formData.attributes}
          onAttributeChange={handleAttributeChange}
          totalPoints={20}
        />
        <AuraCellsCalculator
          contracts={formData.contracts}
          currentRank={formData.rank}
        />
      </Group>

      <Group header={<Header>IV. КОНТРАКТ(Ы)</Header>}>
        {formData.contracts.map((contract, index) => (
          <Div key={index}>
            {index > 0 && <Separator style={{ marginBottom: '12px' }} />}
            <ContractForm
              contract={contract}
              index={index}
              onChange={handleContractChange}
              onRemove={removeContract}
              characterRank={formData.rank}
              fullCharacterData={formData}
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
        inventory={formData.inventory}
        onInventoryChange={(newInventory) => setFormData(prev => ({ ...prev, inventory: newInventory}))}
      />
      <Group>
         <FormItem top="Валюта (Кредиты ₭)">
          <Input name="currency" type="number" value={formData.currency} onChange={handleChange} />
        </FormItem>
      </Group>

      <Group header={<Header>VI. ПРИМЕЧАНИЕ ДЛЯ АДМИНИСТРАЦИИ</Header>}>
        <FormItem>
          <Textarea name="admin_note" value={formData.admin_note} onChange={handleChange} />
        </FormItem>
      </Group>

      <Div>
        <Button size="l" stretched onClick={handleSubmit}>
          {isEditing ? 'Сохранить изменения' : 'Отправить анкету'}
        </Button>
        <Button size="l" stretched mode="secondary" onClick={handleAICheck} style={{ marginTop: '10px' }}>
          Проверить с ИИ
        </Button>
        {isEditing && (
          <Button size="l" stretched mode="secondary" onClick={handleShowHistory} style={{ marginTop: '10px' }}>
            История проверок ИИ
          </Button>
        )}
      </Div>

      {snackbar}
      {popout}
    </Panel>
  );
};