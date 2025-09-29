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

interface PurchaseCategory {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  created_at: string;
}

interface PurchaseItem {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image_url: string;
  properties: string;
  is_available: boolean;
  category_name: string;
  created_at: string;
}

const MODAL_PAGE_CATEGORY = 'category';
const MODAL_PAGE_ITEM = 'item';

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

export const AdminPurchasesPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [categories, setCategories] = useState<PurchaseCategory[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState({ categories: true, items: true });
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<PurchaseCategory> | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<PurchaseItem> | null>(null);
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('categories');

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/purchases/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      showResultSnackbar('Не удалось загрузить категории', false);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/purchases/items`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      showResultSnackbar('Не удалось загрузить предметы', false);
    } finally {
      setLoading(prev => ({ ...prev, items: false }));
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

  const openCategoryModal = (category: Partial<PurchaseCategory> | null) => {
    setEditingCategory(category);
    setActiveModal(MODAL_PAGE_CATEGORY);
  };

  const openItemModal = (item: Partial<PurchaseItem> | null) => {
    setEditingItem(item);
    setActiveModal(MODAL_PAGE_ITEM);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory?.name) {
      showResultSnackbar('Название категории обязательно', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/purchases/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory)
      });

      if (response.ok) {
        showResultSnackbar('Категория создана', true);
        setActiveModal(null);
        setEditingCategory(null);
        fetchCategories();
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при создании', false);
      }
    } catch (error) {
      console.error('Failed to save category:', error);
      showResultSnackbar('Не удалось создать категорию', false);
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem?.name || !editingItem?.category_id || !editingItem?.price) {
      showResultSnackbar('Название, категория и цена обязательны', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/purchases/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });

      if (response.ok) {
        showResultSnackbar('Предмет создан', true);
        setActiveModal(null);
        setEditingItem(null);
        fetchItems();
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при создании', false);
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      showResultSnackbar('Не удалось создать предмет', false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage id={MODAL_PAGE_CATEGORY} onClose={() => setActiveModal(null)}>
        <ModalPageHeader>
          Создать категорию
        </ModalPageHeader>
        <FormLayoutGroup>
          <FormItem top="Название категории" status={!editingCategory?.name ? 'error' : 'default'}>
            <Input
              value={editingCategory?.name || ''}
              onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Например: Недвижимость, Транспорт, Одежда"
            />
          </FormItem>
          
          <FormItem top="Описание">
            <Textarea
              value={editingCategory?.description || ''}
              onChange={(e) => setEditingCategory(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание категории"
            />
          </FormItem>

          <FormItem top="URL иконки">
            <Input
              value={editingCategory?.icon_url || ''}
              onChange={(e) => setEditingCategory(prev => ({ ...prev, icon_url: e.target.value }))}
              placeholder="https://example.com/icon.png"
            />
          </FormItem>

          <ButtonGroup mode="horizontal" gap="m" stretched>
            <Button onClick={() => setActiveModal(null)}>Отмена</Button>
            <Button onClick={handleSaveCategory} mode="primary">
              Создать
            </Button>
          </ButtonGroup>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage id={MODAL_PAGE_ITEM} onClose={() => setActiveModal(null)}>
        <ModalPageHeader>
          Создать предмет
        </ModalPageHeader>
        <FormLayoutGroup>
          <FormItem top="Название предмета" status={!editingItem?.name ? 'error' : 'default'}>
            <Input
              value={editingItem?.name || ''}
              onChange={(e) => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название предмета"
            />
          </FormItem>
          
          <FormItem top="Описание">
            <Textarea
              value={editingItem?.description || ''}
              onChange={(e) => setEditingItem(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание предмета"
            />
          </FormItem>

          <FormItem top="Категория" status={!editingItem?.category_id ? 'error' : 'default'}>
            <Select
              value={editingItem?.category_id || ''}
              onChange={(e) => setEditingItem(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
              placeholder="Выберите категорию"
              options={categories && categories.length > 0 ? categories.map(category => ({
                label: category.name,
                value: category.id.toString()
              })) : []}
            />
          </FormItem>

          <FormItem top="Цена" status={!editingItem?.price ? 'error' : 'default'}>
            <Input
              type="number"
              value={editingItem?.price || ''}
              onChange={(e) => setEditingItem(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
              placeholder="0"
            />
          </FormItem>

          <FormItem top="Редкость">
            <Select
              value={editingItem?.rarity || 'common'}
              onChange={(e) => setEditingItem(prev => ({ ...prev, rarity: e.target.value as any }))}
              options={Object.entries(RARITY_NAMES || {}).map(([key, name]) => ({
                label: name,
                value: key
              }))}
            />
          </FormItem>

          <FormItem top="URL изображения">
            <Input
              value={editingItem?.image_url || ''}
              onChange={(e) => setEditingItem(prev => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://example.com/image.png"
            />
          </FormItem>

          <FormItem top="Свойства (JSON)">
            <Textarea
              value={editingItem?.properties || '{}'}
              onChange={(e) => setEditingItem(prev => ({ ...prev, properties: e.target.value }))}
              placeholder='{"property1": "value1", "property2": "value2"}'
            />
          </FormItem>

          <ButtonGroup mode="horizontal" gap="m" stretched>
            <Button onClick={() => setActiveModal(null)}>Отмена</Button>
            <Button onClick={handleSaveItem} mode="primary">
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
        Админ - Покупки
      </PanelHeader>

      <Group>
        <Header>Статистика системы покупок</Header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
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
                {items.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Предметов
              </div>
            </div>
          </Card>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {items.reduce((sum, item) => sum + item.price, 0).toLocaleString('ru-RU')} ₭
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Общая стоимость
              </div>
            </div>
          </Card>
        </div>
      </Group>

      <Group>
        <Tabs>
          <TabsItem
            selected={activeTab === 'categories'}
            onClick={() => setActiveTab('categories')}
          >
            📁 Категории
          </TabsItem>
          <TabsItem
            selected={activeTab === 'items'}
            onClick={() => setActiveTab('items')}
          >
            🛍️ Предметы
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'categories' && (
        <Group>
          <Header
            aside={
              <Button
                size="s"
                mode="primary"
                onClick={() => setActiveModal(MODAL_PAGE_CREATE_CATEGORY)}
              >
                ➕ Создать категорию
              </Button>
            }
          >
            Управление категориями
          </Header>

          {loading.categories ? (
            <Div>
              <Placeholder>Загрузка...</Placeholder>
            </Div>
          ) : (
            <CardGrid size="l">
              {categories && categories.length > 0 ? categories.map((category) => (
                <Card key={category.id} mode="outline">
                  <div style={{ padding: '16px' }}>
                    <strong>{category.name}</strong>
                    
                    {category.description && (
                      <div style={{ marginTop: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                        {category.description}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)', marginTop: '8px' }}>
                      Создана: {new Date(category.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </Card>
              )) : (
                <Placeholder>Нет категорий</Placeholder>
              )}
            </CardGrid>
          )}
        </Group>
      )}

      {activeTab === 'items' && (
        <Group>
          <Header
            aside={
              <Button
                size="s"
                mode="primary"
                onClick={() => setActiveModal(MODAL_PAGE_CREATE_ITEM)}
              >
                ➕ Создать предмет
              </Button>
            }
          >
            Управление предметами
          </Header>

          {loading.items ? (
            <Div>
              <Placeholder>Загрузка...</Placeholder>
            </Div>
          ) : (
            <CardGrid size="l">
              {items && items.length > 0 ? items.map((item) => (
                <Card key={item.id} mode="outline">
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: RARITY_COLORS[item.rarity],
                          borderRadius: '50%',
                          marginRight: '8px'
                        }}
                      />
                      <strong>{item.name}</strong>
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: RARITY_COLORS[item.rarity] }}>
                      {RARITY_NAMES[item.rarity] || 'Неизвестно'}
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                      {item.category_name}
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                      {item.price.toLocaleString('ru-RU')} ₭
                    </div>
                    
                    {item.description && (
                      <div style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                        {item.description}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                      Создан: {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </Card>
              )) : (
                <Placeholder>Нет предметов</Placeholder>
              )}
            </CardGrid>
          )}
        </Group>
      )}

      {modal}
      {popout}
      {snackbar}
    </Panel>
  );
};
