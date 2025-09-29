import { FC, useState, useEffect, ReactNode } from 'react';
import { Panel, PanelHeader, Header, Group, Div, CardGrid, Card, Text, Button, Spinner, Select, Input, FormItem, Snackbar, PanelHeaderBack, Alert } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { Icon24CheckCircleOutline, Icon24ErrorCircle } from '@vkontakte/icons';

interface AdminMarketPanelProps {
  id: string;
}

interface Stock {
  id: number;
  name: string;
  ticker_symbol: string;
  current_price: number;
  base_trend: number;
}

interface MarketEvent {
  title: string;
  description: string;
  impacted_stock_id: number | null;
  impact_strength: number;
  duration_hours: number;
}

export const AdminMarketPanel: FC<AdminMarketPanelProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<MarketEvent>>({ impact_strength: 0.01, duration_hours: 24 });
  
  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/market/stocks`);
      const data = await response.json();
      setStocks(data);
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrendChange = async (ticker: string, trend: number) => {
    const adminId = localStorage.getItem('adminId');
    try {
      const response = await fetch(`${API_URL}/market/admin/stocks/${ticker}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId || '' },
        body: JSON.stringify({ base_trend: trend }),
      });
      const result = await response.json();
      if (response.ok) {
        setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24CheckCircleOutline />}>{result.message}</Snackbar>);
        fetchStocks();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка';
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>{message}</Snackbar>);
    }
  };

  const handleCreateEvent = async () => {
    const adminId = localStorage.getItem('adminId');
    try {
      const response = await fetch(`${API_URL}/market/admin/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId || '' },
        body: JSON.stringify(newEvent),
      });
      const result = await response.json();
      if (response.ok) {
        setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24CheckCircleOutline />}>{result.message}</Snackbar>);
        setNewEvent({ impact_strength: 0.01, duration_hours: 24 });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка';
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>{message}</Snackbar>);
    }
  };

  const showResetConfirmation = () => {
    setPopout(
      <Alert
        actions={[
          { title: 'Отмена', mode: 'cancel' },
          {
            title: 'Сбросить',
            mode: 'destructive',
            action: handleResetEconomy,
          },
        ]}
        actionsLayout="vertical"
        onClose={() => setPopout(null)}
      >
        <h2>Подтверждение сброса</h2>
        <p>Вы уверены, что хотите сбросить всю экономику? Это действие обнулит валюту и акции всех игроков. Действие необратимо.</p>
      </Alert>
    );
  };

  const handleResetEconomy = async () => {
    const adminId = localStorage.getItem('adminId');
    try {
      const response = await fetch(`${API_URL}/market/admin/reset-economy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId || '' },
      });
      const result = await response.json();
      if (response.ok) {
        setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24CheckCircleOutline />}>{result.message}</Snackbar>);
        fetchStocks(); // Обновить список акций
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка';
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)} before={<Icon24ErrorCircle />}>{message}</Snackbar>);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin_panel')} />}>
        Управление Биржей
      </PanelHeader>

      {loading ? <Spinner /> : (
        <>
          <Group header={<Header>Управление трендами акций</Header>}>
            <CardGrid size="l">
              {stocks.map(stock => (
                <Card key={stock.ticker_symbol}>
                  <Header>{stock.name} ({stock.ticker_symbol})</Header>
                  <Div>
                    <Text>Текущая цена: {stock.current_price.toFixed(2)} ₭</Text>
                    <FormItem top="Базовый тренд (e.g., 0.001 for +0.1%)">
                      <Input
                        type="number"
                        defaultValue={stock.base_trend}
                        onBlur={(e) => handleTrendChange(stock.ticker_symbol, Number(e.target.value))}
                      />
                    </FormItem>
                  </Div>
                </Card>
              ))}
            </CardGrid>
          </Group>

          <Group header={<Header>Создать рыночное событие</Header>}>
            <Div>
              <FormItem top="Заголовок события (новость)">
                <Input value={newEvent.title || ''} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
              </FormItem>
              <FormItem top="Описание">
                <Input value={newEvent.description || ''} onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} />
              </FormItem>
              <FormItem top="Целевая акция">
                <Select
                  placeholder="Выберите акцию"
                  value={newEvent.impacted_stock_id || ''}
                  onChange={e => setNewEvent(p => ({ ...p, impacted_stock_id: Number(e.target.value) }))}
                  options={stocks && stocks.length > 0 ? stocks.map(s => ({ label: s.name, value: s.id })) : []}
                />
              </FormItem>
              <FormItem top="Сила влияния (e.g., 0.05 for +5%, -0.02 for -2%)">
                <Input type="number" step="0.01" value={newEvent.impact_strength} onChange={e => setNewEvent(p => ({ ...p, impact_strength: Number(e.target.value) }))} />
              </FormItem>
              <FormItem top="Длительность (в часах)">
                <Input type="number" value={newEvent.duration_hours} onChange={e => setNewEvent(p => ({ ...p, duration_hours: Number(e.target.value) }))} />
              </FormItem>
              <Button size="l" stretched onClick={handleCreateEvent}>Создать событие</Button>
            </Div>
          </Group>

          <Group header={<Header>Опасная зона</Header>}>
            <Div>
              <Button
                size="l"
                stretched
                appearance="negative"
                onClick={showResetConfirmation}
              >
                Сбросить экономику
              </Button>
            </Div>
          </Group>
        </>
      )}
      {snackbar}
      {popout}
    </Panel>
  );
};
