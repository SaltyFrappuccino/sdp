import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  Header,
  Spinner,
  Div,
  Button,
  PanelHeaderBack,
  ButtonGroup,
  Snackbar,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormLayoutGroup,
  Input,
  Textarea,
  FormItem,
  Search,
  Tabs,
  TabsItem,
  Text,
  Card,
  IconButton,
  NativeSelect,
  Checkbox,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../api';
import { Icon24CheckCircleOutline, Icon24ErrorCircle, Icon24Add, Icon24Delete, Icon24Settings } from '@vkontakte/icons';

interface Category {
  id: number;
  name: string;
  icon: string;
  description: string;
  display_order: number;
}

interface PurchaseItem {
  id: number;
  category_id: number;
  name: string;
  description: string;
  base_price: number;
  island: string | null;
  rank_required: string | null;
  image_url: string | null;
  rarity: string;
  properties: string;
  available: number;
  created_at: string;
}

export const AdminPurchasesPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'categories' | 'items'>('categories');
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Форма категории
  const [categoryForm, setCategoryForm] = useState({
    id: 0,
    name: '',
    icon: '',
    description: '',
    display_order: '0',
  });

  // Форма предмета
  const [itemForm, setItemForm] = useState({
    id: 0,
    category_id: '',
    name: '',
    description: '',
    base_price: '',
    island: '',
    rank_required: '',
    image_url: '',
    rarity: 'common',
    properties: '{}',
    available: true,
  });

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/purchases/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки категорий', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/purchases/items`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки предметов', 'error');
    }
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={
          type === 'success' ? (
            <Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" />
          ) : (
            <Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />
          )
        }
      >
        {message}
      </Snackbar>
    );
  };

  const handleCreateCategory = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/purchases/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name,
          icon: categoryForm.icon,
          description: categoryForm.description,
          display_order: parseInt(categoryForm.display_order),
        }),
      });

      if (response.ok) {
        showSnackbar('Категория создана!', 'success');
        setActiveModal(null);
        setCategoryForm({
          id: 0,
          name: '',
          icon: '',
          description: '',
          display_order: '0',
        });
        fetchCategories();
      } else {
        showSnackbar('Ошибка создания категории', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка создания категории', 'error');
    }
  };

  const handleUpdateCategory = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/purchases/category/${categoryForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name,
          icon: categoryForm.icon,
          description: categoryForm.description,
          display_order: parseInt(categoryForm.display_order),
        }),
      });

      if (response.ok) {
        showSnackbar('Категория обновлена!', 'success');
        setActiveModal(null);
        fetchCategories();
      } else {
        showSnackbar('Ошибка обновления категории', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка обновления категории', 'error');
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту категорию?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/purchases/category/${categoryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSnackbar('Категория удалена!', 'success');
        fetchCategories();
      } else {
        showSnackbar('Ошибка удаления категории', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка удаления категории', 'error');
    }
  };

  const handleCreateItem = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/purchases/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(itemForm.category_id),
          name: itemForm.name,
          description: itemForm.description,
          base_price: parseFloat(itemForm.base_price),
          island: itemForm.island || null,
          rank_required: itemForm.rank_required || null,
          image_url: itemForm.image_url || null,
          rarity: itemForm.rarity,
          properties: itemForm.properties,
        }),
      });

      if (response.ok) {
        showSnackbar('Предмет создан!', 'success');
        setActiveModal(null);
        setItemForm({
          id: 0,
          category_id: '',
          name: '',
          description: '',
          base_price: '',
          island: '',
          rank_required: '',
          image_url: '',
          rarity: 'common',
          properties: '{}',
          available: true,
        });
        fetchItems();
      } else {
        showSnackbar('Ошибка создания предмета', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка создания предмета', 'error');
    }
  };

  const handleUpdateItem = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/purchases/item/${itemForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: parseInt(itemForm.category_id),
          name: itemForm.name,
          description: itemForm.description,
          base_price: parseFloat(itemForm.base_price),
          island: itemForm.island || null,
          rank_required: itemForm.rank_required || null,
          image_url: itemForm.image_url || null,
          rarity: itemForm.rarity,
          properties: itemForm.properties,
          available: itemForm.available,
        }),
      });

      if (response.ok) {
        showSnackbar('Предмет обновлён!', 'success');
        setActiveModal(null);
        fetchItems();
      } else {
        showSnackbar('Ошибка обновления предмета', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка обновления предмета', 'error');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот предмет?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/purchases/item/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSnackbar('Предмет удалён!', 'success');
        fetchItems();
      } else {
        showSnackbar('Ошибка удаления предмета', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка удаления предмета', 'error');
    }
  };

  const openEditCategoryModal = (category: Category) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
      icon: category.icon,
      description: category.description,
      display_order: category.display_order.toString(),
    });
    setActiveModal('edit-category');
  };

  const openEditItemModal = (item: PurchaseItem) => {
    setItemForm({
      id: item.id,
      category_id: item.category_id.toString(),
      name: item.name,
      description: item.description,
      base_price: item.base_price.toString(),
      island: item.island || '',
      rank_required: item.rank_required || '',
      image_url: item.image_url || '',
      rarity: item.rarity,
      properties: item.properties,
      available: item.available === 1,
    });
    setActiveModal('edit-item');
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="create-category"
        header={<ModalPageHeader>Создать категорию</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="Одежда"
            />
          </FormItem>
          <FormItem top="Иконка (emoji)">
            <Input
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              placeholder="👕"
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="Описание категории..."
            />
          </FormItem>
          <FormItem top="Порядок отображения">
            <Input
              type="number"
              value={categoryForm.display_order}
              onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })}
              placeholder="0"
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleCreateCategory}>
              Создать
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="edit-category"
        header={<ModalPageHeader>Редактировать категорию</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
          </FormItem>
          <FormItem top="Иконка (emoji)">
            <Input
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </FormItem>
          <FormItem top="Порядок отображения">
            <Input
              type="number"
              value={categoryForm.display_order}
              onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })}
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleUpdateCategory}>
              Сохранить
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="create-item"
        header={<ModalPageHeader>Создать предмет</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Категория">
            <NativeSelect
              value={itemForm.category_id}
              onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
              placeholder="Выберите категорию"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem top="Название">
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="Название предмета"
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="Описание предмета..."
            />
          </FormItem>
          <FormItem top="Цена (кредиты)">
            <Input
              type="number"
              value={itemForm.base_price}
              onChange={(e) => setItemForm({ ...itemForm, base_price: e.target.value })}
              placeholder="1000"
            />
          </FormItem>
          <FormItem top="Остров (опционально)">
            <Input
              value={itemForm.island}
              onChange={(e) => setItemForm({ ...itemForm, island: e.target.value })}
              placeholder="Название острова"
            />
          </FormItem>
          <FormItem top="Требуемый ранг (опционально)">
            <NativeSelect
              value={itemForm.rank_required}
              onChange={(e) => setItemForm({ ...itemForm, rank_required: e.target.value })}
            >
              <option value="">Без требований</option>
              <option value="F">F</option>
              <option value="E">E</option>
              <option value="D">D</option>
              <option value="C">C</option>
              <option value="B">B</option>
              <option value="A">A</option>
              <option value="S">S</option>
              <option value="SS">SS</option>
              <option value="SSS">SSS</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="URL изображения (опционально)">
            <Input
              value={itemForm.image_url}
              onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
              placeholder="https://..."
            />
          </FormItem>
          <FormItem top="Редкость">
            <NativeSelect
              value={itemForm.rarity}
              onChange={(e) => setItemForm({ ...itemForm, rarity: e.target.value })}
            >
              <option value="common">Common (Обычный)</option>
              <option value="uncommon">Uncommon (Необычный)</option>
              <option value="rare">Rare (Редкий)</option>
              <option value="epic">Epic (Эпический)</option>
              <option value="legendary">Legendary (Легендарный)</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Свойства (JSON)">
            <Textarea
              value={itemForm.properties}
              onChange={(e) => setItemForm({ ...itemForm, properties: e.target.value })}
              placeholder='{"bonus": 10}'
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleCreateItem}>
              Создать
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="edit-item"
        header={<ModalPageHeader>Редактировать предмет</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Категория">
            <NativeSelect
              value={itemForm.category_id}
              onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem top="Название">
            <Input
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </FormItem>
          <FormItem top="Цена (кредиты)">
            <Input
              type="number"
              value={itemForm.base_price}
              onChange={(e) => setItemForm({ ...itemForm, base_price: e.target.value })}
            />
          </FormItem>
          <FormItem top="Остров (опционально)">
            <Input
              value={itemForm.island}
              onChange={(e) => setItemForm({ ...itemForm, island: e.target.value })}
            />
          </FormItem>
          <FormItem top="Требуемый ранг (опционально)">
            <NativeSelect
              value={itemForm.rank_required}
              onChange={(e) => setItemForm({ ...itemForm, rank_required: e.target.value })}
            >
              <option value="">Без требований</option>
              <option value="F">F</option>
              <option value="E">E</option>
              <option value="D">D</option>
              <option value="C">C</option>
              <option value="B">B</option>
              <option value="A">A</option>
              <option value="S">S</option>
              <option value="SS">SS</option>
              <option value="SSS">SSS</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="URL изображения (опционально)">
            <Input
              value={itemForm.image_url}
              onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
            />
          </FormItem>
          <FormItem top="Редкость">
            <NativeSelect
              value={itemForm.rarity}
              onChange={(e) => setItemForm({ ...itemForm, rarity: e.target.value })}
            >
              <option value="common">Common (Обычный)</option>
              <option value="uncommon">Uncommon (Необычный)</option>
              <option value="rare">Rare (Редкий)</option>
              <option value="epic">Epic (Эпический)</option>
              <option value="legendary">Legendary (Легендарный)</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Свойства (JSON)">
            <Textarea
              value={itemForm.properties}
              onChange={(e) => setItemForm({ ...itemForm, properties: e.target.value })}
            />
          </FormItem>
          <FormItem top="Доступность">
            <Checkbox
              checked={itemForm.available}
              onChange={(e) => setItemForm({ ...itemForm, available: e.target.checked })}
            >
              Доступен для покупки
            </Checkbox>
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleUpdateItem}>
              Сохранить
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/admin_panel')} />}>
        Управление покупками
      </PanelHeader>

      <Group>
        <Tabs>
          <TabsItem selected={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
            Категории
          </TabsItem>
          <TabsItem selected={activeTab === 'items'} onClick={() => setActiveTab('items')}>
            Предметы
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'categories' && (
        <>
          <Group header={<Header>📦 Категории</Header>}>
            <Div>
              <Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('create-category')}>
                Создать категорию
              </Button>
            </Div>
            <Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." />
            {loading ? (
              <Div>
                <Spinner size="m" />
              </Div>
            ) : (
              <Div>
                {filteredCategories.map((cat) => (
                  <Card key={cat.id} style={{ marginBottom: '12px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <Text weight="2" style={{ fontSize: '18px' }}>
                          {cat.icon} {cat.name}
                        </Text>
                        <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                          {cat.description}
                        </Text>
                        <Text style={{ marginTop: '4px', fontSize: '14px' }}>
                          Порядок: {cat.display_order}
                        </Text>
                      </div>
                      <ButtonGroup mode="vertical" gap="s">
                        <IconButton onClick={() => openEditCategoryModal(cat)}>
                          <Icon24Settings />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteCategory(cat.id)}>
                          <Icon24Delete />
                        </IconButton>
                      </ButtonGroup>
                    </div>
                  </Card>
                ))}
              </Div>
            )}
          </Group>
        </>
      )}

      {activeTab === 'items' && (
        <Group header={<Header>🛍️ Предметы</Header>}>
          <Div>
            <Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('create-item')}>
              Создать предмет
            </Button>
          </Div>
          <Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." />
          <Div>
            {filteredItems.map((item) => {
              const category = categories.find((c) => c.id === item.category_id);
              return (
                <Card key={item.id} style={{ marginBottom: '12px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Text weight="2" style={{ fontSize: '16px' }}>
                        {item.name} {!item.available && <span style={{ color: 'red' }}>(недоступен)</span>}
                      </Text>
                      <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                        {item.description}
                      </Text>
                      <Text style={{ marginTop: '8px' }}>
                        💵 {item.base_price} кр. • {category?.icon} {category?.name}
                      </Text>
                      <Text style={{ fontSize: '14px' }}>
                        {item.rarity} {item.rank_required && `• Требуется: ${item.rank_required}`}
                      </Text>
                    </div>
                    <ButtonGroup mode="vertical" gap="s">
                      <IconButton onClick={() => openEditItemModal(item)}>
                        <Icon24Settings />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteItem(item.id)}>
                        <Icon24Delete />
                      </IconButton>
                    </ButtonGroup>
                  </div>
                </Card>
              );
            })}
          </Div>
        </Group>
      )}

      {snackbar}
    </Panel>
  );
};

