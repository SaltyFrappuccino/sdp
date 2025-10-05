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
  FormItem,
  Select,
  Input,
  Spinner,
  Snackbar,
  SimpleCell,
  CardGrid,
  Tabs,
  TabsItem,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { Icon28DoneOutline, Icon28ErrorCircleOutline } from '@vkontakte/icons';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface PurchasesPanelProps extends NavIdProps {
  fetchedUser?: any;
}

interface Character {
  id: number;
  character_name: string;
  currency: number;
  rank: string;
}

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
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  properties: string;
}

interface Purchase {
  id: number;
  item_id: number;
  name: string;
  description: string;
  image_url: string | null;
  rarity: string;
  category_name: string;
  category_icon: string;
  purchase_price: number;
  purchased_at: string;
}

const rarityColors = {
  common: '#888888',
  rare: '#4A90E2',
  epic: '#9B59B6',
  legendary: '#F39C12',
};

export const PurchasesPanel: FC<PurchasesPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();

  const [activeTab, setActiveTab] = useState<'catalog' | 'my'>('catalog');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [myPurchases, setMyPurchases] = useState<Purchase[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<PurchaseItem | null>(null);
  const [filters, setFilters] = useState({
    island: '',
    rank: '',
    rarity: '',
    minPrice: '',
    maxPrice: '',
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<any>(null);

  useEffect(() => {
    fetchCategories();
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (selectedCategory !== null) {
      fetchItems();
    }
  }, [selectedCategory, filters]);

  useEffect(() => {
    if (selectedCharacter && activeTab === 'my') {
      fetchMyPurchases(selectedCharacter.id);
    }
  }, [selectedCharacter, activeTab]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/purchases/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки категорий', false);
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

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory.toString());
      if (filters.island) params.append('island', filters.island);
      if (filters.rank) params.append('rank', filters.rank);
      if (filters.rarity) params.append('rarity', filters.rarity);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);

      const response = await fetch(`${API_URL}/purchases/items?${params.toString()}`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки предметов', false);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPurchases = async (characterId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/purchases/my/${characterId}`);
      const data = await response.json();
      setMyPurchases(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки покупок', false);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: PurchaseItem) => {
    if (!selectedCharacter) {
      showSnackbar('Выберите персонажа', false);
      return;
    }

    if (selectedCharacter.currency < item.base_price) {
      showSnackbar('Недостаточно средств', false);
      return;
    }

    if (item.rank_required) {
      const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
      const charRankIndex = rankOrder.indexOf(selectedCharacter.rank);
      const reqRankIndex = rankOrder.indexOf(item.rank_required);
      
      if (charRankIndex < reqRankIndex) {
        showSnackbar(`Требуется ранг ${item.rank_required} или выше`, false);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/purchases/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          item_id: item.id,
        }),
      });

      if (response.ok) {
        showSnackbar('Покупка успешна!', true);
        setSelectedItem(null);
        fetchCharacters();
        if (selectedCharacter) {
          fetchMyPurchases(selectedCharacter.id);
        }
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Ошибка покупки', false);
      }
    } catch (error) {
      showSnackbar('Ошибка покупки', false);
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
    return price.toLocaleString('ru-RU') + ' ₭';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getRarityLabel = (rarity: string) => {
    const labels = {
      common: 'Обычный',
      rare: 'Редкий',
      epic: 'Эпический',
      legendary: 'Легендарный',
    };
    return labels[rarity as keyof typeof labels] || rarity;
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Покупки
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
                label: `${char.character_name} (${char.rank}) - ${formatPrice(char.currency)}`,
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
            selected={activeTab === 'catalog'}
            onClick={() => setActiveTab('catalog')}
          >
            Каталог
          </TabsItem>
          <TabsItem
            selected={activeTab === 'my'}
            onClick={() => setActiveTab('my')}
          >
            Мои покупки
          </TabsItem>
        </Tabs>
      </Group>

      {/* Вкладка "Каталог" */}
      {activeTab === 'catalog' && (
        <>
          {/* Категории */}
          {!selectedCategory && (
            <Group header={<Header>Выберите категорию</Header>}>
              <CardGrid size="l">
                {categories.map((category) => (
                  <Card key={category.id} mode="shadow" onClick={() => setSelectedCategory(category.id)}>
                    <Div style={{ textAlign: 'center', cursor: 'pointer' }}>
                      <div style={{ fontSize: 48, marginBottom: 8 }}>{category.icon}</div>
                      <Text weight="2" style={{ fontSize: 18, marginBottom: 4 }}>
                        {category.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)' }}>
                        {category.description}
                      </Text>
                    </Div>
                  </Card>
                ))}
              </CardGrid>
            </Group>
          )}

          {/* Фильтры и предметы */}
          {selectedCategory && (
            <>
              <Group>
                <Div>
                  <Button size="m" mode="secondary" onClick={() => setSelectedCategory(null)}>
                    ← Назад к категориям
                  </Button>
                </Div>
              </Group>

              {/* Фильтры */}
              <Group header={<Header>Фильтры</Header>}>
                <FormItem top="Остров">
                  <Select
                    value={filters.island}
                    onChange={(e) => setFilters({ ...filters, island: e.target.value })}
                    options={[
                      { label: 'Все острова', value: '' },
                      { label: 'Кага', value: 'Кага' },
                      { label: 'Хоши', value: 'Хоши' },
                      { label: 'Ичи', value: 'Ичи' },
                      { label: 'Куро', value: 'Куро' },
                      { label: 'Мидзу', value: 'Мидзу' },
                      { label: 'Сора', value: 'Сора' },
                    ]}
                  />
                </FormItem>

                <FormItem top="Редкость">
                  <Select
                    value={filters.rarity}
                    onChange={(e) => setFilters({ ...filters, rarity: e.target.value })}
                    options={[
                      { label: 'Все', value: '' },
                      { label: 'Обычный', value: 'common' },
                      { label: 'Редкий', value: 'rare' },
                      { label: 'Эпический', value: 'epic' },
                      { label: 'Легендарный', value: 'legendary' },
                    ]}
                  />
                </FormItem>

                <div style={{ display: 'flex', gap: 8 }}>
                  <FormItem top="Мин. цена" style={{ flex: 1 }}>
                    <Input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      placeholder="0"
                    />
                  </FormItem>
                  <FormItem top="Макс. цена" style={{ flex: 1 }}>
                    <Input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      placeholder="∞"
                    />
                  </FormItem>
                </div>
              </Group>

              {/* Предметы */}
              {loading && <Spinner size="m" style={{ margin: '20px auto' }} />}
              
              {!loading && items.length > 0 && (
                <Group header={<Header>Доступные предметы ({items.length})</Header>}>
                  {items.map((item) => (
                    <Card key={item.id} mode="outline" style={{ marginBottom: 8 }}>
                      <Div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <Text weight="2" style={{ fontSize: 18, marginBottom: 4 }}>
                              {item.name}
                            </Text>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 12,
                                backgroundColor: rarityColors[item.rarity],
                                color: 'white'
                              }}>
                                {getRarityLabel(item.rarity)}
                              </span>
                              {item.island && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  backgroundColor: 'var(--vkui--color_background_secondary)',
                                }}>
                                  {item.island}
                                </span>
                              )}
                              {item.rank_required && (
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  backgroundColor: 'var(--vkui--color_background_accent)',
                                  color: 'white'
                                }}>
                                  Ранг {item.rank_required}+
                                </span>
                              )}
                            </div>
                            <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)', marginBottom: 8 }}>
                              {item.description}
                            </Text>
                            <Text weight="2" style={{ fontSize: 20, color: 'var(--vkui--color_text_accent)' }}>
                              {formatPrice(item.base_price)}
                            </Text>
                          </div>
                        </div>
                        <Button
                          size="m"
                          mode="primary"
                          stretched
                          style={{ marginTop: 12 }}
                          onClick={() => setSelectedItem(item)}
                          disabled={!selectedCharacter}
                        >
                          Купить
                        </Button>
                      </Div>
                    </Card>
                  ))}
                </Group>
              )}

              {!loading && items.length === 0 && (
                <Group>
                  <Div>
                    <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                      Предметы не найдены
                    </Text>
                  </Div>
                </Group>
              )}
            </>
          )}

          {/* Модальное окно подтверждения покупки */}
          {selectedItem && (
            <Group header={<Header>Подтверждение покупки</Header>}>
              <Card mode="shadow">
                <Div>
                  <Text weight="2" style={{ fontSize: 20, marginBottom: 8 }}>
                    {selectedItem.name}
                  </Text>
                  <Text style={{ fontSize: 14, marginBottom: 12 }}>
                    {selectedItem.description}
                  </Text>
                  <div style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 16 }}>
                      Цена: <span style={{ fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                        {formatPrice(selectedItem.base_price)}
                      </span>
                    </Text>
                    {selectedCharacter && (
                      <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                        У вас: {formatPrice(selectedCharacter.currency)}
                      </Text>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      size="l"
                      mode="primary"
                      stretched
                      onClick={() => handlePurchase(selectedItem)}
                      disabled={loading || !selectedCharacter || (selectedCharacter.currency < selectedItem.base_price)}
                    >
                      Подтвердить покупку
                    </Button>
                    <Button
                      size="l"
                      mode="secondary"
                      stretched
                      onClick={() => setSelectedItem(null)}
                    >
                      Отмена
                    </Button>
                  </div>
                </Div>
              </Card>
            </Group>
          )}
        </>
      )}

      {/* Вкладка "Мои покупки" */}
      {activeTab === 'my' && (
        <>
          {selectedCharacter && myPurchases.length > 0 ? (
            <>
              <Group header={<Header>Всего куплено: {myPurchases.length}</Header>}>
                <Div>
                  <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)' }}>
                    Потрачено: {formatPrice(myPurchases.reduce((sum, p) => sum + p.purchase_price, 0))}
                  </Text>
                </Div>
              </Group>

              <Group header={<Header>История покупок</Header>}>
                {myPurchases.map((purchase) => (
                  <SimpleCell
                    key={purchase.id}
                    before={<div style={{ fontSize: 32 }}>{purchase.category_icon}</div>}
                    subtitle={`${purchase.category_name} • ${formatPrice(purchase.purchase_price)} • ${formatDate(purchase.purchased_at)}`}
                    after={
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: rarityColors[purchase.rarity as keyof typeof rarityColors],
                        color: 'white'
                      }}>
                        {getRarityLabel(purchase.rarity)}
                      </span>
                    }
                  >
                    {purchase.name}
                  </SimpleCell>
                ))}
              </Group>
            </>
          ) : (
            <Group>
              <Div>
                <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                  {selectedCharacter ? 'У вас пока нет покупок' : 'Выберите персонажа'}
                </Text>
              </Div>
            </Group>
          )}
        </>
      )}

      {snackbar}
    </Panel>
  );
};

