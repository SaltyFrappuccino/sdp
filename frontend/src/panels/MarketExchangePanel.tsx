import { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Header, Group, Div, Select, CardGrid, Card, Text, Button, Spinner, ScreenSpinner, ButtonGroup, Snackbar, ModalRoot, ModalPage, ModalPageHeader, FormItem, Input, Cell, Avatar, Popover, SimpleCell } from '@vkontakte/vkui';
import { UserInfo } from '@vkontakte/vk-bridge';
import { API_URL } from '../api';
import { XAxis as RechartsXAxis, YAxis as RechartsYAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Icon24CheckCircleOutline, Icon24ErrorCircle } from '@vkontakte/icons';

const XAxis: any = RechartsXAxis;
const YAxis: any = RechartsYAxis;

interface MarketExchangePanelProps {
  id: string;
  fetchedUser?: UserInfo;
}

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface Stock {
  id: number;
  name: string;
  ticker_symbol: string;
  description: string;
  current_price: number;
  exchange: string;
  history?: { price: number, timestamp: string }[];
}

interface PortfolioAsset {
  name: string;
  ticker_symbol: string;
  current_price: number;
  quantity: number;
  average_purchase_price: number;
}

interface Portfolio {
  id: number;
  character_id: number;
  cash_balance: number;
  assets: PortfolioAsset[];
}

interface MarketEvent {
  id: number;
  title: string;
  description: string;
  impact_strength: number;
  start_time: string;
  impacted_stock_name?: string;
  impacted_stock_ticker?: string;
}

interface LeaderboardAsset {
  name: string;
  ticker: string;
  quantity: number;
  value: number;
}

interface LeaderboardEntry {
  character_id: number;
  character_name: string;
  total_value: number;
  cash_balance: number;
  assets: LeaderboardAsset[] | null;
}

export const MarketExchangePanel: FC<MarketExchangePanelProps> = ({ id, fetchedUser }) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeQuantity, setTradeQuantity] = useState(1);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const groupedStocks = stocks.reduce((acc, stock) => {
    (acc[stock.exchange] = acc[stock.exchange] || []).push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  const portfolioValue = portfolio?.assets.reduce((acc, asset) => acc + (asset.current_price * asset.quantity), 0) || 0;
  const totalPortfolioValue = (portfolio?.cash_balance || 0) + portfolioValue;

  useEffect(() => {
    if (fetchedUser) {
      setLoading(true);
      Promise.all([fetchCharacters(), fetchStocks(), fetchMarketEvents(), fetchLeaderboard()])
        .catch(error => console.error("Failed to fetch initial data:", error))
        .finally(() => setLoading(false));
    }
  }, [fetchedUser]);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/characters/by-vk/${fetchedUser?.id}`);
      const data = await response.json();
      setCharacters(data);
      if (data.length > 0) {
        // Automatically select the first character and fetch their portfolio
        handleCharacterSelect(data[0].id, data);
      }
    } catch (error) {
      console.error("Failed to fetch characters:", error);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await fetch(`${API_URL}/market/stocks`);
      const data = await response.json();
      setStocks(data);
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  const fetchMarketEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/market/events`);
      const data = await response.json();
      setMarketEvents(data);
    } catch (error) {
      console.error("Failed to fetch market events:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/market/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  };
  
  const fetchPortfolio = async (characterId: number) => {
    try {
      const response = await fetch(`${API_URL}/market/portfolio/${characterId}`);
      const data = await response.json();
      setPortfolio(data);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    }
  };

  const handleCharacterSelect = (characterId: number, currentCharacters?: Character[]) => {
    const charList = currentCharacters || characters;
    const character = charList.find(c => c.id === characterId);
    if (character) {
      setSelectedCharacter(character);
      setLoading(true);
      fetchPortfolio(character.id).finally(() => setLoading(false));
    }
  };

  const openTradeModal = (stock: Stock, type: 'buy' | 'sell') => {
    setSelectedStock(stock);
    setTradeType(type);
    setTradeQuantity(1);
    setActiveModal('trade');
  };

  const handleTrade = async () => {
    if (!selectedCharacter || !selectedStock || tradeQuantity <= 0) return;

    try {
      const response = await fetch(`${API_URL}/market/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          ticker_symbol: selectedStock.ticker_symbol,
          quantity: tradeQuantity,
          trade_type: tradeType
        })
      });
      const result = await response.json();
      if (response.ok) {
        setSnackbar(
          <Snackbar
            onClose={() => setSnackbar(null)}
            before={<Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />}
          >
            {result.message}
          </Snackbar>
        );
        // Refresh portfolio only, stocks don't change
        fetchPortfolio(selectedCharacter.id);
      } else {
        throw new Error(result.error || 'Ошибка при совершении сделки');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >
          {message}
        </Snackbar>
      );
    } finally {
      setActiveModal(null);
    }
  };
  
  if (!fetchedUser) {
    return <Panel id={id}><PanelHeader>Биржа</PanelHeader><Spinner/></Panel>;
  }

  return (
    <Panel id={id}>
      <PanelHeader>Биржа</PanelHeader>
      {loading && <ScreenSpinner />}
      <Group>
        <Header>Выбор персонажа</Header>
        <Div>
          {characters.length > 0 ? (
            <Select
              placeholder="Выберите персонажа"
              value={selectedCharacter?.id}
              onChange={(e) => handleCharacterSelect(Number(e.target.value))}
              options={characters.map(c => ({ label: `${c.character_name} (${c.currency.toLocaleString('ru-RU')} ₭)`, value: c.id }))}
            />
          ) : (
            <Text>У вас нет принятых персонажей для торговли на бирже.</Text>
          )}
        </Div>
      </Group>

      {leaderboard.length > 0 && (
        <Group header={<Header>Рейтинг Трейдеров</Header>}>
          {leaderboard.map((entry, index) => (
            <Popover
              key={entry.character_id}
              trigger="hover"
              placement="left-start"
              content={
                <Div style={{ minWidth: 200, maxWidth: 300 }}>
                  <SimpleCell disabled>
                    <Header>Портфель</Header>
                  </SimpleCell>
                  <SimpleCell disabled after={`${entry.cash_balance.toLocaleString('ru-RU')} ₭`}>
                    Наличные
                  </SimpleCell>
                  
                  {entry.assets && entry.assets.length > 0 && entry.assets.map(asset => (
                    <SimpleCell 
                      key={asset.ticker}
                      disabled 
                      subtitle={`${asset.quantity} шт.`}
                      after={`${asset.value.toLocaleString('ru-RU')} ₭`}
                    >
                      {asset.name}
                    </SimpleCell>
                  ))}
                </Div>
              }
            >
              <Cell
                before={<Avatar size={28}>{index + 1}</Avatar>}
                subtitle={`${entry.total_value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭`}
              >
                {entry.character_name}
              </Cell>
            </Popover>
          ))}
        </Group>
      )}

      {selectedCharacter && !loading && (
        <>
          <Group header={<Header>Портфолио</Header>}>
            <Div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Баланс: {portfolio?.cash_balance.toLocaleString('ru-RU')} ₭</Text>
              <Text>Стоимость активов: {portfolioValue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('₽', '₭')}</Text>
              <Text>Итого: {totalPortfolioValue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('₽', '₭')}</Text>
            </Div>
            <CardGrid size="l">
              {portfolio?.assets.map(asset => {
                const profit = (asset.current_price - asset.average_purchase_price) * asset.quantity;
                const isProfit = profit >= 0;
                return (
                  <Card key={asset.ticker_symbol}>
                    <Header>{asset.name} ({asset.ticker_symbol})</Header>
                    <Div>
                      <Text>Количество: {asset.quantity}</Text>
                      <Text>Средняя цена покупки: {asset.average_purchase_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                      <Text>Текущая цена: {asset.current_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                      <Text>Прибыль/Убыток: <span style={{ color: isProfit ? 'green' : 'red' }}>
                        {isProfit ? '+' : ''}{profit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭
                      </span></Text>
                    </Div>
                  </Card>
                );
              })}
            </CardGrid>
          </Group>

          <Group>
            {Object.entries(groupedStocks).map(([exchange, stocksInExchange]) => (
              <div key={exchange}>
                <Header>{exchange}</Header>
                <CardGrid size="l">
                  {stocksInExchange.map(stock => (
                    <Card key={stock.ticker_symbol}>
                      <Header>{stock.name} ({stock.ticker_symbol})</Header>
                       <Div>
                        {stock.history && stock.history.length > 1 && (
                          <div style={{ height: 100 }}>
                            <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={stock.history.slice().reverse()} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                <XAxis dataKey="timestamp" hide />
                                <YAxis domain={['dataMin', 'dataMax']} hide />
                                <Tooltip
                                  formatter={(value) => [`${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭`, "Цена"]}
                                  labelFormatter={(label) => new Date(label).toLocaleDateString('ru-RU')}
                                />
                                 <Area type="monotone" dataKey="price" stroke="#8884d8" fill="#8884d8" strokeWidth={2} dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </Div>
                      <Div>
                        <Text>{stock.description}</Text>
                        <Text>Цена: {stock.current_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                        <ButtonGroup stretched>
                          <Button size="m" mode="primary" onClick={() => openTradeModal(stock, 'buy')}>Купить</Button>
                          <Button size="m" mode="secondary" onClick={() => openTradeModal(stock, 'sell')}>Продать</Button>
                        </ButtonGroup>
                      </Div>
                    </Card>
                  ))}
                </CardGrid>
              </div>
            ))}
          </Group>
        </>
      )}

      {marketEvents.length > 0 && (
        <Group header={<Header>Новости Рынка</Header>}>
          {marketEvents.map(event => (
            <Card key={event.id} mode="shadow" style={{ marginBottom: '10px' }}>
              <Div>
                <Header subtitle={new Date(event.start_time).toLocaleString('ru-RU')}>{event.title}</Header>
                <Text>{event.description}</Text>
                {event.impacted_stock_name && (
                  <Text style={{ marginTop: '8px', color: event.impact_strength > 0 ? 'var(--vkui--color_text_positive)' : 'var(--vkui--color_text_negative)' }}>
                    Влияние на: {event.impacted_stock_name} ({event.impacted_stock_ticker})
                  </Text>
                )}
              </Div>
            </Card>
          ))}
        </Group>
      )}

      <ModalRoot activeModal={activeModal}>
        <ModalPage
          id="trade"
          onClose={() => setActiveModal(null)}
          header={<ModalPageHeader>{tradeType === 'buy' ? 'Покупка' : 'Продажа'} {selectedStock?.name}</ModalPageHeader>}
        >
          <Div>
            <FormItem top="Количество">
              <Input type="number" value={tradeQuantity} onChange={(e) => setTradeQuantity(Number(e.target.value))} min="1" />
            </FormItem>
            <FormItem>
              <Text>Сумма сделки: {(tradeQuantity * (selectedStock?.current_price || 0)).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
            </FormItem>
            <ButtonGroup stretched>
              <Button size="l" mode="secondary" onClick={() => setActiveModal(null)}>Отмена</Button>
              <Button size="l" mode="primary" onClick={handleTrade}>{tradeType === 'buy' ? 'Купить' : 'Продать'}</Button>
            </ButtonGroup>
          </Div>
        </ModalPage>
      </ModalRoot>
      {snackbar}
    </Panel>
  );
};
