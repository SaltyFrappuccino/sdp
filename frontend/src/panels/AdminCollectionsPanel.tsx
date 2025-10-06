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

interface Series {
  id: number;
  name: string;
  description: string;
  total_items: number;
  season: number;
  active: number;
  created_at: string;
}

interface CollectionItem {
  id: number;
  series_id: number;
  name: string;
  description: string;
  rarity: string;
  image_url: string | null;
  lore_text: string | null;
  drop_rate: number;
  properties: string;
}

interface Pack {
  id: number;
  name: string;
  description: string;
  price: number;
  guaranteed_rarity: string;
  items_count: number;
  series_id: number | null;
  active: number;
}

export const AdminCollectionsPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState<Series[]>([]);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'series' | 'items' | 'packs'>('series');
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Форма серии
  const [seriesForm, setSeriesForm] = useState({
    id: 0,
    name: '',
    description: '',
    total_items: '',
    season: '',
    active: true,
  });

  // Форма предмета
  const [itemForm, setItemForm] = useState({
    id: 0,
    series_id: '',
    name: '',
    description: '',
    rarity: 'common',
    image_url: '',
    lore_text: '',
    drop_rate: '',
    properties: '{}',
  });

  // Форма пака
  const [packForm, setPackForm] = useState({
    id: 0,
    name: '',
    description: '',
    price: '',
    guaranteed_rarity: 'common',
    items_count: '',
    series_id: '',
    active: true,
  });

  useEffect(() => {
    fetchSeries();
    fetchItems();
    fetchPacks();
  }, []);

  const fetchSeries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/collections/series`);
      const data = await response.json();
      setSeries(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки серий', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      // Получаем все серии и их предметы
      const response = await fetch(`${API_URL}/collections/series`);
      const seriesData = await response.json();
      
      let allItems: CollectionItem[] = [];
      for (const s of seriesData) {
        const itemsResponse = await fetch(`${API_URL}/collections/series/${s.id}`);
        const seriesDetails = await itemsResponse.json();
        if (seriesDetails.items) {
          allItems = [...allItems, ...seriesDetails.items];
        }
      }
      setItems(allItems);
    } catch (error) {
      showSnackbar('Ошибка загрузки предметов', 'error');
    }
  };

  const fetchPacks = async () => {
    try {
      const response = await fetch(`${API_URL}/collections/packs`);
      const data = await response.json();
      setPacks(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки паков', 'error');
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

  // Series CRUD
  const handleCreateSeries = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/collections/series`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: seriesForm.name,
          description: seriesForm.description,
          total_items: parseInt(seriesForm.total_items),
          season: parseInt(seriesForm.season),
        }),
      });

      if (response.ok) {
        showSnackbar('Серия создана!', 'success');
        setActiveModal(null);
        setSeriesForm({
          id: 0,
          name: '',
          description: '',
          total_items: '',
          season: '',
          active: true,
        });
        fetchSeries();
      } else {
        showSnackbar('Ошибка создания серии', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка создания серии', 'error');
    }
  };

  const handleUpdateSeries = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/collections/series/${seriesForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: seriesForm.name,
          description: seriesForm.description,
          total_items: parseInt(seriesForm.total_items),
          season: parseInt(seriesForm.season),
          active: seriesForm.active,
        }),
      });

      if (response.ok) {
        showSnackbar('Серия обновлена!', 'success');
        setActiveModal(null);
        fetchSeries();
      } else {
        showSnackbar('Ошибка обновления серии', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка обновления серии', 'error');
    }
  };

  const handleDeleteSeries = async (seriesId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту серию?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/collections/series/${seriesId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSnackbar('Серия удалена!', 'success');
        fetchSeries();
      } else {
        showSnackbar('Ошибка удаления серии', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка удаления серии', 'error');
    }
  };

  // Items CRUD
  const handleCreateItem = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/collections/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_id: parseInt(itemForm.series_id),
          name: itemForm.name,
          description: itemForm.description,
          rarity: itemForm.rarity,
          image_url: itemForm.image_url || null,
          lore_text: itemForm.lore_text || null,
          drop_rate: parseFloat(itemForm.drop_rate),
          properties: itemForm.properties,
        }),
      });

      if (response.ok) {
        showSnackbar('Предмет создан!', 'success');
        setActiveModal(null);
        setItemForm({
          id: 0,
          series_id: '',
          name: '',
          description: '',
          rarity: 'common',
          image_url: '',
          lore_text: '',
          drop_rate: '',
          properties: '{}',
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
      const response = await fetch(`${API_URL}/admin/collections/item/${itemForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_id: parseInt(itemForm.series_id),
          name: itemForm.name,
          description: itemForm.description,
          rarity: itemForm.rarity,
          image_url: itemForm.image_url || null,
          lore_text: itemForm.lore_text || null,
          drop_rate: parseFloat(itemForm.drop_rate),
          properties: itemForm.properties,
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
      const response = await fetch(`${API_URL}/admin/collections/item/${itemId}`, {
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

  // Packs CRUD
  const handleCreatePack = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/collections/pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: packForm.name,
          description: packForm.description,
          price: parseFloat(packForm.price),
          guaranteed_rarity: packForm.guaranteed_rarity,
          items_count: parseInt(packForm.items_count),
          series_id: packForm.series_id ? parseInt(packForm.series_id) : null,
        }),
      });

      if (response.ok) {
        showSnackbar('Пак создан!', 'success');
        setActiveModal(null);
        setPackForm({
          id: 0,
          name: '',
          description: '',
          price: '',
          guaranteed_rarity: 'common',
          items_count: '',
          series_id: '',
          active: true,
        });
        fetchPacks();
      } else {
        showSnackbar('Ошибка создания пака', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка создания пака', 'error');
    }
  };

  const handleUpdatePack = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/collections/pack/${packForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: packForm.name,
          description: packForm.description,
          price: parseFloat(packForm.price),
          guaranteed_rarity: packForm.guaranteed_rarity,
          items_count: parseInt(packForm.items_count),
          series_id: packForm.series_id ? parseInt(packForm.series_id) : null,
          active: packForm.active,
        }),
      });

      if (response.ok) {
        showSnackbar('Пак обновлён!', 'success');
        setActiveModal(null);
        fetchPacks();
      } else {
        showSnackbar('Ошибка обновления пака', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка обновления пака', 'error');
    }
  };

  const handleDeletePack = async (packId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот пак?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/collections/pack/${packId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSnackbar('Пак удалён!', 'success');
        fetchPacks();
      } else {
        showSnackbar('Ошибка удаления пака', 'error');
      }
    } catch (error) {
      showSnackbar('Ошибка удаления пака', 'error');
    }
  };

  const openEditSeriesModal = (s: Series) => {
    setSeriesForm({
      id: s.id,
      name: s.name,
      description: s.description,
      total_items: s.total_items.toString(),
      season: s.season.toString(),
      active: s.active === 1,
    });
    setActiveModal('edit-series');
  };

  const openEditItemModal = (item: CollectionItem) => {
    setItemForm({
      id: item.id,
      series_id: item.series_id.toString(),
      name: item.name,
      description: item.description,
      rarity: item.rarity,
      image_url: item.image_url || '',
      lore_text: item.lore_text || '',
      drop_rate: item.drop_rate.toString(),
      properties: item.properties,
    });
    setActiveModal('edit-item');
  };

  const openEditPackModal = (pack: Pack) => {
    setPackForm({
      id: pack.id,
      name: pack.name,
      description: pack.description,
      price: pack.price.toString(),
      guaranteed_rarity: pack.guaranteed_rarity,
      items_count: pack.items_count.toString(),
      series_id: pack.series_id?.toString() || '',
      active: pack.active === 1,
    });
    setActiveModal('edit-pack');
  };

  const filteredSeries = series.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPacks = packs.filter((pack) =>
    pack.name.toLowerCase().includes(search.toLowerCase())
  );

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      {/* Series Modals */}
      <ModalPage
        id="create-series"
        header={<ModalPageHeader>Создать серию</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={seriesForm.name}
              onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })}
              placeholder="Сезон 1"
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={seriesForm.description}
              onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
              placeholder="Описание серии..."
            />
          </FormItem>
          <FormItem top="Всего предметов">
            <Input
              type="number"
              value={seriesForm.total_items}
              onChange={(e) => setSeriesForm({ ...seriesForm, total_items: e.target.value })}
              placeholder="50"
            />
          </FormItem>
          <FormItem top="Сезон">
            <Input
              type="number"
              value={seriesForm.season}
              onChange={(e) => setSeriesForm({ ...seriesForm, season: e.target.value })}
              placeholder="1"
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleCreateSeries}>
              Создать
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="edit-series"
        header={<ModalPageHeader>Редактировать серию</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={seriesForm.name}
              onChange={(e) => setSeriesForm({ ...seriesForm, name: e.target.value })}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={seriesForm.description}
              onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
            />
          </FormItem>
          <FormItem top="Всего предметов">
            <Input
              type="number"
              value={seriesForm.total_items}
              onChange={(e) => setSeriesForm({ ...seriesForm, total_items: e.target.value })}
            />
          </FormItem>
          <FormItem top="Сезон">
            <Input
              type="number"
              value={seriesForm.season}
              onChange={(e) => setSeriesForm({ ...seriesForm, season: e.target.value })}
            />
          </FormItem>
          <FormItem>
            <Checkbox
              checked={seriesForm.active}
              onChange={(e) => setSeriesForm({ ...seriesForm, active: e.target.checked })}
            >
              Активна
            </Checkbox>
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleUpdateSeries}>
              Сохранить
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      {/* Item Modals */}
      <ModalPage
        id="create-item"
        header={<ModalPageHeader>Создать предмет</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Серия">
            <NativeSelect
              value={itemForm.series_id}
              onChange={(e) => setItemForm({ ...itemForm, series_id: e.target.value })}
              placeholder="Выберите серию"
            >
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Сезон {s.season})
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
          <FormItem top="URL изображения">
            <Input
              value={itemForm.image_url}
              onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
              placeholder="https://..."
            />
          </FormItem>
          <FormItem top="Лор-текст">
            <Textarea
              value={itemForm.lore_text}
              onChange={(e) => setItemForm({ ...itemForm, lore_text: e.target.value })}
              placeholder="История предмета..."
            />
          </FormItem>
          <FormItem top="Шанс выпадения (0-1)">
            <Input
              type="number"
              step="0.01"
              value={itemForm.drop_rate}
              onChange={(e) => setItemForm({ ...itemForm, drop_rate: e.target.value })}
              placeholder="0.1"
            />
          </FormItem>
          <FormItem top="Свойства (JSON)">
            <Textarea
              value={itemForm.properties}
              onChange={(e) => setItemForm({ ...itemForm, properties: e.target.value })}
              placeholder='{"special": "value"}'
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
          <FormItem top="Серия">
            <NativeSelect
              value={itemForm.series_id}
              onChange={(e) => setItemForm({ ...itemForm, series_id: e.target.value })}
            >
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Сезон {s.season})
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
          <FormItem top="URL изображения">
            <Input
              value={itemForm.image_url}
              onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
            />
          </FormItem>
          <FormItem top="Лор-текст">
            <Textarea
              value={itemForm.lore_text}
              onChange={(e) => setItemForm({ ...itemForm, lore_text: e.target.value })}
            />
          </FormItem>
          <FormItem top="Шанс выпадения (0-1)">
            <Input
              type="number"
              step="0.01"
              value={itemForm.drop_rate}
              onChange={(e) => setItemForm({ ...itemForm, drop_rate: e.target.value })}
            />
          </FormItem>
          <FormItem top="Свойства (JSON)">
            <Textarea
              value={itemForm.properties}
              onChange={(e) => setItemForm({ ...itemForm, properties: e.target.value })}
            />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleUpdateItem}>
              Сохранить
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      {/* Pack Modals */}
      <ModalPage
        id="create-pack"
        header={<ModalPageHeader>Создать пак</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={packForm.name}
              onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
              placeholder="Стартовый пак"
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={packForm.description}
              onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
              placeholder="Описание пака..."
            />
          </FormItem>
          <FormItem top="Цена (кредиты)">
            <Input
              type="number"
              value={packForm.price}
              onChange={(e) => setPackForm({ ...packForm, price: e.target.value })}
              placeholder="500"
            />
          </FormItem>
          <FormItem top="Гарантированная редкость">
            <NativeSelect
              value={packForm.guaranteed_rarity}
              onChange={(e) => setPackForm({ ...packForm, guaranteed_rarity: e.target.value })}
            >
              <option value="common">Common (Обычный)</option>
              <option value="uncommon">Uncommon (Необычный)</option>
              <option value="rare">Rare (Редкий)</option>
              <option value="epic">Epic (Эпический)</option>
              <option value="legendary">Legendary (Легендарный)</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Количество предметов">
            <Input
              type="number"
              value={packForm.items_count}
              onChange={(e) => setPackForm({ ...packForm, items_count: e.target.value })}
              placeholder="5"
            />
          </FormItem>
          <FormItem top="Серия (опционально)">
            <NativeSelect
              value={packForm.series_id}
              onChange={(e) => setPackForm({ ...packForm, series_id: e.target.value })}
            >
              <option value="">Любая серия</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Сезон {s.season})
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleCreatePack}>
              Создать
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="edit-pack"
        header={<ModalPageHeader>Редактировать пак</ModalPageHeader>}
        onClose={() => setActiveModal(null)}
      >
        <FormLayoutGroup>
          <FormItem top="Название">
            <Input
              value={packForm.name}
              onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
            />
          </FormItem>
          <FormItem top="Описание">
            <Textarea
              value={packForm.description}
              onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
            />
          </FormItem>
          <FormItem top="Цена (кредиты)">
            <Input
              type="number"
              value={packForm.price}
              onChange={(e) => setPackForm({ ...packForm, price: e.target.value })}
            />
          </FormItem>
          <FormItem top="Гарантированная редкость">
            <NativeSelect
              value={packForm.guaranteed_rarity}
              onChange={(e) => setPackForm({ ...packForm, guaranteed_rarity: e.target.value })}
            >
              <option value="common">Common (Обычный)</option>
              <option value="uncommon">Uncommon (Необычный)</option>
              <option value="rare">Rare (Редкий)</option>
              <option value="epic">Epic (Эпический)</option>
              <option value="legendary">Legendary (Легендарный)</option>
            </NativeSelect>
          </FormItem>
          <FormItem top="Количество предметов">
            <Input
              type="number"
              value={packForm.items_count}
              onChange={(e) => setPackForm({ ...packForm, items_count: e.target.value })}
            />
          </FormItem>
          <FormItem top="Серия (опционально)">
            <NativeSelect
              value={packForm.series_id}
              onChange={(e) => setPackForm({ ...packForm, series_id: e.target.value })}
            >
              <option value="">Любая серия</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Сезон {s.season})
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem>
            <Checkbox
              checked={packForm.active}
              onChange={(e) => setPackForm({ ...packForm, active: e.target.checked })}
            >
              Активен
            </Checkbox>
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleUpdatePack}>
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
        Управление коллекциями
      </PanelHeader>

      <Group>
        <Tabs>
          <TabsItem selected={activeTab === 'series'} onClick={() => setActiveTab('series')}>
            Серии
          </TabsItem>
          <TabsItem selected={activeTab === 'items'} onClick={() => setActiveTab('items')}>
            Предметы
          </TabsItem>
          <TabsItem selected={activeTab === 'packs'} onClick={() => setActiveTab('packs')}>
            Паки
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'series' && (
        <Group header={<Header>📚 Серии коллекций</Header>}>
          <Div>
            <Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('create-series')}>
              Создать серию
            </Button>
          </Div>
          <Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." />
          {loading ? (
            <Div>
              <Spinner size="m" />
            </Div>
          ) : (
            <Div>
              {filteredSeries.map((s) => (
                <Card key={s.id} style={{ marginBottom: '12px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Text weight="2" style={{ fontSize: '18px' }}>
                        {s.name} {!s.active && <span style={{ color: 'red' }}>(неактивна)</span>}
                      </Text>
                      <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                        {s.description}
                      </Text>
                      <Text style={{ marginTop: '8px' }}>
                        📦 Предметов: {s.total_items} • Сезон: {s.season}
                      </Text>
                    </div>
                    <ButtonGroup mode="vertical" gap="s">
                      <IconButton onClick={() => openEditSeriesModal(s)}>
                        <Icon24Settings />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteSeries(s.id)}>
                        <Icon24Delete />
                      </IconButton>
                    </ButtonGroup>
                  </div>
                </Card>
              ))}
            </Div>
          )}
        </Group>
      )}

      {activeTab === 'items' && (
        <Group header={<Header>💎 Предметы коллекций</Header>}>
          <Div>
            <Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('create-item')}>
              Создать предмет
            </Button>
          </Div>
          <Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." />
          <Div>
            {filteredItems.map((item) => {
              const itemSeries = series.find((s) => s.id === item.series_id);
              return (
                <Card key={item.id} style={{ marginBottom: '12px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Text weight="2" style={{ fontSize: '16px' }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                        {item.description}
                      </Text>
                      <Text style={{ marginTop: '8px', fontSize: '14px' }}>
                        ⭐ {item.rarity} • 📊 Шанс: {(item.drop_rate * 100).toFixed(1)}%
                      </Text>
                      {itemSeries && (
                        <Text style={{ fontSize: '14px' }}>
                          📚 {itemSeries.name}
                        </Text>
                      )}
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

      {activeTab === 'packs' && (
        <Group header={<Header>🎁 Паки</Header>}>
          <Div>
            <Button size="l" stretched before={<Icon24Add />} onClick={() => setActiveModal('create-pack')}>
              Создать пак
            </Button>
          </Div>
          <Search value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." />
          <Div>
            {filteredPacks.map((pack) => {
              const packSeries = pack.series_id ? series.find((s) => s.id === pack.series_id) : null;
              return (
                <Card key={pack.id} style={{ marginBottom: '12px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Text weight="2" style={{ fontSize: '16px' }}>
                        {pack.name} {!pack.active && <span style={{ color: 'red' }}>(неактивен)</span>}
                      </Text>
                      <Text style={{ color: 'var(--vkui--color_text_secondary)', marginTop: '4px' }}>
                        {pack.description}
                      </Text>
                      <Text style={{ marginTop: '8px' }}>
                        💵 {pack.price} кр. • 📦 {pack.items_count} предм.
                      </Text>
                      <Text style={{ fontSize: '14px' }}>
                        ⭐ Гарантия: {pack.guaranteed_rarity}
                      </Text>
                      {packSeries && (
                        <Text style={{ fontSize: '14px' }}>
                          📚 {packSeries.name}
                        </Text>
                      )}
                    </div>
                    <ButtonGroup mode="vertical" gap="s">
                      <IconButton onClick={() => openEditPackModal(pack)}>
                        <Icon24Settings />
                      </IconButton>
                      <IconButton onClick={() => handleDeletePack(pack.id)}>
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

