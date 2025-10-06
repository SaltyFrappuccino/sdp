import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  Header,
  Spinner,
  Div,
  Button,
  PanelHeaderBack,
  ButtonGroup,
  Snackbar,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormLayoutGroup,
  Input,
  Textarea,
  FormItem,
  Search,
  Tabs,
  TabsItem,
  SimpleCell,
  Text,
  Card,
  IconButton,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../api';
import { Icon24CheckCircleOutline, Icon24ErrorCircle, Icon24Add, Icon24Delete, Icon24Settings } from '@vkontakte/icons';

interface Crypto {
  id: number;
  name: string;
  ticker_symbol: string;
  description: string;
  current_price: number;
  base_volatility: number;
  total_supply: number;
  circulating_supply: number;
  created_at: string;
  updated_at: string;
}

interface CryptoEvent {
  id: number;
  title: string;
  description: string;
  impacted_crypto_id: number | null;
  impact_strength: number;
  start_time: string;
  end_time: string;
}

export const AdminCryptoPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [loading, setLoading] = useState(false);
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [events, setEvents] = useState<CryptoEvent[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'cryptos' | 'events'>('cryptos');
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Форма криптовалюты
  const [cryptoForm, setCryptoForm] = useState({
    id: 0,
    name: '',
    ticker_symbol: '',
    description: '',
    current_price: '',
    base_volatility: '0.15',
    total_supply: '1000000000',
  });

  // Форма события
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    impacted_crypto_id: '',
    impact_strength: '',
    duration_hours: '',
  });

  useEffect(() => {
    fetchCryptos();
    fetchEvents();
  }, []);

  const fetchCryptos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/crypto/currencies`);
      const data = await response.json();
      setCryptos(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки криптовалют', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/crypto/events`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки событий', 'error');
    }
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={
          type === 'success' ? (
            <Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />
          ) : (
            <Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />
          )
        }
      >
        {message}
      </Snackbar>
    );
  };

  const handleCreateCrypto = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/crypto/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cryptoForm.name,
          ticker_symbol: cryptoForm.ticker_symbol,
          description: cryptoForm.description,
          current_price: parseFloat(cryptoForm.current_price),
          base_volatility: parseFloat(cryptoForm.base_volatility),
          total_supply: parseInt(cryptoForm.total_supply),
        }),
      });

      if (response.ok) {
        showSnackbar('Криптовалюта создана!', 'success');
        setActiveModal(null);
        setCryptoForm({
          id: 0,
          name: '',
          ticker_symbol: '',
          description: '',
          current_price: '',
          base_volatility: '0.15',
          total_supply: '1000000000',
        });
        fetchCryptos();
      } else {
        showSnackbar('Ошибка создания криптовалюты', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка создания криптовалюты', 'error');
    }
  };

  const handleUpdateCrypto = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/crypto/${cryptoForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cryptoForm.name,
          ticker_symbol: cryptoForm.ticker_symbol,
          description: cryptoForm.description,
          current_price: parseFloat(cryptoForm.current_price),
          base_volatility: parseFloat(cryptoForm.base_volatility),
          total_supply: parseInt(cryptoForm.total_supply),
        }),
      });

      if (response.ok) {
        showSnackbar('Криптовалюта обновлена!', 'success');
        setActiveModal(null);
        fetchCryptos();
      } else {
        showSnackbar('Ошибка обновления криптовалюты', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка обновления криптовалюты', 'error');
    }
  };

  const handleDeleteCrypto = async (cryptoId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту криптовалюту?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/crypto/${cryptoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSnackbar('Криптовалюта удалена!', 'success');
        fetchCryptos();
      } else {
        showSnackbar('Ошибка удаления криптовалюты', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка удаления криптовалюты', 'error');
    }
  };

  const handleCreateEvent = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/crypto/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          impacted_crypto_id: eventForm.impacted_crypto_id ? parseInt(eventForm.impacted_crypto_id) : null,
          impact_strength: parseFloat(eventForm.impact_strength),
          duration_hours: parseInt(eventForm.duration_hours),
        }),
      });

      if (response.ok) {
        showSnackbar('Событие создано!', 'success');
        setActiveModal(null);
        setEventForm({
          title: '',
          description: '',
          impacted_crypto_id: '',
          impact_strength: '',
          duration_hours: '',
        });
        fetchEvents();
      } else {
        showSnackbar('Ошибка создания события', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка создания события', 'error');
    }
  };

  const openEditModal = (crypto: Crypto) => {
    setCryptoForm({
      id: crypto.id,
      name: crypto.name,
      ticker_symbol: crypto.ticker_symbol,
      description: crypto.description,
      current_price: crypto.current_price.toString(),
      base_volatility: crypto.base_volatility.toString(),
      total_supply: crypto.total_supply.toString(),
    });
    setActiveModal('edit-crypto');
  };

  const filteredCryptos = cryptos.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(search.toLowerCase()) ||
      crypto.ticker_symbol.toLowerCase().includes(search.toLowerCase())
  );

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="create-crypto"
        header={<ModalPageHeader>Создать криптовалюту</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={cryptoForm.name}
              onChange={(e) => setCryptoForm({ ...cryptoForm, name: e.target.value })}
              placeholder="Bitcoin"
            />
          </FormItem>
          <FormItem top="Тикер">
            <Input
              value={cryptoForm.ticker_symbol}
              onChange={(e) => setCryptoForm({ ...cryptoForm, ticker_symbol: e.target.value })}
              placeholder="BTC"
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={cryptoForm.description}
              onChange={(e) => setCryptoForm({ ...cryptoForm, description: e.target.value })}
              placeholder="Описание криптовалюты..."
            />
          </FormItem>
          <FormItem top="Текущая цена">
            <Input
              type="number"
              value={cryptoForm.current_price}
              onChange={(e) => setCryptoForm({ ...cryptoForm, current_price: e.target.value })}
              placeholder="1000"
            />
          </FormItem>
          <FormItem top="Волатильность (0-1)">
            <Input
              type="number"
              step="0.01"
              value={cryptoForm.base_volatility}
              onChange={(e) => setCryptoForm({ ...cryptoForm, base_volatility: e.target.value })}
              placeholder="0.15"
            />
          </FormItem>
          <FormItem top="Общий запас">
            <Input
              type="number"
              value={cryptoForm.total_supply}
              onChange={(e) => setCryptoForm({ ...cryptoForm, total_supply: e.target.value })}
              placeholder="1000000000"
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleCreateCrypto}>
              Создать
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="edit-crypto"
        header={<ModalPageHeader>Редактировать криптовалюту</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={cryptoForm.name}
              onChange={(e) => setCryptoForm({ ...cryptoForm, name: e.target.value })}
            />
          </FormItem>
          <FormItem top="Тикер">
            <Input
              value={cryptoForm.ticker_symbol}
              onChange={(e) => setCryptoForm({ ...cryptoForm, ticker_symbol: e.target.value })}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={cryptoForm.description}
              onChange={(e) => setCryptoForm({ ...cryptoForm, description: e.target.value })}
            />
          </FormItem>
          <FormItem top="Текущая цена">
            <Input
              type="number"
              value={cryptoForm.current_price}
              onChange={(e) => setCryptoForm({ ...cryptoForm, current_price: e.target.value })}
            />
          </FormItem>
          <FormItem top="Волатильность (0-1)">
            <Input
              type="number"
              step="0.01"
              value={cryptoForm.base_volatility}
              onChange={(e) => setCryptoForm({ ...cryptoForm, base_volatility: e.target.value })}
            />
          </FormItem>
          <FormItem top="Общий запас">
            <Input
              type="number"
              value={cryptoForm.total_supply}
              onChange={(e) => setCryptoForm({ ...cryptoForm, total_supply: e.target.value })}
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleUpdateCrypto}>
              Сохранить
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="create-event"
        header={<ModalPageHeader>Создать событие</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Заголовок">
            <Input
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="Название события"
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Описание события..."
            />
          </FormItem>
          <FormItem top="ID криптовалюты (опционально)">
            <Input
              type="number"
              value={eventForm.impacted_crypto_id}
              onChange={(e) => setEventForm({ ...eventForm, impacted_crypto_id: e.target.value })}
              placeholder="Оставьте пустым для глобального события"
            />
          </FormItem>
          <FormItem top="Сила воздействия (-1 до 1)">
            <Input
              type="number"
              step="0.1"
              value={eventForm.impact_strength}
              onChange={(e) => setEventForm({ ...eventForm, impact_strength: e.target.value })}
              placeholder="0.5"
            />
          </FormItem>
          <FormItem top="Продолжительность (часы)">
            <Input
              type="number"
              value={eventForm.duration_hours}
              onChange={(e) => setEventForm({ ...eventForm, duration_hours: e.target.value })}
              placeholder="24"
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleCreateEvent}>
              Создать
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin_panel')} />}>
        Управление криптовалютами
      </PanelHeader>

      <Group>
        <Tabs>
          <TabsItem selected={activeTab === 'cryptos'} onClick={() => setActiveTab('cryptos')}>
            Криптовалюты
          </TabsItem>
          <TabsItem selected={activeTab === 'events'} onClick={() => setActiveTab('events')}>
            События
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'cryptos' && (
        <>
          <Group header={<Header>💰 Криптовалюты</Header>}>
            <Div>
              <Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('create-crypto')}>
                Создать криптовалюту
              </Button>
            </Div>
            <Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." />
            {loading ? (
              <Div>
                <Spinner size="m" />
              </Div>
            ) : (
              <Div>
                {filteredCryptos.map((crypto) => (
                  <Card key={crypto.id} style={{ marginBottom: '12px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <Text weight="2" style={{ fontSize: '16px' }}>
                          {crypto.name} ({crypto.ticker_symbol})
                        </Text>
                        <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                          {crypto.description}
                        </Text>
                        <Text style={{ marginTop: '8px' }}>
                          💵 Цена: {crypto.current_price.toFixed(2)} кр.
                        </Text>
                        <Text>📊 Волатильность: {(crypto.base_volatility * 100).toFixed(1)}%</Text>
                        <Text>📦 Запас: {crypto.total_supply.toLocaleString()}</Text>
                      </div>
                      <ButtonGroup mode="vertical" gap="s">
                        <IconButton onClick={() => openEditModal(crypto)}>
                          <Icon24Settings />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteCrypto(crypto.id)}>
                          <Icon24Delete />
                        </IconButton>
                      </ButtonGroup>
                    </div>
                  </Card>
                ))}
              </Div>
            )}
          </Group>
        </>
      )}

      {activeTab === 'events' && (
        <Group header={<Header>🎪 События</Header>}>
          <Div>
            <Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('create-event')}>
              Создать событие
            </Button>
          </Div>
          <Div>
            {events.map((event) => {
              const startTime = new Date(event.start_time);
              const endTime = new Date(event.end_time);
              const isActive = new Date() < endTime;

              return (
                <Card key={event.id} style={{ marginBottom: '12px', padding: '12px' }}>
                  <Text weight="2" style={{ fontSize: '16px' }}>
                    {event.title} {isActive && <span style={{ color: 'green' }}>●</span>}
                  </Text>
                  <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                    {event.description}
                  </Text>
                  <Text style={{ marginTop: '8px', fontSize: '14px' }}>
                    ⚡ Воздействие: {event.impact_strength > 0 ? '+' : ''}{(event.impact_strength * 100).toFixed(0)}%
                  </Text>
                  <Text style={{ fontSize: '14px' }}>
                    ⏰ {startTime.toLocaleString('ru-RU')} - {endTime.toLocaleString('ru-RU')}
                  </Text>
                  {event.impacted_crypto_id && (
                    <Text style={{ fontSize: '14px' }}>🎯 Криптовалюта ID: {event.impacted_crypto_id}</Text>
                  )}
                </Card>
              );
            })}
          </Div>
        </Group>
      )}

      {snackbar}
    </Panel>
  );
};

