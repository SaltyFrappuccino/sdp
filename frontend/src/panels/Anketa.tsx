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
  abilities: {},
};

export const Anketa: FC<AnketaProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const [formData, setFormData] = useState({
    // I. ОБЩАЯ ИНФОРМАЦИЯ
    character_name: '',
    nickname: '',
    age: '',
    faction: '',
    home_island: '',
    // II. ЛИЧНОСТЬ И ВНЕШНОСТЬ
    appearance: '',
    personality: '',
    biography: '',
    // III. БОЕВЫЕ ХАРАКТЕРИСТИКИ
    archetypes: '',
    attributes: {},
    // IV. КОНТРАКТ
    contracts: [emptyContract],
    // V. ИНВЕНТАРЬ И РЕСУРСЫ
    inventory: '',
    currency: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContractChange = (index: number, field: string, value: any) => {
    const newContracts = [...formData.contracts];
    newContracts[index] = { ...newContracts[index], [field]: value };
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
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/characters`, {
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
        <FormItem top="Имя и Фамилия">
          <Input name="character_name" value={formData.character_name} onChange={handleChange} />
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
        <FormItem top="Архетип(ы)">
          <Input name="archetypes" value={formData.archetypes} onChange={handleChange} placeholder="[Дуэлянт], [Тактик]..." />
        </FormItem>
        <FormItem top="Атрибуты">
          <Textarea name="attributes" value={formData.attributes as string} onChange={handleChange} placeholder="Сила: Дилетант (1) ..." />
        </FormItem>
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