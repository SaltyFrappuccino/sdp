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
  Cell
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../api';
import { exportAnketaToJson, downloadJsonFile } from '../utils/anketaExport';
import { Icon24CheckCircleOutline, Icon24ErrorCircle, Icon24Add } from '@vkontakte/icons';

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
     showResultSnackbar('Не удалось загрузить обновления', false);
   } finally {
     setLoading(prev => ({ ...prev, updates: false }));
   }
  };

  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      routeNavigator.replace('admin_login');
      return;
    }
    fetchCharacters();
    fetchMarketItems();
    fetchUpdates();
  }, [routeNavigator]);

  const handleLogout = () => {
    localStorage.removeItem('adminId');
    routeNavigator.replace('/');
  };

  const showResultSnackbar = (message: string, isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={isSuccess ? <Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" /> : <Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >
        {message}
      </Snackbar>
    );
  };

  const handleExportAnketa = async (characterId: number) => {
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}`);
      const character = await response.json();
      
      const jsonString = exportAnketaToJson(character, { first_name: 'Admin' });
      const filename = `anketa_${character.character_name}_${new Date().toISOString().split('T')[0]}.json`;
      downloadJsonFile(jsonString, filename);
      
      showResultSnackbar('Анкета успешно экспортирована!', true);
    } catch (error) {
      showResultSnackbar('Ошибка при экспорте анкеты', false);
    }
  };
  
  const handleStatusChange = async (characterId: number, status: 'Принято' | 'Отклонено') => {
    const adminId = localStorage.getItem('adminId');
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId || '' },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        showResultSnackbar(`Статус анкеты #${characterId} обновлен на "${status}"`, true);
        fetchCharacters();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Не удалось обновить статус');
      }
    } catch (error) {
       const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
       showResultSnackbar(message, false);
    }
  };

  const handleDeleteCharacter = async (characterId: number) => {
     setPopout(
      <Alert
        actions={[{ title: 'Отмена', mode: 'cancel' }, { title: 'Удалить', mode: 'destructive', action: async () => {
          const adminId = localStorage.getItem('adminId');
           try {
              const response = await fetch(`${API_URL}/characters/${characterId}`, {
                method: 'DELETE',
                headers: { 'x-admin-id': adminId || '' }
              });
              if (response.ok) {
                showResultSnackbar(`Анкета #${characterId} удалена`, true);
                fetchCharacters();
              } else {
                const result = await response.json();
                throw new Error(result.error || 'Не удалось удалить анкету');
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
              showResultSnackbar(message, false);
            }
        }}]}
        actionsLayout="vertical"
        onClose={() => setPopout(null)}
      >
        <p>Подтверждение удаления</p>
        <p>{`Вы уверены, что хотите удалить анкету ID ${characterId}? Это действие необратимо.`}</p>
      </Alert>
    );
  };

  const openMarketItemModal = (item: Partial<MarketItem> | null) => {
    setEditingItem(item ? { ...item, item_data: item.item_data || {} } : { item_type: 'Обычный', item_data: {}, quantity: 1 });
    setActiveModal(MODAL_PAGE_MARKET_ITEM);
  };

  const handleSaveMarketItem = async () => {
    const adminId = localStorage.getItem('adminId');
    const url = editingItem?.id ? `${API_URL}/market/items/${editingItem.id}` : `${API_URL}/market/items`;
    const method = editingItem?.id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId || '' },
        body: JSON.stringify(editingItem),
      });
      if (response.ok) {
        showResultSnackbar('Товар сохранен', true);
        setActiveModal(null);
        fetchMarketItems();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Не удалось сохранить товар');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showResultSnackbar(message, false);
    }
  };

  const handleDeleteMarketItem = async (itemId: number) => {
    setPopout(
      <Alert
        actions={[{ title: 'Отмена', mode: 'cancel' }, { title: 'Удалить', mode: 'destructive', action: async () => {
          const adminId = localStorage.getItem('adminId');
          try {
            const response = await fetch(`${API_URL}/market/items/${itemId}`, {
              method: 'DELETE',
              headers: { 'x-admin-id': adminId || '' },
            });
            if (response.ok) {
              showResultSnackbar(`Товар #${itemId} удален`, true);
              fetchMarketItems();
            } else {
              const result = await response.json();
              throw new Error(result.error || 'Не удалось удалить товар');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
            showResultSnackbar(message, false);
          }
        }}]}
        actionsLayout="vertical"
        onClose={() => setPopout(null)}
      >
        <p>Подтверждение удаления</p>
        <p>{`Вы уверены, что хотите удалить товар ID ${itemId}?`}</p>
      </Alert>
    );
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id={MODAL_PAGE_MARKET_ITEM}
        header={<ModalPageHeader>{editingItem?.id ? 'Редактировать товар' : 'Добавить товар'}</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSaveMarketItem(); }}>
          <FormItem top="Название">
            <Input value={editingItem?.name || ''} onChange={(e) => setEditingItem(prev => ({ ...prev, name: e.target.value }))} />
          </FormItem>
          <FormItem top="Описание">
            <Textarea value={editingItem?.description || ''} onChange={(e) => setEditingItem(prev => ({ ...prev, description: e.target.value }))} />
          </FormItem>
          <FormItem top="Цена">
            <Input type="number" value={editingItem?.price || ''} onChange={(e) => setEditingItem(prev => ({ ...prev, price: Number(e.target.value) }))} />
          </FormItem>
          <FormItem top="URL изображения">
            <Input value={editingItem?.image_url || ''} onChange={(e) => setEditingItem(prev => ({ ...prev, image_url: e.target.value }))} />
          </FormItem>
          <FormItem top="Количество">
            <Input type="number" value={editingItem?.quantity || 0} onChange={(e) => setEditingItem(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
          </FormItem>
          <FormItem top="Тип предмета">
            <Select
              value={editingItem?.item_type}
              onChange={(e) => setEditingItem(prev => ({ ...prev, item_type: e.target.value as any }))}
              options={[
                { label: 'Обычный', value: 'Обычный' },
                { label: 'Синки', value: 'Синки' },
              ]}
            />
          </FormItem>
          {editingItem?.item_type === 'Синки' && (
            <>
              <FormItem top="Тип Синки">
                <Select
                  value={editingItem.item_data?.sinki_type}
                  onChange={(e) => setEditingItem(prev => ({ ...prev, item_data: { ...prev?.item_data, sinki_type: e.target.value as any } }))}
                  options={[
                    { label: 'Осколок', value: 'Осколок' },
                    { label: 'Фокус', value: 'Фокус' },
                    { label: 'Эхо', value: 'Эхо' },
                  ]}
                />
              </FormItem>
              <FormItem top="Ранг Синки">
                <Select
                  placeholder="Не выбрано"
                  value={editingItem.item_data?.rank}
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
      
      <Group>
        <Header>Реестр анкет</Header>
        <Search value={characterSearch} onChange={(e) => setCharacterSearch(e.target.value)} />
        {loading.characters ? <Spinner /> : (
          <CardGrid size="l">
            {characters.filter(c => c.character_name.toLowerCase().includes(characterSearch.toLowerCase())).map((char) => (
              <Card key={char.id}>
                <Header>{char.character_name}</Header>
                <Div>
                  <p><b>Статус:</b> {char.status}</p>
                  <p><b>Ранг:</b> {char.rank}</p>
                  <p><b>Фракция:</b> {char.faction}</p>
                  <p><b>Позиция:</b> {char.faction_position}</p>
                  <p><b>Автор:</b> <Link href={`https://vk.com/id${char.vk_id}`} target="_blank">{`ID: ${char.vk_id}`}</Link></p>
                </Div>
                 <ButtonGroup mode="horizontal" gap="m" stretched style={{ padding: '0 16px 16px' }}>
                   {char.status === 'на рассмотрении' && (
                     <>
                        <Button size="m" appearance="positive" onClick={() => handleStatusChange(char.id, 'Принято')}>
                          Принять
                        </Button>
                        <Button size="m" appearance="negative" onClick={() => handleStatusChange(char.id, 'Отклонено')}>
                          Отклонить
                        </Button>
                     </>
                   )}
                  <Button size="m" onClick={() => routeNavigator.push(`/anketa_detail/${char.id}`)}>
                    Открыть
                  </Button>
                  <Button size="m" appearance="neutral" onClick={() => routeNavigator.push(`/admin_anketa_edit/${char.id}`)}>
                    Редактировать
                  </Button>
                  <Button size="m" appearance="positive" onClick={() => handleExportAnketa(char.id)}>
                    📄 Экспорт
                  </Button>
                  <Button size="m" appearance="negative" onClick={() => handleDeleteCharacter(char.id)}>
                    Удалить
                  </Button>
                </ButtonGroup>
              </Card>
            ))}
          </CardGrid>
        )}
      </Group>

      <Group>
       <Header>Ожидающие проверки изменения</Header>
       {loading.updates ? <Spinner /> : (
         updates.filter(u => u.status === 'pending').map(update => (
           <Cell key={update.id} hasActive hasHover onClick={() => routeNavigator.push(`/update_viewer/${update.id}`)}>
             Запрос на обновление для {update.character_name} (ID: {update.character_id})
           </Cell>
         ))
       )}
      </Group>

      <Group>
        <Div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Header>Товары на рынке</Header>
          <Button before={<Icon24Add />} onClick={() => openMarketItemModal(null)}>Добавить товар</Button>
        </Div>
        <Search value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
        {loading.items ? <Spinner /> : (
          <CardGrid size="l">
            {marketItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase())).map((item) => (
              <Card key={item.id}>
                <Header>{item.name}</Header>
                <Div>
                  <p>{item.description}</p>
                  <p><b>Цена: {item.price}</b></p>
                  <p><b>В наличии: {item.quantity}</b></p>
                </Div>
                <ButtonGroup mode="horizontal" gap="m" stretched style={{ padding: '0 16px 16px' }}>
                  <Button size="m" onClick={() => openMarketItemModal(item)}>Редактировать</Button>
                  <Button size="m" appearance="negative" onClick={() => handleDeleteMarketItem(item.id)}>Удалить</Button>
                </ButtonGroup>
              </Card>
            ))}
          </CardGrid>
        )}
      </Group>
      
      {snackbar}
      {popout}
      {modal}
    </Panel>
  );
};