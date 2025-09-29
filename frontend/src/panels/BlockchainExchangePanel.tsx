import React, { useState, useEffect, ReactNode } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  Card,
  CardGrid,
  Button,
  Div,
  Placeholder,
  ModalPage,
  ModalPageHeader,
  FormLayoutGroup,
  FormItem,
  Input,
  Textarea,
  ButtonGroup,
  Snackbar,
  Select,
  Tabs,
  TabsItem
} from '@vkontakte/vkui';
import { useRouteNavigator, NavIdProps } from '@vkontakte/vk-mini-apps-router';
import { UserInfo } from '@vkontakte/vk-bridge';
import { API_URL } from '../api';
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Icon24CheckCircleOutline, Icon24ErrorCircle } from '@vkontakte/icons';

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface Token {
  id: number;
  name: string;
  symbol: string;
  description: string;
  current_price: number;
  market_cap: number;
  volume: number;
  exchange: string;
  base_trend: number;
  total_supply: number;
  circulating_supply: number;
  created_at: string;
  updated_at: string;
}

interface TokenHistory {
  id: number;
  token_id: number;
  price: number;
  timestamp: string;
}

interface PortfolioAsset {
  id: number;
  portfolio_id: number;
  token_id: number;
  quantity: number;
  average_purchase_price: number;
  token_name: string;
  token_symbol: string;
  current_price: number;
  current_value: number;
  profit_loss_percent: number;
}

interface Portfolio {
  id: number;
  character_id: number;
  cash_balance: number;
  created_at: string;
}

const MODAL_PAGE_TRADE = 'trade';

interface BlockchainExchangePanelProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const BlockchainExchangePanel: React.FC<BlockchainExchangePanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [tradingHistory, setTradingHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [activeTab, setActiveTab] = useState<'trading' | 'portfolio' | 'history' | 'leaderboard'>('trading');
  const [tokenHistory, setTokenHistory] = useState<TokenHistory[]>([]);
  const [loading, setLoading] = useState({ 
    tokens: true, 
    characters: true, 
    portfolio: false, 
    history: false 
  });
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [tradeForm, setTradeForm] = useState({
    action: 'buy',
    quantity: '',
    token_id: ''
  });

  const fetchTokens = async () => {
    try {
      const response = await fetch(`${API_URL}/blockchain/tokens`);
      const data = await response.json();
      setTokens(data);
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      showResultSnackbar('Не удалось загрузить токены', false);
    } finally {
      setLoading(prev => ({ ...prev, tokens: false }));
    }
  };

  const fetchCharacters = async () => {
    if (!fetchedUser) return;
    try {
      const response = await fetch(`${API_URL}/characters/by-vk/${fetchedUser.id}`);
      const data = await response.json();
      setCharacters(data);
      if (data.length > 0) {
        handleCharacterSelect(data[0].id, data);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      showResultSnackbar('Не удалось загрузить персонажей', false);
    } finally {
      setLoading(prev => ({ ...prev, characters: false }));
    }
  };

  const fetchPortfolio = async (characterId: number) => {
    if (!characterId) return;
    
    setLoading(prev => ({ ...prev, portfolio: true }));
    try {
      const response = await fetch(`${API_URL}/blockchain/portfolio/${characterId}`);
      const data = await response.json();
      setPortfolio(data.portfolio);
      setPortfolioAssets(data.assets);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
      showResultSnackbar('Не удалось загрузить портфолио', false);
    } finally {
      setLoading(prev => ({ ...prev, portfolio: false }));
    }
  };

  const handleCharacterSelect = (characterId: number, currentCharacters?: Character[]) => {
    const charList = currentCharacters || characters;
    const character = charList.find(c => c.id === characterId);
    if (character) {
      setSelectedCharacter(character);
      setLoading(prev => ({ ...prev, portfolio: true }));
      fetchPortfolio(character.id).finally(() => setLoading(prev => ({ ...prev, portfolio: false })));
      fetchTradingHistory(character.id);
    }
  };

  const fetchTradingHistory = async (characterId: number) => {
    if (!characterId) return;
    
    try {
      const response = await fetch(`${API_URL}/blockchain/transactions?character_id=${characterId}&limit=20`);
      const data = await response.json();
      setTradingHistory(data);
    } catch (error) {
      console.error('Failed to fetch trading history:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/blockchain/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const fetchTokenHistory = async (tokenId: number) => {
    setLoading(prev => ({ ...prev, history: true }));
    try {
      const response = await fetch(`${API_URL}/blockchain/tokens/${tokenId}/history?limit=30`);
      const data = await response.json();
      setTokenHistory(data.reverse()); // Обращаем для правильного отображения на графике
    } catch (error) {
      console.error('Failed to fetch token history:', error);
      showResultSnackbar('Не удалось загрузить историю токена', false);
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  };

  const showResultSnackbar = (message: string, isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={isSuccess ? '✅' : '❌'}
      >
        {message}
      </Snackbar>
    );
  };

  const handleTrade = async () => {
    if (!selectedCharacter || !tradeForm.token_id || !tradeForm.quantity) {
      showResultSnackbar('Заполните все поля', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/blockchain/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          token_id: parseInt(tradeForm.token_id),
          action: tradeForm.action,
          quantity: parseFloat(tradeForm.quantity)
        }),
      });

      if (response.ok) {
        showResultSnackbar('Торговая операция выполнена успешно', true);
        setActiveModal(null);
        setTradeForm({ action: 'buy', quantity: '', token_id: '' });
        fetchPortfolio(selectedCharacter.id);
        fetchTokens(); // Обновляем цены токенов
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при торговле', false);
      }
    } catch (error) {
      console.error('Failed to trade:', error);
      showResultSnackbar('Не удалось выполнить торговую операцию', false);
    }
  };

  const openTradeModal = (token: Token) => {
    setSelectedToken(token);
    setTradeForm(prev => ({ ...prev, token_id: token.id.toString() }));
    setActiveModal(MODAL_PAGE_TRADE);
  };

  const openTokenDetails = (token: Token) => {
    setSelectedToken(token);
    fetchTokenHistory(token.id);
  };

  useEffect(() => {
    fetchTokens();
    fetchLeaderboard();
    if (fetchedUser) {
      fetchCharacters();
    }
  }, [fetchedUser]);

  useEffect(() => {
    if (selectedCharacter) {
      fetchPortfolio(selectedCharacter.id);
    }
  }, [selectedCharacter]);

  const totalPortfolioValue = portfolioAssets.reduce((sum, asset) => sum + asset.current_value, 0) + (portfolio?.cash_balance || 0);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Блокчейн Биржа
      </PanelHeader>

      <Group>
        <Header>Выбор персонажа</Header>
        <Select
          value={selectedCharacter?.id || ''}
          onChange={(e) => {
            const characterId = parseInt(e.target.value);
            handleCharacterSelect(characterId);
          }}
          options={characters && characters.length > 0 ? characters.map(char => ({
            label: `${char.character_name} (${(char.currency || 0).toLocaleString('ru-RU')} ₭)`,
            value: char.id.toString()
          })) : []}
        />
      </Group>

      {selectedCharacter && (
        <>
          <Tabs>
            <TabsItem
              selected={activeTab === 'trading'}
              onClick={() => setActiveTab('trading')}
            >
              🪙 Торговля
            </TabsItem>
            <TabsItem
              selected={activeTab === 'portfolio'}
              onClick={() => setActiveTab('portfolio')}
            >
              📊 Портфолио
            </TabsItem>
            <TabsItem
              selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            >
              📈 История
            </TabsItem>
            <TabsItem
              selected={activeTab === 'leaderboard'}
              onClick={() => setActiveTab('leaderboard')}
            >
              🏆 Лидеры
            </TabsItem>
          </Tabs>

          {activeTab === 'portfolio' && (
            <Group>
              <Header>Портфолио</Header>
          {loading.portfolio ? (
            <Div>
              <Placeholder>Загрузка портфолио...</Placeholder>
            </Div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <Card mode="outline">
                  <div style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                      {(portfolio?.cash_balance || 0).toLocaleString('ru-RU')} ₭
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                      Денежный баланс
                    </div>
                  </div>
                </Card>
                <Card mode="outline">
                  <div style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                      {totalPortfolioValue.toLocaleString('ru-RU')} ₭
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                      Общая стоимость
                    </div>
                  </div>
                </Card>
              </div>

              {portfolioAssets.length > 0 ? (
                <CardGrid size="l">
                  {portfolioAssets.map((asset) => (
                    <Card key={asset.id} mode="outline">
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong>{asset.token_name} ({asset.token_symbol})</strong>
                          <div style={{ 
                            fontSize: '12px', 
                            color: asset.profit_loss_percent >= 0 ? '#4CAF50' : '#F44336' 
                          }}>
                            {asset.profit_loss_percent >= 0 ? '+' : ''}{asset.profit_loss_percent.toFixed(2)}%
                          </div>
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Количество: {asset.quantity.toFixed(6)} {asset.token_symbol}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Средняя цена: {asset.average_purchase_price.toFixed(6)} ₭
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Текущая цена: {asset.current_price.toFixed(6)} ₭
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                          Стоимость: {asset.current_value.toFixed(2)} ₭
                        </div>
                      </div>
                    </Card>
                  ))}
                </CardGrid>
              ) : (
                <Placeholder>Нет активов в портфолио</Placeholder>
              )}
            </div>
          )}
        </Group>
          )}

          {activeTab === 'trading' && (
            <Group>
              <Header>Доступные токены</Header>
        {loading.tokens ? (
          <Div>
            <Placeholder>Загрузка токенов...</Placeholder>
          </Div>
        ) : (
          <CardGrid size="l">
            {tokens && tokens.length > 0 ? tokens.map((token) => (
              <Card key={token.id} mode="outline">
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>{token.name} ({token.symbol})</strong>
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                      {token.exchange}
                    </div>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    Цена: {(token.current_price || 0).toFixed(6)} ₭
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    Капитализация: {(token.market_cap || 0).toLocaleString('ru-RU')} ₭
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    Объем: {(token.volume || 0).toLocaleString('ru-RU')}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    В обращении: {(token.circulating_supply || 0).toLocaleString('ru-RU')} / {(token.total_supply || 0).toLocaleString('ru-RU')}
                  </div>
                  <ButtonGroup mode="horizontal" gap="m" stretched>
                    <Button 
                      size="s" 
                      onClick={() => openTokenDetails(token)}
                      mode="secondary"
                    >
                      📊 График
                    </Button>
                    <Button 
                      size="s" 
                      onClick={() => openTradeModal(token)}
                      mode="primary"
                    >
                      💱 Торговать
                    </Button>
                  </ButtonGroup>
                </div>
              </Card>
            )) : (
              <Placeholder>Нет доступных токенов</Placeholder>
            )}
          </CardGrid>
        )}
            </Group>
          )}

          {activeTab === 'history' && (
            <Group>
              <Header>История торговли</Header>
              {tradingHistory && tradingHistory.length > 0 ? (
                <CardGrid size="l">
                  {tradingHistory.map((transaction, index) => (
                    <Card key={index} mode="outline">
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong>{transaction.transaction_type}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                            {new Date(transaction.timestamp).toLocaleString('ru-RU')}
                          </div>
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Сумма: {transaction.amount.toLocaleString('ru-RU')} ₭
                        </div>
                        {transaction.token_name && (
                          <div style={{ marginBottom: '4px' }}>
                            Токен: {transaction.token_name} ({transaction.token_symbol})
                          </div>
                        )}
                        <div style={{ marginBottom: '4px' }}>
                          Хеш: {transaction.transaction_hash.substring(0, 16)}...
                        </div>
                      </div>
                    </Card>
                  ))}
                </CardGrid>
              ) : (
                <Placeholder>Нет истории торговли</Placeholder>
              )}
            </Group>
          )}

          {activeTab === 'leaderboard' && (
            <Group>
              <Header>Таблица лидеров</Header>
              {leaderboard && leaderboard.length > 0 ? (
                <CardGrid size="l">
                  {leaderboard.map((entry, index) => (
                    <Card key={entry.id} mode="outline">
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                              width: '24px', 
                              height: '24px', 
                              borderRadius: '50%', 
                              backgroundColor: index < 3 ? 'var(--vkui--color_icon_accent)' : 'var(--vkui--color_icon_secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {index + 1}
                            </div>
                            <strong>{entry.character_name}</strong>
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                            {entry.total_value.toLocaleString('ru-RU')} ₭
                          </div>
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          Наличные: {entry.portfolio_cash.toLocaleString('ru-RU')} ₭
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          В валюте: {entry.currency.toLocaleString('ru-RU')} ₭
                        </div>
                        {entry.assets && entry.assets.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)', marginBottom: '4px' }}>
                              Токены:
                            </div>
                            {entry.assets.slice(0, 3).map((asset: any, assetIndex: number) => (
                              <div key={assetIndex} style={{ fontSize: '11px', marginBottom: '2px' }}>
                                {asset.token_symbol}: {asset.quantity.toFixed(2)} ({asset.current_value.toFixed(2)} ₭)
                              </div>
                            ))}
                            {entry.assets.length > 3 && (
                              <div style={{ fontSize: '11px', color: 'var(--vkui--color_text_tertiary)' }}>
                                и еще {entry.assets.length - 3}...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </CardGrid>
              ) : (
                <Placeholder>Нет данных о лидерах</Placeholder>
              )}
            </Group>
          )}
        </>
      )}

      {selectedToken && (
        <Group>
          <Header>График цены - {selectedToken.name}</Header>
          {loading.history ? (
            <Div>
              <Placeholder>Загрузка графика...</Placeholder>
            </Div>
          ) : tokenHistory.length > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tokenHistory}>
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString('ru-RU', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  />
                  <YAxis tickFormatter={(value) => value.toFixed(4)} />
                  <RechartsTooltip 
                    formatter={(value: number) => [value.toFixed(6) + ' ₭', 'Цена']}
                    labelFormatter={(value) => new Date(value).toLocaleString('ru-RU')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#0077FF" 
                    fill="#0077FF" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Placeholder>Нет данных для графика</Placeholder>
          )}
        </Group>
      )}

      <ModalPage
        id={MODAL_PAGE_TRADE}
        onClose={() => setActiveModal(null)}
        settlingHeight={100}
        header={
          <ModalPageHeader>
            Торговля токенами
          </ModalPageHeader>
        }
      >
        <FormLayoutGroup>
          <FormItem top="Токен">
            <Select
              value={tradeForm.token_id}
              onChange={(e) => setTradeForm(prev => ({ ...prev, token_id: e.target.value }))}
              options={tokens.map(token => ({
                label: `${token.name} (${token.symbol}) - ${token.current_price.toFixed(6)} ₭`,
                value: token.id.toString()
              }))}
            />
          </FormItem>

          <FormItem top="Действие">
            <Select
              value={tradeForm.action}
              onChange={(e) => setTradeForm(prev => ({ ...prev, action: e.target.value }))}
              options={[
                { label: 'Купить', value: 'buy' },
                { label: 'Продать', value: 'sell' }
              ]}
            />
          </FormItem>

          <FormItem top="Количество">
            <Input
              type="number"
              value={tradeForm.quantity}
              onChange={(e) => setTradeForm(prev => ({ ...prev, quantity: e.target.value }))}
              placeholder="0.000000"
              step="0.000001"
            />
          </FormItem>

          <ButtonGroup mode="horizontal" gap="m" stretched>
            <Button onClick={() => setActiveModal(null)}>Отмена</Button>
            <Button 
              onClick={handleTrade} 
              mode="primary"
              disabled={!tradeForm.token_id || !tradeForm.quantity}
            >
              {tradeForm.action === 'buy' ? 'Купить' : 'Продать'}
            </Button>
          </ButtonGroup>
        </FormLayoutGroup>
      </ModalPage>

      {snackbar}
    </Panel>
  );
};
