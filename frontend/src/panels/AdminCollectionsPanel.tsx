import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  CardGrid,
  Card,
  Header,
  Div,
  Button,
  PanelHeaderBack,
  ButtonGroup,
  Link,
  Snackbar,
  Placeholder,
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
  TabsItem
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../api';
import { Icon24CheckCircleOutline, Icon24ErrorCircle, Icon24Add, Icon24Delete } from '@vkontakte/icons';

interface Collection {
  id: number;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image_url: string;
  created_at: string;
}

const MODAL_PAGE_COLLECTION = 'collection';

const RARITY_COLORS = {
  common: '#8E8E93',
  uncommon: '#34C759',
  rare: '#007AFF',
  epic: '#AF52DE',
  legendary: '#FF9500'
};

const RARITY_NAMES = {
  common: 'Обычная',
  uncommon: 'Необычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная'
};

export const AdminCollectionsPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<Partial<Collection> | null>(null);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchCollections = async () => {
    try {
      const response = await fetch(`${API_URL}/collections`);
      const data = await response.json();
      setCollections(data);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      showResultSnackbar('Не удалось загрузить коллекции', false);
    } finally {
      setLoading(false);
    }
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

  const openCollectionModal = (collection: Partial<Collection> | null) => {
    setEditingCollection(collection);
    setActiveModal(MODAL_PAGE_COLLECTION);
  };

  const handleSaveCollection = async () => {
    if (!editingCollection?.name || !editingCollection?.category) {
      showResultSnackbar('Название и категория обязательны', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCollection)
      });

      if (response.ok) {
        showResultSnackbar('Коллекция создана', true);
        setActiveModal(null);
        setEditingCollection(null);
        fetchCollections();
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при создании', false);
      }
    } catch (error) {
      console.error('Failed to save collection:', error);
      showResultSnackbar('Не удалось создать коллекцию', false);
    }
  };

  const handleDeleteCollection = async (collectionId: number) => {
    setPopout(
      <Alert
        actions={[
          {
            title: 'Отмена',
            autoClose: true,
            mode: 'cancel'
          },
          {
            title: 'Удалить',
            autoClose: true,
            mode: 'destructive',
            action: async () => {
              try {
                const response = await fetch(`${API_URL}/collections/${collectionId}`, {
                  method: 'DELETE'
                });

                if (response.ok) {
                  showResultSnackbar('Коллекция удалена', true);
                  fetchCollections();
                } else {
                  const error = await response.json();
                  showResultSnackbar(error.error || 'Ошибка при удалении', false);
                }
              } catch (error) {
                console.error('Failed to delete collection:', error);
                showResultSnackbar('Не удалось удалить коллекцию', false);
              }
            }
          }
        ]}
        onClose={() => setPopout(null)}
        header="Удаление коллекции"
        text="Вы уверены, что хотите удалить эту коллекцию?"
      />
    );
  };

  const filteredCollections = (collections || []).filter(collection => {
    const matchesSearch = collection.name.toLowerCase().includes(collectionSearch.toLowerCase()) ||
      (collection.description && collection.description.toLowerCase().includes(collectionSearch.toLowerCase()));
    const matchesCategory = !categoryFilter || collection.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set((collections || []).map(c => c.category)));

  useEffect(() => {
    fetchCollections();
  }, []);

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage id={MODAL_PAGE_COLLECTION} onClose={() => setActiveModal(null)}>
        <ModalPageHeader>
          Создать коллекцию
        </ModalPageHeader>
        <FormLayoutGroup>
          <FormItem top="Название коллекции" status={!editingCollection?.name ? 'error' : 'default'}>
            <Input
              value={editingCollection?.name || ''}
              onChange={(e) => setEditingCollection(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название коллекции"
            />
          </FormItem>
          
          <FormItem top="Описание">
            <Textarea
              value={editingCollection?.description || ''}
              onChange={(e) => setEditingCollection(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание коллекции"
            />
          </FormItem>

          <FormItem top="Категория" status={!editingCollection?.category ? 'error' : 'default'}>
            <Input
              value={editingCollection?.category || ''}
              onChange={(e) => setEditingCollection(prev => ({ ...prev, category: e.target.value }))}
              placeholder="Например: Карты Существ, Артефакты, Трофеи"
            />
          </FormItem>

          <FormItem top="Редкость">
            <Select
              value={editingCollection?.rarity || 'common'}
              onChange={(e) => setEditingCollection(prev => ({ ...prev, rarity: e.target.value as any }))}
              options={Object.entries(RARITY_NAMES || {}).map(([key, name]) => ({
                label: name,
                value: key
              }))}
            />
          </FormItem>

          <FormItem top="URL изображения">
            <Input
              value={editingCollection?.image_url || ''}
              onChange={(e) => setEditingCollection(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://example.com/image.png"
            />
          </FormItem>

          <ButtonGroup mode="horizontal" gap="m" stretched>
            <Button onClick={() => setActiveModal(null)}>Отмена</Button>
            <Button onClick={handleSaveCollection} mode="primary">
              Создать
            </Button>
          </ButtonGroup>
        </FormLayoutGroup>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Админ - Коллекции
      </PanelHeader>

      <Group>
        <Header>Статистика коллекций</Header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {collections.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Всего коллекций
              </div>
            </div>
          </Card>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {categories.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Категорий
              </div>
            </div>
          </Card>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {Object.values(RARITY_NAMES).length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Редкостей
              </div>
            </div>
          </Card>
        </div>
      </Group>

      <Group>
        <Header
          aside={
            <Button
              size="s"
              mode="primary"
              onClick={() => setActiveModal(MODAL_PAGE_CREATE)}
            >
              ➕ Создать коллекцию
            </Button>
          }
        >
          Управление коллекциями
        </Header>
        <Search
          value={collectionSearch}
          onChange={(e) => setCollectionSearch(e.target.value)}
          placeholder="Поиск коллекций..."
        />
      </Group>

      <Group>
        <FormItem top="Фильтр по категории">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Все категории"
            options={[
              { label: 'Все категории', value: '' },
              ...(categories && categories.length > 0 ? categories.map(category => ({
                label: category,
                value: category
              })) : [])
            ]}
          />
        </FormItem>
      </Group>

      <Group>
        <Header
          aside={
            <Button
              before={<Icon24Add />}
              onClick={() => openCollectionModal({})}
              mode="primary"
            >
              Создать коллекцию
            </Button>
          }
        >
          Коллекции
        </Header>

        {loading ? (
          <Div>
            <Placeholder>Загрузка...</Placeholder>
          </Div>
        ) : (
          <CardGrid size="l">
            {filteredCollections && filteredCollections.length > 0 ? filteredCollections.map((collection) => (
              <Card key={collection.id} mode="outline">
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: RARITY_COLORS[collection.rarity],
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}
                    />
                    <strong>{collection.name}</strong>
                  </div>
                  
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: RARITY_COLORS[collection.rarity] }}>
                    {RARITY_NAMES[collection.rarity] || 'Неизвестно'}
                  </div>
                  
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                    {collection.category}
                  </div>
                  
                  {collection.description && (
                    <div style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                      {collection.description}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                    Создана: {new Date(collection.created_at).toLocaleDateString('ru-RU')}
                  </div>
                  
                  <ButtonGroup mode="horizontal" gap="s" style={{ marginTop: '12px' }}>
                    <Button
                      size="s"
                      mode="destructive"
                      onClick={() => handleDeleteCollection(collection.id)}
                    >
                      <Icon24Delete />
                    </Button>
                  </ButtonGroup>
                </div>
              </Card>
            )) : (
              <Placeholder>Нет коллекций</Placeholder>
            )}
          </CardGrid>
        )}
      </Group>

      {modal}
      {popout}
      {snackbar}
    </Panel>
  );
};
