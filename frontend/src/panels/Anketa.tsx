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
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, ReactNode } from 'react';
import { UserInfo } from '@vkontakte/vk-bridge';
import { Icon24ErrorCircle, Icon24CheckCircleOutline, Icon24Add } from '@vkontakte/icons';
import { ContractForm } from '../components/ContractForm';
import { AttributeManager } from '../components/AttributeManager';
import { ArchetypeSelector } from '../components/ArchetypeSelector';
import { API_URL } from '../api';

export interface AnketaProps extends NavIdProps {
  fetchedUser?: UserInfo;
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

export const Anketa: FC<AnketaProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const [formData, setFormData] = useState({
    character_name: '',
    nickname: '',
    age: '',
    rank: 'F',
    faction: '',
    home_island: '',
    appearance: '',
    personality: '',
    biography: '',
    archetypes: [] as string[],
    attributes: {} as { [key: string]: string },
    contracts: [emptyContract],
    inventory: '',
    currency: 0,
    admin_note: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<typeof formData>>({});

  const validateForm = () => {
    const errors: Partial<typeof formData> = {};
    if (!formData.character_name.trim()) errors.character_name = 'Имя и Фамилия обязательны';
    // Добавьте другие правила валидации
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
    setFormData(prev => ({
      ...prev,
      attributes: newAttributes
    }));
  };

  const handleArchetypeChange = (archetype: string, isSelected: boolean) => {
    setFormData(prev => ({
      ...prev,
      archetypes: isSelected
        ? [...prev.archetypes, archetype]
        : prev.archetypes.filter(a => a !== archetype)
    }));
  };

  const handleContractChange = (index: number, field: string, value: any) => {
    const newContracts = [...formData.contracts];
    const contract = { ...newContracts[index], [field]: value };

    if (field === 'sync_level') {
      contract.unity_stage = getUnityStage(value);
    }
    
    newContracts[index] = contract;
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >Пожалуйста, заполните все обязательные поля.</Snackbar>);
      return;
    }

    if (!fetchedUser) {
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >Не удалось получить данные пользователя.</Snackbar>);
      return;
    }

    setPopout(<ScreenSpinner />);

    const payload = {
      character: {
        ...formData,
        vk_id: fetchedUser.id,
        age: parseInt(formData.age, 10) || 0,
        contracts: undefined, // Удаляем, так как контракты идут отдельным полем
      },
      contracts: formData.contracts,
    };
    delete payload.character.contracts;


    try {
      const response = await fetch(`${API_URL}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setPopout(null);
      const result = await response.json();

      if (response.ok) {
        setSnackbar(<Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
        >Анкета успешно создана! ID: {result.characterId}</Snackbar>);
        routeNavigator.back();
      } else {
        throw new Error(result.error || 'Неизвестная ошибка сервера');
      }
    } catch (error) {
      setPopout(null);
      const errorMessage = error instanceof Error ? error.message : 'Сетевая ошибка';
      setSnackbar(<Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >{errorMessage}</Snackbar>);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Создание анкеты
      </PanelHeader>
      
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
        <FormItem top="Прозвище/Позывной">
          <Input name="nickname" value={formData.nickname} onChange={handleChange} />
        </FormItem>
        <FormItem top="Возраст">
          <Input name="age" type="number" value={formData.age} onChange={handleChange} />
        </FormItem>
        <FormItem top="Фракция">
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
        <FormItem top="Родной остров">
          <Select
            name="home_island"
            placeholder="Выберите родной остров"
            value={formData.home_island}
            onChange={handleChange}
            options={[
              { label: 'Кага', value: 'Кага' },
              { label: 'Хоши', value: 'Хоши' },
              { label: 'Ичи', value: 'Ичи' },
              { label: 'Куро', value: 'Куро' },
              { label: 'Мидзу', value: 'Мидзу' },
              { label: 'Сора', value: 'Сора' },
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
            />
          </Div>
        ))}
        <FormItem>
          <Button onClick={addContract} before={<Icon24Add />}>
            Добавить контракт
          </Button>
        </FormItem>
      </Group>

      <Group header={<Header>V. ИНВЕНТАРЬ И РЕСУРСЫ</Header>}>
        <FormItem top="Инвентарь">
          <Textarea name="inventory" value={formData.inventory} onChange={handleChange} />
        </FormItem>
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
          Отправить анкету
        </Button>
      </Div>

      {snackbar}
      {popout}
    </Panel>
  );
};