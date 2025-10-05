import React, { useState, useEffect, ReactNode } from 'react';
import {
  Panel,
  PanelHeader,
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
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface BlockchainTransaction {
  id: number;
  transaction_hash: string;
  sender_character_id: number;
  receiver_character_id: number;
  amount: number;
  transaction_type: string;
  description: string;
  block_number: number;
  created_at: string;
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

const MODAL_PAGE_TRANSFER = 'transfer';
const MODAL_PAGE_CREATE_TOKEN = 'create_token';

export const AdminBlockchainPanel: React.FC<{ id: string }> = ({ id }) => {
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState({ transactions: true, tokens: true, characters: true });
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tokens' | 'transactions'>('tokens');
  const [transferForm, setTransferForm] = useState({
    from_character_id: 0,
    to_character_id: 0,
    amount: 0,
    description: ''
  });
  const [tokenForm, setTokenForm] = useState({
    name: '',
    symbol: '',
    description: '',
    initialPrice: '',
    totalSupply: '',
    circulatingSupply: ''
  });

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/blockchain/transactions?limit=50`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      showResultSnackbar('Не удалось загрузить транзакции', false);
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  const fetchTokens = async () => {
    try {
      console.log('AdminBlockchainPanel: Запрашиваем токены с URL:', `${API_URL}/blockchain/tokens`);
      const response = await fetch(`${API_URL}/blockchain/tokens`);
      console.log('AdminBlockchainPanel: Ответ от API:', response.status, response.statusText);
      const data = await response.json();
      console.log('AdminBlockchainPanel: Данные токенов:', data);
      setTokens(data);
    } catch (error) {
      console.error('AdminBlockchainPanel: Ошибка загрузки токенов:', error);
      showResultSnackbar('Не удалось загрузить токены', false);
    } finally {
      setLoading(prev => ({ ...prev, tokens: false }));
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/characters`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      showResultSnackbar('Не удалось загрузить персонажей', false);
    } finally {
      setLoading(prev => ({ ...prev, characters: false }));
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

  const handleTransfer = async () => {
    if (!transferForm.from_character_id || !transferForm.to_character_id || !transferForm.amount) {
      showResultSnackbar('Заполните все поля', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/blockchain/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_character_id: transferForm.from_character_id,
          receiver_character_id: transferForm.to_character_id,
          amount: transferForm.amount,
          description: transferForm.description || 'Перевод средств'
        }),
      });

      if (response.ok) {
        showResultSnackbar('Перевод выполнен успешно', true);
        setActiveModal(null);
        setTransferForm({ from_character_id: 0, to_character_id: 0, amount: 0, description: '' });
        fetchTransactions();
        fetchCharacters(); // Обновляем балансы
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при переводе', false);
      }
    } catch (error) {
      console.error('Failed to transfer:', error);
      showResultSnackbar('Не удалось выполнить перевод', false);
    }
  };

  const formatTransactionType = (type: string) => {
    const types: { [key: string]: string } = {
      'transfer': 'Перевод',
      'purchase': 'Покупка',
      'reward': 'Награда',
      'penalty': 'Штраф'
    };
    return types[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const handleCreateToken = async () => {
    if (!tokenForm.name || !tokenForm.symbol || !tokenForm.initialPrice || !tokenForm.totalSupply || !tokenForm.circulatingSupply) {
      showResultSnackbar('Заполните все поля', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/blockchain/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tokenForm.name,
          symbol: tokenForm.symbol,
          description: tokenForm.description,
          initialPrice: parseFloat(tokenForm.initialPrice),
          totalSupply: parseFloat(tokenForm.totalSupply),
          circulatingSupply: parseFloat(tokenForm.circulatingSupply)
        }),
      });

      if (response.ok) {
        showResultSnackbar('Токен создан успешно', true);
        setActiveModal(null);
        setTokenForm({ name: '', symbol: '', description: '', initialPrice: '', totalSupply: '', circulatingSupply: '' });
        fetchTokens();
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при создании токена', false);
      }
    } catch (error) {
      console.error('Failed to create token:', error);
      showResultSnackbar('Не удалось создать токен', false);
    }
  };

  const handleInitTokens = async () => {
    try {
      const response = await fetch(`${API_URL}/blockchain/init-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        showResultSnackbar(`${result.message} (${result.count} токенов)`, true);
        fetchTokens();
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка инициализации токенов', false);
      }
    } catch (error) {
      console.error('Failed to init tokens:', error);
      showResultSnackbar('Не удалось инициализировать токены', false);
    }
  };

  useEffect(() => {
    console.log('AdminBlockchainPanel: useEffect запущен');
    fetchTransactions();
    fetchTokens();
    fetchCharacters();
  }, []);

  useEffect(() => {
    console.log('AdminBlockchainPanel: activeTab изменился:', activeTab);
  }, [activeTab]);

  useEffect(() => {
    console.log('AdminBlockchainPanel: loading состояние:', loading);
  }, [loading]);

  console.log('AdminBlockchainPanel: Рендер компонента');
  console.log('AdminBlockchainPanel: activeTab =', activeTab);
  console.log('AdminBlockchainPanel: loading =', loading);
  console.log('AdminBlockchainPanel: tokens.length =', tokens.length);
  console.log('AdminBlockchainPanel: transactions.length =', transactions.length);

  return (
    <Panel id={id}>
      <PanelHeader>Админ - Блокчейн.</PanelHeader>

      <Group>
        <Header>Статистика блокчейна</Header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {tokens.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Токенов
              </div>
            </div>
          </Card>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {transactions.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Транзакций
              </div>
            </div>
          </Card>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {tokens.reduce((sum, t) => sum + t.market_cap, 0).toLocaleString('ru-RU')} ₭
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Общая капитализация
              </div>
            </div>
          </Card>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {characters.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Активных аккаунтов
              </div>
            </div>
          </Card>
        </div>
      </Group>

      <Group>
        <Tabs>
          <TabsItem
            selected={activeTab === 'tokens'}
            onClick={() => setActiveTab('tokens')}
          >
            🪙 Токены
          </TabsItem>
          <TabsItem
            selected={activeTab === 'transactions'}
            onClick={() => setActiveTab('transactions')}
          >
            📋 Транзакции
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'tokens' && (
        <Group>
          <Header>
            Управление токенами
          </Header>
          
          <div style={{ padding: '16px', display: 'flex', gap: '8px' }}>
            <Button
              size="m"
              mode="secondary"
              onClick={handleInitTokens}
            >
              🚀 Инициализировать токены
            </Button>
            <Button
              size="m"
              mode="primary"
              onClick={() => setActiveModal(MODAL_PAGE_CREATE_TOKEN)}
            >
              ➕ Создать токен
            </Button>
          </div>

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
                      Цена: {token.current_price.toFixed(6)} ₭
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      Капитализация: {token.market_cap.toLocaleString('ru-RU')} ₭
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      Объем: {token.volume.toLocaleString('ru-RU')}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      В обращении: {token.circulating_supply.toLocaleString('ru-RU')} / {token.total_supply.toLocaleString('ru-RU')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                      Создан: {new Date(token.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </Card>
              )) : (
                <Placeholder>Нет токенов</Placeholder>
              )}
            </CardGrid>
          )}
        </Group>
      )}

      {activeTab === 'transactions' && (
        <Group>
        <Header
          after={
            <Button
              size="s"
              mode="primary"
              onClick={() => setActiveModal(MODAL_PAGE_TRANSFER)}
            >
              💸 Перевод
            </Button>
          }
        >
          Транзакции (Кнопка перевода должна быть видна)
        </Header>

        {loading.transactions ? (
          <Div>
            <Placeholder>Загрузка транзакций...</Placeholder>
          </Div>
        ) : (
          <CardGrid size="l">
            {transactions && transactions.length > 0 ? transactions.map((transaction) => (
              <Card key={transaction.id} mode="outline">
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>{formatTransactionType(transaction.transaction_type)}</strong>
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                      Блок: {transaction.block_number}
                    </div>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    От: {characters.find(c => c.id === transaction.sender_character_id)?.character_name || 'Система'}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    Кому: {characters.find(c => c.id === transaction.receiver_character_id)?.character_name || 'Система'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)', marginBottom: '8px' }}>
                    Сумма: {transaction.amount.toLocaleString('ru-RU')} ₭
                  </div>
                  {transaction.description && (
                    <div style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                      {transaction.description}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                    {formatDate(transaction.created_at)}
                  </div>
                </div>
              </Card>
            )) : (
              <Placeholder>Нет транзакций</Placeholder>
            )}
          </CardGrid>
        )}
        </Group>
      )}

      {snackbar}

      {/* Модальные окна */}
      {activeModal === MODAL_PAGE_TRANSFER && (
        <ModalPage
          id={MODAL_PAGE_TRANSFER}
          onClose={() => setActiveModal(null)}
          settlingHeight={100}
          header={
            <ModalPageHeader>
              Перевод средств
            </ModalPageHeader>
          }
        >
          <FormLayoutGroup>
            <FormItem top="От кого">
              <Select
                value={transferForm.from_character_id}
                onChange={(e) => setTransferForm({ ...transferForm, from_character_id: parseInt(e.target.value) })}
                options={characters.map(c => ({ label: c.character_name, value: c.id }))}
              />
            </FormItem>
            <FormItem top="Кому">
              <Select
                value={transferForm.to_character_id}
                onChange={(e) => setTransferForm({ ...transferForm, to_character_id: parseInt(e.target.value) })}
                options={characters.map(c => ({ label: c.character_name, value: c.id }))}
              />
            </FormItem>
            <FormItem top="Сумма">
              <Input
                type="number"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) })}
                placeholder="Введите сумму"
              />
            </FormItem>
            <FormItem top="Описание">
              <Input
                value={transferForm.description || ''}
                onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                placeholder="Описание перевода"
              />
            </FormItem>
            <FormItem>
              <ButtonGroup stretched>
                <Button stretched onClick={handleTransfer}>
                  Выполнить перевод
                </Button>
              </ButtonGroup>
            </FormItem>
          </FormLayoutGroup>
        </ModalPage>
      )}

      {activeModal === MODAL_PAGE_CREATE_TOKEN && (
        <ModalPage
          id={MODAL_PAGE_CREATE_TOKEN}
          onClose={() => setActiveModal(null)}
          settlingHeight={100}
          header={
            <ModalPageHeader>
              Создать токен
            </ModalPageHeader>
          }
        >
          <FormLayoutGroup>
            <FormItem top="Название токена">
              <Input
                value={tokenForm.name}
                onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                placeholder="Введите название"
              />
            </FormItem>
            <FormItem top="Символ токена">
              <Input
                value={tokenForm.symbol}
                onChange={(e) => setTokenForm({ ...tokenForm, symbol: e.target.value })}
                placeholder="Введите символ"
              />
            </FormItem>
            <FormItem top="Описание">
              <Textarea
                value={tokenForm.description}
                onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
                placeholder="Описание токена"
              />
            </FormItem>
            <FormItem top="Начальная цена">
              <Input
                type="number"
                value={tokenForm.initialPrice}
                onChange={(e) => setTokenForm({ ...tokenForm, initialPrice: e.target.value })}
                placeholder="Введите цену"
              />
            </FormItem>
            <FormItem top="Общее количество">
              <Input
                type="number"
                value={tokenForm.totalSupply}
                onChange={(e) => setTokenForm({ ...tokenForm, totalSupply: e.target.value })}
                placeholder="Введите общее количество"
              />
            </FormItem>
            <FormItem top="В обращении">
              <Input
                type="number"
                value={tokenForm.circulatingSupply}
                onChange={(e) => setTokenForm({ ...tokenForm, circulatingSupply: e.target.value })}
                placeholder="Введите количество в обращении"
              />
            </FormItem>
            <FormItem>
              <ButtonGroup stretched>
                <Button stretched onClick={handleCreateToken}>
                  Создать токен
                </Button>
              </ButtonGroup>
            </FormItem>
          </FormLayoutGroup>
        </ModalPage>
      )}
    </Panel>
  );
};
