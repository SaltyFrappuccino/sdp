import { FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Group,
  SimpleCell,
  CardGrid,
  Card,
  Header,
  Text,
  Spinner,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormItem,
  Input,
  Button,
  Select,
  Avatar,
  Tooltip,
  PanelHeaderBack,
  Div,
  ButtonGroup,
  ScreenSpinner,
  Snackbar,
  Tabs,
  TabsItem,
  FormLayoutGroup,
} from '@vkontakte/vkui';
import { UserInfo } from '@vkontakte/vk-bridge';
import { API_URL } from '../api';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Icon24CheckCircleOutline, Icon24ErrorCircle } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

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
  total_shares?: number;
  available_shares?: number;
  history?: { price: number, timestamp: string }[];
}

interface PortfolioAsset {
  name: string;
  ticker_symbol: string;
  current_price: number;
  quantity: number;
  average_purchase_price: number;
}

interface ShortPosition {
  id: number;
  quantity: number;
  short_price: number;
  margin_requirement: number;
  interest_rate: number;
  opened_at: string;
  name: string;
  ticker_symbol: string;
  current_price: number;
  unrealized_pnl: number;
}

interface TradingOrder {
  id: number;
  order_type: string;
  side: string;
  quantity: number;
  price: number;
  stop_price: number;
  status: string;
  created_at: string;
  stock_name: string;
  ticker_symbol: string;
  current_price: number;
}

interface Portfolio {
  id: number;
  character_id: number;
  cash_balance: number;
  assets: PortfolioAsset[];
  short_positions?: ShortPosition[];
  active_orders?: TradingOrder[];
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
  average_purchase_price: number;
}

interface LeaderboardEntry {
  character_id: number;
  character_name: string;
  total_value: number;
  cash_balance: number;
  assets: LeaderboardAsset[] | null;
}

export const MarketExchangePanel: FC<MarketExchangePanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
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
  const [hoveredCharacterId, setHoveredCharacterId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'trading' | 'portfolio' | 'orders' | 'leaderboard'>('trading');

  const groupedStocks = stocks.reduce((acc, stock) => {
    (acc[stock.exchange] = acc[stock.exchange] || []).push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  const portfolioValue = portfolio?.assets.reduce((acc, asset) => acc + (asset.current_price * asset.quantity), 0) || 0;
  const totalPortfolioValue = (portfolio?.cash_balance || 0) + portfolioValue;

  const showSnackbar = (message: string, success: boolean) => {
    setSnackbar(
      <Snackbar onClose={() => setSnackbar(null)}>
        {success ? <Icon24CheckCircleOutline /> : <Icon24ErrorCircle />}
        {message}
      </Snackbar>
    );
  };

  const openTradeModal = (stock: Stock, action: 'buy' | 'sell') => {
    setSelectedStock(stock);
    setTradeType(action);
    setTradeQuantity(1);
    setActiveModal('trade');
  };

  const executeTrade = async () => {
    if (!selectedCharacter || !selectedStock || !tradeQuantity || tradeQuantity <= 0) {
      showSnackbar('Заполните все поля корректно', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/market/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          stock_id: selectedStock.id,
          action: tradeType,
          quantity: tradeQuantity,
          vk_id: fetchedUser?.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar(result.message, true);
        setActiveModal(null);
        await fetchStocks();
        await fetchPortfolio(selectedCharacter.id);
        await fetchCharacters();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка выполнения операции', false);
      }
    } catch (error) {
      console.error('Failed to execute trade:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

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
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>Биржа</PanelHeader>
      {loading && <ScreenSpinner />}
      
      <Tabs>
        <TabsItem 
          selected={activeTab === 'trading'} 
          onClick={() => setActiveTab('trading')}
        >
          📈 Торговля
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'portfolio'} 
          onClick={() => setActiveTab('portfolio')}
        >
          💼 Портфолио
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'orders'} 
          onClick={() => setActiveTab('orders')}
        >
          📋 Ордера
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'leaderboard'} 
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Рейтинг
        </TabsItem>
      </Tabs>

      {activeTab === 'trading' && (
        <>
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

      </>
      )}

      {activeTab === 'portfolio' && selectedCharacter && !loading && portfolio && (
        <Group header={<Header>Портфолио персонажа</Header>}>
          <Div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Баланс: {portfolio.cash_balance.toLocaleString('ru-RU')} ₭</Text>
            <Text>Стоимость активов: {portfolioValue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('₽', '₭')}</Text>
            <Text>Итого: {totalPortfolioValue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('₽', '₭')}</Text>
          </Div>
          
          {portfolio.assets.length > 0 && (
            <CardGrid size="l">
              {portfolio.assets.map(asset => {
                const profit = (asset.current_price - asset.average_purchase_price) * asset.quantity;
                const isProfit = profit >= 0;
                return (
                  <Card key={asset.ticker_symbol} mode="shadow">
                    <Div>
                      <Text weight="2">{asset.name} ({asset.ticker_symbol})</Text>
                      <Text>Количество: {asset.quantity}</Text>
                      <Text>Средняя цена: {asset.average_purchase_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                      <Text>Текущая цена: {asset.current_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                      <Text style={{ color: isProfit ? 'var(--vkui--color_text_positive)' : 'var(--vkui--color_text_negative)' }}>
                        P&L: {isProfit ? '+' : ''}{profit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭
                      </Text>
                    </Div>
                  </Card>
                );
              })}
            </CardGrid>
          )}

          {portfolio.short_positions && portfolio.short_positions.length > 0 && (
            <>
              <Header>🔻 Короткие позиции</Header>
              <CardGrid size="l">
                {portfolio.short_positions.map(short => (
                  <Card key={short.id} mode="shadow">
                    <Div>
                      <Text weight="2">{short.name} ({short.ticker_symbol}) - SHORT</Text>
                      <Text>Количество: {short.quantity}</Text>
                      <Text>Цена открытия: {short.short_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                      <Text>Текущая цена: {short.current_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                      <Text>Маржа: {short.margin_requirement.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>
                      <Text style={{ color: short.unrealized_pnl >= 0 ? 'var(--vkui--color_text_positive)' : 'var(--vkui--color_text_negative)' }}>
                        P&L: {short.unrealized_pnl >= 0 ? '+' : ''}{short.unrealized_pnl.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭
                      </Text>
                      <Button size="s" mode="secondary" onClick={() => {
                        // Закрыть короткую позицию
                        fetch(`${API_URL}/market/cover`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            character_id: selectedCharacter!.id,
                            short_position_id: short.id,
                            quantity: short.quantity
                          })
                        }).then(() => {
                          setSnackbar(<Snackbar onClose={() => setSnackbar(null)}><Icon24CheckCircleOutline />Короткая позиция закрыта</Snackbar>);
                          fetchPortfolio(selectedCharacter!.id);
                        });
                      }}>
                        Закрыть позицию
                      </Button>
                    </Div>
                  </Card>
                ))}
              </CardGrid>
            </>
          )}
        </Group>
      )}

      {activeTab === 'orders' && selectedCharacter && !loading && portfolio && (
        <Group header={<Header>Активные ордера</Header>}>
          {portfolio.active_orders && portfolio.active_orders.length > 0 ? (
            <CardGrid size="l">
              {portfolio.active_orders.map(order => (
                <Card key={order.id} mode="shadow">
                  <Div>
                    <Text weight="2">{order.stock_name} ({order.ticker_symbol})</Text>
                    <Text>Тип: {order.order_type.toUpperCase()} / {order.side.toUpperCase()}</Text>
                    <Text>Количество: {order.quantity}</Text>
                    {order.price && <Text>Цена: {order.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>}
                    {order.stop_price && <Text>Стоп-цена: {order.stop_price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭</Text>}
                    <Text>Статус: {order.status}</Text>
                    <Text>Создан: {new Date(order.created_at).toLocaleString('ru-RU')}</Text>
                  </Div>
                </Card>
              ))}
            </CardGrid>
          ) : (
            <Div>
              <Text>Нет активных ордеров</Text>
            </Div>
          )}
        </Group>
      )}

      {activeTab === 'leaderboard' && leaderboard.length > 0 && (
        <Group header={<Header>Рейтинг Трейдеров</Header>}>
          {leaderboard.map((entry, index) => {
            const isHovered = hoveredCharacterId === entry.character_id;
            const character = isHovered ? leaderboard.find(c => c.character_id === hoveredCharacterId) : null;
            
            return (
              <div key={entry.character_id} style={{ position: 'relative' }}>
                <div
                  onClick={() => setHoveredCharacterId(hoveredCharacterId === entry.character_id ? null : entry.character_id)}
                  style={{ 
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s ease',
                    backgroundColor: isHovered ? 'rgba(74, 158, 255, 0.1)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isHovered) {
                      e.currentTarget.style.backgroundColor = 'rgba(74, 158, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isHovered) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
              >
                <SimpleCell
                  before={<Avatar size={28}>{index + 1}</Avatar>}
                  subtitle={`${entry.total_value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{entry.character_name}</span>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#4a9eff', 
                        opacity: 0.7,
                        marginLeft: '8px'
                      }}>
                        👆 Нажмите для деталей
                      </span>
                    </div>
                </SimpleCell>
              </div>
                
                {isHovered && character && (
                  <>
                    {/* Полупрозрачный фон */}
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 9999,
                        backdropFilter: 'blur(4px)'
                      }}
                      onClick={() => setHoveredCharacterId(null)}
                    />
                    
                    {/* Модальное окно */}
                    <div
                      style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: '#1a1a1a',
                        border: '2px solid #4a9eff',
                        borderRadius: '12px',
                        padding: '16px',
                        maxWidth: '350px',
                        width: '90vw',
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        zIndex: 10000,
                        boxShadow: '0 8px 32px rgba(74, 158, 255, 0.3), 0 0 0 1px rgba(74, 158, 255, 0.1)',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-line',
                        backdropFilter: 'blur(10px)',
                        color: '#ffffff'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                    {/* Кнопка закрытия */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(244, 67, 54, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#ffffff',
                      fontWeight: 'bold'
                    }}
                    onClick={() => setHoveredCharacterId(null)}
                    >
                      ×
                    </div>
                    {(() => {
                      const assets = character.assets || [];
                      const totalGainLoss = assets.reduce((sum, asset) => {
                        const currentValue = asset.value;
                        const costBasis = asset.quantity * asset.average_purchase_price;
                        return sum + (currentValue - costBasis);
                      }, 0);
                      
                      const totalInvested = assets.reduce((sum, asset) => {
                        return sum + (asset.quantity * asset.average_purchase_price);
                      }, 0);
                      
                      const gainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
                      const isProfit = totalGainLoss > 0;
                      const isLoss = totalGainLoss < 0;
                      
                      return (
                        <div>
                          {/* Заголовок */}
                          <div style={{ 
                            borderBottom: '2px solid #4a9eff', 
                            paddingBottom: '8px', 
                            marginBottom: '12px',
                            textAlign: 'center'
                          }}>
                            <div style={{ 
                              fontSize: '16px', 
                              fontWeight: 'bold', 
                              color: '#4a9eff',
                              marginBottom: '4px'
                            }}>
                              {character.character_name}
                            </div>
                          </div>
                          
                          {/* Основная информация */}
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              marginBottom: '6px',
                              padding: '6px 8px',
                              backgroundColor: 'rgba(74, 158, 255, 0.1)',
                              borderRadius: '6px'
                            }}>
                              <span style={{ color: '#4a9eff' }}>💰 Наличные:</span>
                              <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                {character.cash_balance?.toLocaleString('ru-RU')} ₭
                              </span>
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              marginBottom: '6px',
                              padding: '6px 8px',
                              backgroundColor: 'rgba(74, 158, 255, 0.1)',
                              borderRadius: '6px'
                            }}>
                              <span style={{ color: '#4a9eff' }}>📊 Общая стоимость:</span>
                              <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                {character.total_value?.toLocaleString('ru-RU')} ₭
                              </span>
                            </div>
                            
                            {totalGainLoss !== 0 && (
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                marginBottom: '6px',
                                padding: '6px 8px',
                                backgroundColor: isProfit ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                borderRadius: '6px',
                                border: `1px solid ${isProfit ? '#4caf50' : '#f44336'}`
                              }}>
                                <span style={{ color: isProfit ? '#4caf50' : '#f44336' }}>
                                  📈 {isProfit ? 'Прибыль' : 'Убыток'}:
                                </span>
                                <span style={{ 
                                  color: isProfit ? '#4caf50' : '#f44336', 
                                  fontWeight: 'bold' 
                                }}>
                                  {isProfit ? '+' : ''}{totalGainLoss.toLocaleString('ru-RU')} ₭ 
                                  ({isProfit ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                                </span>
                              </div>
                            )}
                            
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              backgroundColor: 'rgba(74, 158, 255, 0.1)',
                              borderRadius: '6px'
                            }}>
                              <span style={{ color: '#4a9eff' }}>📋 Активов:</span>
                              <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
                                {assets.length}
                              </span>
                            </div>
                          </div>
                          
                          {/* Портфель */}
                          {assets.length > 0 && (
                            <div>
                              <div style={{ 
                                color: '#4a9eff', 
                                fontWeight: 'bold', 
                                marginBottom: '8px',
                                textAlign: 'center',
                                borderBottom: '1px solid #4a9eff',
                                paddingBottom: '4px'
                              }}>
                                📋 Портфель
                              </div>
                              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {assets.slice(0, 5).map((asset, idx) => {
                                  const assetGainLoss = asset.value - (asset.quantity * asset.average_purchase_price);
                                  const isAssetProfit = assetGainLoss > 0;
                                  const isAssetLoss = assetGainLoss < 0;
                                  
                                  return (
                                    <div key={idx} style={{ 
                                      marginBottom: '8px',
                                      padding: '8px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                      borderRadius: '6px',
                                      border: `1px solid ${isAssetProfit ? 'rgba(76, 175, 80, 0.3)' : isAssetLoss ? 'rgba(244, 67, 54, 0.3)' : 'rgba(74, 158, 255, 0.3)'}`
                                    }}>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#ffffff',
                                        marginBottom: '4px'
                                      }}>
                                        {asset.name} ({asset.ticker})
                                      </div>
                                      <div style={{ 
                                        fontSize: '12px', 
                                        color: '#cccccc',
                                        marginBottom: '2px'
                                      }}>
                                        Количество: {asset.quantity.toLocaleString()} шт.
                                      </div>
                                      <div style={{ 
                                        fontSize: '12px',
                                        color: isAssetProfit ? '#4caf50' : isAssetLoss ? '#f44336' : '#ffffff',
                                        fontWeight: 'bold'
                                      }}>
                                        {isAssetProfit ? '+' : ''}{assetGainLoss.toLocaleString('ru-RU')} ₭
                                      </div>
                                    </div>
                                  );
                                })}
                                {assets.length > 5 && (
                                  <div style={{ 
                                    textAlign: 'center', 
                                    color: '#4a9eff', 
                                    fontSize: '12px',
                                    fontStyle: 'italic',
                                    marginTop: '8px'
                                  }}>
                                    ... и еще {assets.length - 5} активов
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    </div>
                  </>
                )}
              </div>
            );
          })}
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
                                <RechartsTooltip
                                  formatter={(value: any) => {
                                    if (typeof value === 'number') {
                                      return [`${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₭`, "Цена"];
                                    }
                                    return [value, "Цена"];
                                  }}
                                  labelFormatter={(label: string | number) => new Date(label).toLocaleString('ru-RU', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
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
                        <Text>📊 Общий выпуск: {stock.total_shares?.toLocaleString('ru-RU')} акций</Text>
                        <Text style={{ 
                          color: (stock.available_shares || 0) < (stock.total_shares || 0) * 0.1 ? '#f44336' : '#4caf50'
                        }}>
                          🔓 Доступно: {stock.available_shares?.toLocaleString('ru-RU')} акций
                        </Text>
                        <ButtonGroup stretched>
                          <Button 
                            size="m" 
                            mode="primary" 
                            onClick={() => openTradeModal(stock, 'buy')}
                            disabled={(stock.available_shares || 0) <= 0}
                          >
                            Купить
                          </Button>
                          <Button size="m" mode="secondary" onClick={() => openTradeModal(stock, 'sell')}>Продать</Button>
                        </ButtonGroup>
                        <ButtonGroup stretched style={{ marginTop: '8px' }}>
                          <Button size="m" mode="secondary" onClick={() => {
                            // Открыть короткую позицию
                            if (!selectedCharacter) return;
                            fetch(`${API_URL}/market/short`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                character_id: selectedCharacter!.id,
                                ticker_symbol: stock.ticker_symbol,
                                quantity: 1 // По умолчанию 1, можно сделать настраиваемым
                              })
                            }).then(async (res) => {
                              if (res.ok) {
                                setSnackbar(<Snackbar onClose={() => setSnackbar(null)}><Icon24CheckCircleOutline />Короткая позиция открыта</Snackbar>);
                                fetchPortfolio(selectedCharacter!.id);
                                fetchCharacters();
                              } else {
                                const error = await res.json();
                                setSnackbar(<Snackbar onClose={() => setSnackbar(null)}><Icon24ErrorCircle />{error.error}</Snackbar>);
                              }
                            });
                          }}>🔻 Шорт</Button>
                          <Button size="m" mode="outline" onClick={() => {
                            // Создать лимитный ордер
                            if (!selectedCharacter) return;
                            const price = prompt('Введите цену лимитного ордера:');
                            const quantity = prompt('Введите количество:');
                            if (price && quantity) {
                              fetch(`${API_URL}/market/order`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  character_id: selectedCharacter!.id,
                                  ticker_symbol: stock.ticker_symbol,
                                  order_type: 'limit',
                                  side: 'buy',
                                  quantity: parseInt(quantity),
                                  price: parseFloat(price)
                                })
                              }).then(async (res) => {
                                if (res.ok) {
                                  setSnackbar(<Snackbar onClose={() => setSnackbar(null)}><Icon24CheckCircleOutline />Лимитный ордер создан</Snackbar>);
                                  fetchPortfolio(selectedCharacter!.id);
                                } else {
                                  const error = await res.json();
                                  setSnackbar(<Snackbar onClose={() => setSnackbar(null)}><Icon24ErrorCircle />{error.error}</Snackbar>);
                                }
                              });
                            }
                          }}>📋 Лимит</Button>
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
      {activeModal === 'trade' && selectedStock && (
        <ModalRoot activeModal="trade">
          <ModalPage id="trade">
            <ModalPageHeader>
              {tradeType === 'buy' ? 'Покупка' : 'Продажа'} {selectedStock.ticker_symbol}
            </ModalPageHeader>
            <FormLayoutGroup>
              <FormItem top={`Цена за акцию: ${selectedStock.current_price.toLocaleString('ru-RU')} ₭`}>
                <Input
                  type="number"
                  placeholder="Количество"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                  max={tradeType === 'buy' ? selectedStock.available_shares : undefined}
                />
              </FormItem>
              {tradeType === 'buy' && (
                <FormItem top="Доступно для покупки">
                  <span style={{ 
                    color: (selectedStock.available_shares || 0) < (selectedStock.total_shares || 0) * 0.1 ? '#f44336' : '#4caf50'
                  }}>
                    {selectedStock.available_shares?.toLocaleString('ru-RU')} акций
                  </span>
                </FormItem>
              )}
              <FormItem top="Общая стоимость">
                <span>{(selectedStock.current_price * tradeQuantity).toLocaleString('ru-RU')} ₭</span>
              </FormItem>
              <FormItem>
                <ButtonGroup stretched>
                  <Button 
                    size="l" 
                    mode={tradeType === 'buy' ? 'primary' : 'secondary'}
                    onClick={executeTrade}
                    loading={loading}
                    disabled={(tradeType === 'buy' && tradeQuantity > (selectedStock.available_shares || 0)) || tradeQuantity <= 0}
                  >
                    {tradeType === 'buy' ? 'Купить' : 'Продать'}
                  </Button>
                  <Button size="l" mode="tertiary" onClick={() => setActiveModal(null)}>
                    Отмена
                  </Button>
                </ButtonGroup>
              </FormItem>
            </FormLayoutGroup>
          </ModalPage>
        </ModalRoot>
      )}

      {snackbar}
    </Panel>
  );
};
