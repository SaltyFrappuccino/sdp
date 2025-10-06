import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  CardGrid,
  Card,
  Header,
  Spinner,
  Div,
  Button,
  PanelHeaderBack,
  ButtonGroup,
  Link,
  Snackbar,
  Alert,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormLayoutGroup,
  Input,
  Textarea,
  FormItem,
  Select,
  Search,
  Cell,
  Tabs,
  TabsItem,
  SimpleCell,
  Text,
  Subhead,
  Counter,
  Badge,
  RichCell,
  Avatar,
  Separator
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../api';
import { exportAnketaToJson, downloadJsonFile } from '../utils/anketaExport';
import { Icon24CheckCircleOutline, Icon24ErrorCircle, Icon24Add, Icon24Download, Icon24Settings, Icon24Users, Icon24MoneyCircle, Icon24Gift } from '@vkontakte/icons';

interface Character {
  id: number;
  character_name: string;
  vk_id: number;
  status: string;
  rank: string;
  faction: string;
  faction_position: string;
}

interface MarketItem {
  id: number;
  name: string;
  description: string;
  price: number;
  item_type: 'Обычный' | 'Синки';
  item_data: {
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
  };
  image_url: string;
  quantity: number;
}

interface Update {
 id: number;
 character_id: number;
 status: string;
 character_name: string;
}

const MODAL_PAGE_MARKET_ITEM = 'market_item';

export const AdminPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState({ characters: true, items: true, updates: true });
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<MarketItem> | null>(null);
  const [characterSearch, setCharacterSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'market' | 'crypto' | 'purchases' | 'collections' | 'updates' | 'bulk'>('overview');

  const handleBackup = async () => {
    try {
      showResultSnackbar('Начинаю скачивание...', true);
      const response = await fetch(`${API_URL}/admin/backup`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сети');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'backup.db';
      if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch.length === 2) {
              filename = filenameMatch[1];
          }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showResultSnackbar('Бэкап успешно скачан!', true);
    } catch (error) {
      console.error('Backup download failed:', error);
      const message = error instanceof Error ? error.message : 'Не удалось скачать бэкап';
      showResultSnackbar(message, false);
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/characters`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      showResultSnackbar('Не удалось загрузить анкеты', false);
    } finally {
      setLoading(prev => ({ ...prev, characters: false }));
    }
  };

  const fetchMarketItems = async () => {
    try {
      const response = await fetch(`${API_URL}/market/items`);
      const data = await response.json();
      setMarketItems(data);
    } catch (error) {
      console.error('Failed to fetch market items:', error);
      showResultSnackbar('Не удалось загрузить товары', false);
    } finally {
      setLoading(prev => ({ ...prev, items: false }));
    }
  };

  const fetchUpdates = async () => {
   try {
     const response = await fetch(`${API_URL}/updates`);
     const data = await response.json();
     setUpdates(data);
   } catch (error) {
     console.error('Failed to fetch updates:', error);
      showResultSnackbar('Не удалось загрузить изменения', false);
   } finally {
     setLoading(prev => ({ ...prev, updates: false }));
   }
  };

  useEffect(() => {
    fetchCharacters();
    fetchMarketItems();
    fetchUpdates();
  }, []);

  const showResultSnackbar = (text: string, isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={isSuccess ? <Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" /> : <Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >
        {text}
      </Snackbar>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('adminId');
    routeNavigator.push('/');
  };

  const handleSaveMarketItem = async () => {
    if (!editingItem) return;

    try {
      const response = await fetch(`${API_URL}/market/items`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': localStorage.getItem('adminId') || '',
        },
        body: JSON.stringify(editingItem),
      });

      if (response.ok) {
        showResultSnackbar('Товар успешно добавлен', true);
        setActiveModal(null);
        setEditingItem(null);
        fetchMarketItems();
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка при добавлении товара', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка сети', false);
    }
  };

  const filteredCharacters = characters.filter(char =>
    char.character_name.toLowerCase().includes(characterSearch.toLowerCase()) ||
    char.faction.toLowerCase().includes(characterSearch.toLowerCase())
  );

  const filteredMarketItems = marketItems.filter(item =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const renderOverviewTab = () => (
    <>
      <Group header={<Header>📊 Общая статистика</Header>}>
        <CardGrid size="l">
          <Card>
            <SimpleCell
              before={<Icon24Users />}
              after={<Counter mode="primary">{characters.length}</Counter>}
            >
              <Text weight="2">Всего персонажей</Text>
              <Subhead>Зарегистрированных в системе</Subhead>
            </SimpleCell>
          </Card>
          <Card>
            <SimpleCell
              after={<Counter mode="primary">{marketItems.length}</Counter>}
            >
              <Text weight="2">Товаров в маркете</Text>
              <Subhead>Доступно для покупки</Subhead>
            </SimpleCell>
          </Card>
          <Card>
            <SimpleCell
              after={<Counter mode="primary">{updates.length}</Counter>}
            >
              <Text weight="2">Ожидающих изменений</Text>
              <Subhead>В очереди на обработку</Subhead>
            </SimpleCell>
          </Card>
        </CardGrid>
      </Group>

      <Group header={<Header>🔧 Системные операции</Header>}>
        <Div>
          <ButtonGroup stretched mode="vertical" gap="m">
            <Button 
              size="l" 
              mode="primary" 
              onClick={handleBackup}
              before={<Icon24Download />}
            >
              💾 Скачать бэкап базы данных
            </Button>
            <Button 
              size="l" 
              mode="secondary" 
              onClick={async () => {
                try {
                  const response = await fetch(`${API_URL}/admin/collections/fix-rarity`, { method: 'POST' });
                  const data = await response.json();
                  showResultSnackbar(data.message || 'Редкости обновлены', true);
    } catch (error) {
                  showResultSnackbar('Ошибка обновления редкостей', false);
                }
              }}
              before={<Icon24Settings />}
            >
              🔧 Исправить редкость предметов
            </Button>
          </ButtonGroup>
        </Div>
      </Group>

      <Group header={<Header>📚 Документация API</Header>}>
        <Div>
          <Text style={{ marginBottom: 16, color: 'var(--vkui--color_text_secondary)' }}>
            Полная документация всех API endpoints доступна через Swagger UI
          </Text>
          <Button 
            size="l" 
            mode="outline" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
            stretched
          >
            📖 Открыть Swagger UI
          </Button>
        </Div>
      </Group>
    </>
  );

  const renderCharactersTab = () => (
    <>
      <Group header={<Header>👥 Управление персонажами</Header>}>
        <Search
          value={characterSearch}
          onChange={(e) => setCharacterSearch(e.target.value)}
          placeholder="Поиск по имени или фракции"
        />
        <Div>
          {loading.characters ? (
            <Spinner size="m" style={{ margin: '20px 0' }} />
          ) : (
            filteredCharacters.map((character) => (
              <div key={character.id} style={{ marginBottom: '16px' }}>
                <RichCell
                  before={<Avatar size={40} />}
                  after={
                    <Badge mode="new">
                      {character.status}
                    </Badge>
                  }
                  multiline
                  subtitle={`Ранг: ${character.rank} • Фракция: ${character.faction}`}
                >
                  {character.character_name}
                </RichCell>
                <Div>
                  <ButtonGroup stretched mode="horizontal" gap="m">
                    <Button
                      size="m"
                      mode="secondary"
                      onClick={() => routeNavigator.push(`/admin_anketa_edit/${character.id}`)}
                      stretched
                    >
                      Редактировать
                    </Button>
                    <Button
                      size="m"
                      mode="secondary"
                      onClick={() => {
                        const anketaData = { ...character };
                        const dataStr = JSON.stringify(anketaData, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${character.character_name}_${character.id}.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      before={<Icon24Download />}
                      stretched
                    >
                      Экспорт
                    </Button>
                  </ButtonGroup>
                </Div>
              </div>
            ))
          )}
        </Div>
      </Group>
    </>
  );

  const renderMarketTab = () => (
    <>
      <Group header={<Header>🛒 Управление маркетом</Header>}>
        <Search
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
          placeholder="Поиск товаров"
        />
        <Div>
          <Button
            size="l"
            mode="primary"
            onClick={() => {
              setEditingItem({
                name: '',
                description: '',
                price: 0,
                item_type: 'Обычный',
                item_data: {},
                image_url: '',
                quantity: 1
              });
    setActiveModal(MODAL_PAGE_MARKET_ITEM);
            }}
            before={<Icon24Add />}
          >
            Добавить товар
          </Button>
        </Div>
        <Div>
          {loading.items ? (
            <Spinner size="m" style={{ margin: '20px 0' }} />
          ) : (
            filteredMarketItems.map((item) => (
              <RichCell
                key={item.id}
                multiline
                after={`${item.price} ₭`}
                subtitle={`Тип: ${item.item_type} • Количество: ${item.quantity}`}
              >
                {item.name}
              </RichCell>
            ))
          )}
        </Div>
      </Group>
    </>
  );

  const renderCryptoTab = () => (
    <Group header={<Header>💰 Управление криптовалютами</Header>}>
      <Div>
        <Text style={{ marginBottom: 16, color: 'var(--vkui--color_text_secondary)' }}>
          Управление криптовалютами доступно через API. Используйте Swagger UI для полного функционала.
        </Text>
        <ButtonGroup stretched mode="vertical" gap="m">
          <Button 
            size="l" 
            mode="secondary" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
            before={<Icon24MoneyCircle />}
          >
            📈 Управление криптовалютами
          </Button>
          <Button 
            size="l" 
            mode="secondary" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
          >
            📊 События и волатильность
          </Button>
        </ButtonGroup>
      </Div>
    </Group>
  );

  const renderPurchasesTab = () => (
    <Group header={<Header>🛍️ Управление покупками</Header>}>
      <Div>
        <Text style={{ marginBottom: 16, color: 'var(--vkui--color_text_secondary)' }}>
          Управление категориями и предметами для покупки доступно через API.
        </Text>
        <ButtonGroup stretched mode="vertical" gap="m">
          <Button 
            size="l" 
            mode="secondary" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
          >
            🏷️ Категории покупок
          </Button>
          <Button 
            size="l" 
            mode="secondary" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
            before={<Icon24Gift />}
          >
            🎁 Предметы для покупки
          </Button>
        </ButtonGroup>
      </Div>
    </Group>
  );

  const renderCollectionsTab = () => (
    <Group header={<Header>🎴 Управление коллекциями</Header>}>
      <Div>
        <Text style={{ marginBottom: 16, color: 'var(--vkui--color_text_secondary)' }}>
          Управление сериями, предметами и паками коллекций доступно через API.
        </Text>
        <ButtonGroup stretched mode="vertical" gap="m">
          <Button 
            size="l" 
            mode="secondary" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
            before={<Icon24Gift />}
          >
            📚 Серии коллекций
          </Button>
          <Button 
            size="l" 
            mode="secondary" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
            before={<Icon24Add />}
          >
            🎁 Предметы коллекций
          </Button>
          <Button 
            size="l" 
            mode="secondary" 
            onClick={() => window.open(`${API_URL.replace('/api', '')}/api-docs`, '_blank')}
            before={<Icon24Gift />}
          >
            📦 Паки коллекций
          </Button>
        </ButtonGroup>
      </Div>
    </Group>
  );

  const renderUpdatesTab = () => (
    <Group header={<Header>📝 Ожидающие изменения</Header>}>
      <Div>
        {loading.updates ? (
          <Spinner size="m" style={{ margin: '20px 0' }} />
        ) : (
          updates.map((update) => (
            <RichCell
              key={update.id}
              after={
                <Badge mode="new">
                  {update.status}
                </Badge>
              }
            >
              {update.character_name}
            </RichCell>
          ))
        )}
      </Div>
    </Group>
  );

  const renderBulkTab = () => (
    <Group header={<Header>⚡ Массовые операции</Header>}>
      <Div>
        <ButtonGroup stretched mode="vertical" gap="m">
          <Button size="l" mode="secondary" onClick={() => routeNavigator.replace('/bulk_characters')}>
            👑 Массовое управление персонажами
          </Button>
          <Button size="l" mode="secondary" onClick={() => routeNavigator.replace('/admin_market')}>
            📈 Управление Биржей
          </Button>
          <Button size="l" mode="secondary" onClick={() => routeNavigator.replace('/admin_events')}>
            🎪 Управление Ивентами
          </Button>
          <Button size="l" mode="secondary" onClick={() => routeNavigator.replace('/admin_activity_requests')}>
            📋 Управление заявками на активности
          </Button>
          <Button size="l" mode="secondary" onClick={() => routeNavigator.replace('/admin_factions')}>
            🔰 Управление фракциями
          </Button>
        </ButtonGroup>
      </Div>
    </Group>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'characters':
        return renderCharactersTab();
      case 'market':
        return renderMarketTab();
      case 'crypto':
        return renderCryptoTab();
      case 'purchases':
        return renderPurchasesTab();
      case 'collections':
        return renderCollectionsTab();
      case 'updates':
        return renderUpdatesTab();
      case 'bulk':
        return renderBulkTab();
      default:
        return renderOverviewTab();
    }
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id={MODAL_PAGE_MARKET_ITEM}
        onClose={() => {
          setActiveModal(null);
          setEditingItem(null);
        }}
        header={<ModalPageHeader>Добавить товар</ModalPageHeader>}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={editingItem?.name || ''}
              onChange={(e) => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={editingItem?.description || ''}
              onChange={(e) => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
            />
          </FormItem>
          <FormItem top="Цена">
            <Input
              type="number"
              value={editingItem?.price || 0}
              onChange={(e) => setEditingItem(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
            />
          </FormItem>
          <FormItem top="Тип предмета">
            <Select
              value={editingItem?.item_type || 'Обычный'}
              onChange={(e) => setEditingItem(prev => ({ ...prev, item_type: e.target.value as any }))}
              options={[
                { label: 'Обычный', value: 'Обычный' },
                { label: 'Синки', value: 'Синки' }
              ]}
            />
          </FormItem>
          {editingItem?.item_type === 'Синки' && (
            <>
              <FormItem top="Тип синки">
                <Select
                  value={editingItem?.item_data?.sinki_type || 'Осколок'}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, item_data: { ...prev?.item_data, sinki_type: e.target.value as any } }))}
                  options={[
                    { label: 'Осколок', value: 'Осколок' },
                    { label: 'Фокус', value: 'Фокус' },
                    { label: 'Эхо', value: 'Эхо' }
                  ]}
                />
              </FormItem>
              <FormItem top="Ранг">
                <Select
                  value={editingItem?.item_data?.rank || 'F'}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, item_data: { ...prev?.item_data, rank: e.target.value as any } }))}
                  options={[
                    { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
                    { label: 'C', value: 'C' }, { label: 'B', value: 'B' }, { label: 'A', value: 'A' },
                    { label: 'S', value: 'S' }, { label: 'SS', value: 'SS' }, { label: 'SSS', value: 'SSS' },
                  ]}
                />
              </FormItem>
            </>
          )}
          <FormItem>
            <Button size="l" stretched onClick={handleSaveMarketItem}>Сохранить</Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}
        after={<Button onClick={handleLogout}>Выйти</Button>}
      >
        Админ-панель
      </PanelHeader>
      
      <Tabs>
        <TabsItem 
          selected={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')}
        >
          📊 Обзор
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'characters'} 
          onClick={() => setActiveTab('characters')}
        >
          👥 Персонажи
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'market'} 
          onClick={() => setActiveTab('market')}
        >
          🛒 Маркет
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'crypto'} 
          onClick={() => setActiveTab('crypto')}
        >
          💰 Криптовалюты
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'purchases'} 
          onClick={() => setActiveTab('purchases')}
        >
          🛍️ Покупки
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'collections'} 
          onClick={() => setActiveTab('collections')}
        >
          🎴 Коллекции
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'updates'} 
          onClick={() => setActiveTab('updates')}
        >
          📝 Изменения
        </TabsItem>
        <TabsItem 
          selected={activeTab === 'bulk'} 
          onClick={() => setActiveTab('bulk')}
        >
          ⚡ Массовые
        </TabsItem>
      </Tabs>

      {renderContent()}
      {modal}
      {snackbar}
    </Panel>
  );
};