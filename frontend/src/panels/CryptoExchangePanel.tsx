import { FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  Card,
  Div,
  Text,
  Button,
  Tabs,
  TabsItem,
  FormItem,
  Select,
  Input,
  Spinner,
  Snackbar,
  SimpleCell,
  Avatar,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  Counter,
  CardGrid
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { Icon28DoneOutline, Icon28ErrorCircleOutline } from '@vkontakte/icons';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface CryptoExchangePanelProps extends NavIdProps {
  fetchedUser?: any;
}

interface Crypto {
  id: number;
  name: string;
  ticker_symbol: string;
  description: string;
  current_price: number;
  base_volatility: number;
  total_supply: number;
  circulating_supply: number;
  history?: { price: number; timestamp: string }[];
}

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface PortfolioAsset {
  crypto_id: number;
  name: string;
  ticker_symbol: string;
  quantity: number;
  average_purchase_price: number;
  current_price: number;
  current_value: number;
  profit: number;
  profit_percent: number;
}

interface Portfolio {
  character_id: number;
  total_value: number;
  assets: PortfolioAsset[];
}

interface Transaction {
  id: number;
  crypto_id: number;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price_per_coin: number;
  total_amount: number;
  created_at: string;
  name: string;
  ticker_symbol: string;
}

interface LeaderboardEntry {
  character_id: number;
  character_name: string;
  total_value: number;
}

interface CryptoEvent {
  id: number;
  title: string;
  description: string;
  impacted_crypto_id: number | null;
  crypto_name: string | null;
  ticker_symbol: string | null;
  impact_strength: number;
  start_time: string;
  end_time: string;
}

export const CryptoExchangePanel: FC<CryptoExchangePanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();

  const [activeTab, setActiveTab] = useState<'market' | 'portfolio' | 'history' | 'leaderboard' | 'events'>('market');
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<CryptoEvent[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    fetchCryptos();
    fetchCharacters();
    fetchLeaderboard();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedCharacter) {
      fetchPortfolio(selectedCharacter.id);
      fetchTransactions(selectedCharacter.id);
    }
  }, [selectedCharacter]);

  const fetchCryptos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/crypto/currencies`);
      const data = await response.json();
      setCryptos(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки криптовалют', false);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharacters = async () => {
    if (!fetchedUser) return;
    try {
      const response = await fetch(`${API_URL}/my-anketas/${fetchedUser.id}`);
      const data = await response.json();
      const acceptedChars = data.filter((char: any) => char.status === 'Принято' && (char.life_status === 'Жив' || char.life_status === 'Жива'));
      setCharacters(acceptedChars);
      if (acceptedChars.length > 0) {
        setSelectedCharacter(acceptedChars[0]);
      }
    } catch (error) {
      showSnackbar('Ошибка загрузки персонажей', false);
    }
  };

  const fetchPortfolio = async (characterId: number) => {
    try {
      const response = await fetch(`${API_URL}/crypto/portfolio/${characterId}`);
      const data = await response.json();
      setPortfolio(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки портфеля', false);
    }
  };

  const fetchTransactions = async (characterId: number) => {
    try {
      const response = await fetch(`${API_URL}/crypto/transactions/${characterId}`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки истории', false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/crypto/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/crypto/events`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleTrade = async () => {
    if (!selectedCharacter || !selectedCrypto || !tradeQuantity) return;

    const quantity = parseFloat(tradeQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      showSnackbar('Введите корректное количество', false);
      return;
    }

    try {
      setLoading(true);
      const endpoint = tradeAction === 'buy' ? '/crypto/buy' : '/crypto/sell';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          crypto_id: selectedCrypto.id,
          quantity,
        }),
      });

      if (response.ok) {
        showSnackbar(`Успешно ${tradeAction === 'buy' ? 'куплено' : 'продано'}!`, true);
        setTradeQuantity('');
        setSelectedCrypto(null);
        fetchCryptos();
        fetchCharacters();
        if (selectedCharacter) {
          fetchPortfolio(selectedCharacter.id);
          fetchTransactions(selectedCharacter.id);
        }
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Ошибка транзакции', false);
      }
    } catch (error) {
      showSnackbar('Ошибка транзакции', false);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, success: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={success ? <Icon28DoneOutline fill="var(--vkui--color_icon_positive)" /> : <Icon28ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
      >
        {message}
      </Snackbar>
    );
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Крипто Биржа
      </PanelHeader>

      {/* Выбор персонажа */}
      {characters.length > 0 && (
        <Group>
          <FormItem top="Персонаж">
            <Select
              value={selectedCharacter?.id.toString() || ''}
              onChange={(e) => {
                const char = characters.find(c => c.id === parseInt(e.target.value));
                if (char) setSelectedCharacter(char);
              }}
              options={characters.map(char => ({
                label: `${char.character_name} - ${char.currency.toLocaleString()} ₭`,
                value: char.id.toString()
              }))}
            />
          </FormItem>
        </Group>
      )}

      {/* Вкладки */}
      <Group>
        <Tabs>
          <TabsItem
            selected={activeTab === 'market'}
            onClick={() => setActiveTab('market')}
          >
            Рынок
          </TabsItem>
          <TabsItem
            selected={activeTab === 'portfolio'}
            onClick={() => setActiveTab('portfolio')}
          >
            Портфель
          </TabsItem>
          <TabsItem
            selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          >
            История
          </TabsItem>
          <TabsItem
            selected={activeTab === 'leaderboard'}
            onClick={() => setActiveTab('leaderboard')}
          >
            Топ
          </TabsItem>
          <TabsItem
            selected={activeTab === 'events'}
            onClick={() => setActiveTab('events')}
          >
            События
          </TabsItem>
        </Tabs>
      </Group>

      {/* Вкладка "Рынок" */}
      {activeTab === 'market' && (
        <>
          {loading && <Spinner size="m" style={{ margin: '20px auto' }} />}
          
          {cryptos.map((crypto) => {
            const priceChange = crypto.base_volatility * 100;
            const isPositive = Math.random() > 0.5; // В реальности это будет из истории

            return (
              <Group key={crypto.id}>
                <Card mode="shadow">
                  <Div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text weight="2" style={{ fontSize: 18 }}>{crypto.name}</Text>
                        <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 14 }}>
                          {crypto.ticker_symbol}
                        </Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text weight="2" style={{ fontSize: 18 }}>{formatPrice(crypto.current_price)} ₭</Text>
                        <Text style={{ color: isPositive ? 'var(--vkui--color_text_positive)' : 'var(--vkui--color_text_negative)', fontSize: 14 }}>
                          {isPositive ? '+' : '-'}{priceChange.toFixed(2)}%
                        </Text>
                      </div>
                    </div>
                    
                    <Text style={{ marginTop: 8, fontSize: 14, color: 'var(--vkui--color_text_secondary)' }}>
                      {crypto.description}
                    </Text>

                    <div style={{ marginTop: 12 }}>
                      <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
                        Волатильность: {(crypto.base_volatility * 100).toFixed(0)}% • 
                        Макс. эмиссия: {(crypto.total_supply / 1000000).toFixed(1)}М
                      </Text>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Button
                        size="m"
                        mode="primary"
                        stretched
                        onClick={() => {
                          setSelectedCrypto(crypto);
                          setTradeAction('buy');
                          setActiveModal('trade');
                        }}
                        disabled={!selectedCharacter}
                      >
                        Купить
                      </Button>
                      <Button
                        size="m"
                        mode="secondary"
                        stretched
                        onClick={() => {
                          setSelectedCrypto(crypto);
                          setTradeAction('sell');
                          setActiveModal('trade');
                        }}
                        disabled={!selectedCharacter}
                      >
                        Продать
                      </Button>
                    </div>
                  </Div>
                </Card>
              </Group>
            );
          })}
        </>
      )}

      {/* Вкладка "Портфель" */}
      {activeTab === 'portfolio' && (
        <>
          {selectedCharacter && portfolio && (
            <>
              <Group header={<Header>Общая стоимость</Header>}>
                <Card>
                  <Div>
                    <Text weight="2" style={{ fontSize: 24 }}>
                      {formatPrice(portfolio.total_value)} ₭
                    </Text>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                      Активов: {portfolio.assets.length}
                    </Text>
                  </Div>
                </Card>
              </Group>

              {portfolio.assets.length > 0 ? (
                <Group header={<Header>Мои активы</Header>}>
                  {portfolio.assets.map((asset) => (
                    <Card key={asset.crypto_id} mode="outline" style={{ marginBottom: 8 }}>
                      <Div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <Text weight="2">{asset.name}</Text>
                            <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)' }}>
                              {asset.ticker_symbol}
                            </Text>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <Text weight="2">{formatPrice(asset.current_value)} ₭</Text>
                            <Text style={{ fontSize: 14, color: asset.profit >= 0 ? 'var(--vkui--color_text_positive)' : 'var(--vkui--color_text_negative)' }}>
                              {asset.profit >= 0 ? '+' : ''}{formatPrice(asset.profit)} ₭ ({asset.profit_percent.toFixed(2)}%)
                            </Text>
                          </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
                            Количество: {asset.quantity.toFixed(4)} • Средняя цена: {formatPrice(asset.average_purchase_price)} ₭
                          </Text>
                        </div>
                      </Div>
                    </Card>
                  ))}
                </Group>
              ) : (
                <Group>
                  <Div>
                    <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                      У вас пока нет криптовалюты
                    </Text>
                  </Div>
                </Group>
              )}
            </>
          )}

          {!selectedCharacter && (
            <Group>
              <Div>
                <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                  Выберите персонажа для просмотра портфеля
                </Text>
              </Div>
            </Group>
          )}
        </>
      )}

      {/* Вкладка "История" */}
      {activeTab === 'history' && (
        <>
          {selectedCharacter && transactions.length > 0 ? (
            <Group header={<Header>История транзакций</Header>}>
              {transactions.map((tx) => (
                <SimpleCell
                  key={tx.id}
                  subtitle={`${formatDate(tx.created_at)} • ${tx.quantity.toFixed(4)} монет • ${formatPrice(tx.total_amount)} ₭`}
                  after={
                    <Text style={{ color: tx.transaction_type === 'buy' ? 'var(--vkui--color_text_positive)' : 'var(--vkui--color_text_negative)' }}>
                      {tx.transaction_type === 'buy' ? 'Покупка' : 'Продажа'}
                    </Text>
                  }
                >
                  {tx.name} ({tx.ticker_symbol})
                </SimpleCell>
              ))}
            </Group>
          ) : (
            <Group>
              <Div>
                <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                  История транзакций пуста
                </Text>
              </Div>
            </Group>
          )}
        </>
      )}

      {/* Вкладка "Топ" */}
      {activeTab === 'leaderboard' && (
        <Group header={<Header>Топ держателей криптовалют</Header>}>
          {leaderboard.filter(entry => entry.total_value > 0).length > 0 ? (
            leaderboard.filter(entry => entry.total_value > 0).map((entry, index) => (
              <SimpleCell
                key={entry.character_id}
                before={
                  <div style={{
                    width: 40,
                    height: 40,
                  borderRadius: '50%',
                  backgroundColor: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : 'var(--vkui--color_background_secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {index + 1}
                </div>
              }
              subtitle={`${formatPrice(entry.total_value)} ₭`}
            >
              {entry.character_name}
            </SimpleCell>
          ))
          ) : (
            <Div>
              <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                Нет держателей криптовалют
              </Text>
            </Div>
          )}
        </Group>
      )}

      {/* Вкладка "События" */}
      {activeTab === 'events' && (
        <>
          {events.length > 0 ? (
            <Group header={<Header>Активные события</Header>}>
              {events.map((event) => (
                <Card key={event.id} mode="outline" style={{ marginBottom: 8 }}>
                  <Div>
                    <Text weight="2" style={{ marginBottom: 4 }}>{event.title}</Text>
                    <Text style={{ fontSize: 14, marginBottom: 8 }}>{event.description}</Text>
                    {event.crypto_name && (
                      <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
                        Затронуто: {event.crypto_name} ({event.ticker_symbol})
                      </Text>
                    )}
                    <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                      Сила воздействия: {(event.impact_strength * 100).toFixed(0)}%
                    </Text>
                    <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                      До: {formatDate(event.end_time)}
                    </Text>
                  </Div>
                </Card>
              ))}
            </Group>
          ) : (
            <Group>
              <Div>
                <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                  Нет активных событий
                </Text>
              </Div>
            </Group>
          )}
        </>
      )}

      {/* Модальное окно торговли */}
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id="trade"
          onClose={() => {
            setActiveModal(null);
            setTradeQuantity('');
          }}
          header={
            <ModalPageHeader>
              {tradeAction === 'buy' ? 'Купить' : 'Продать'} {selectedCrypto?.name}
            </ModalPageHeader>
          }
        >
          {selectedCrypto && (
            <Group>
              <Div>
                <Text weight="2" style={{ fontSize: 18, marginBottom: 4 }}>
                  {selectedCrypto.name}
                </Text>
                <Text style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: 16 }}>
                  {selectedCrypto.ticker_symbol}
                </Text>

                {/* График цены */}
                {selectedCrypto.history && selectedCrypto.history.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={selectedCrypto.history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="price" stroke="#3f8ae0" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <FormItem top="Текущая цена">
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                    {formatPrice(selectedCrypto.current_price)} ₭
                  </div>
                </FormItem>

                <FormItem top="Количество монет">
                  <Input
                    type="number"
                    value={tradeQuantity}
                    onChange={(e) => setTradeQuantity(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                  />
                </FormItem>

                {tradeQuantity && parseFloat(tradeQuantity) > 0 && (
                  <FormItem top="Общая сумма">
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>
                      {formatPrice(parseFloat(tradeQuantity) * selectedCrypto.current_price)} ₭
                    </div>
                  </FormItem>
                )}

                {selectedCharacter && (
                  <FormItem top="Доступно средств">
                    <Text style={{ fontSize: 16 }}>
                      {selectedCharacter.currency.toLocaleString()} ₭
                    </Text>
                  </FormItem>
                )}

                <FormItem>
                  <Button
                    size="l"
                    mode="primary"
                    stretched
                    onClick={async () => {
                      await handleTrade();
                      setActiveModal(null);
                      setTradeQuantity('');
                    }}
                    disabled={loading || !tradeQuantity || parseFloat(tradeQuantity) <= 0}
                    loading={loading}
                  >
                    {tradeAction === 'buy' ? 'Купить' : 'Продать'}
                  </Button>
                </FormItem>
              </Div>
            </Group>
          )}
        </ModalPage>
      </ModalRoot>

      {snackbar}
    </Panel>
  );
};

