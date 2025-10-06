import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  Cell,
  Button,
  Tabs,
  TabsItem,
  Div,
  Title,
  Text,
  Spinner,
  Snackbar,
  Card,
  CardGrid,
  ButtonGroup,
  SimpleCell,
  Avatar,
  Progress,
  Checkbox,
  NativeSelect
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
  fetchedUser?: any;
}

interface FishingLocation {
  id: number;
  name: string;
  island: string;
  water_type: string;
  min_rank: string;
  description: string;
}

interface FishingGear {
  id: number;
  name: string;
  type: string;
  quality: string;
  price: number;
  bonus_chance: number;
  bonus_rarity: number;
  description: string;
  min_rank: string;
  quantity?: number;
  is_consumable?: boolean;
}

interface Fish {
  id: number;
  name: string;
  weight: number;
  base_price: number;
  rarity: string;
  location_name: string;
  caught_at: string;
}

const FishingPanel: React.FC<NavIdProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [activeTab, setActiveTab] = useState<'game' | 'inventory' | 'shop'>('game');
  const [locations, setLocations] = useState<FishingLocation[]>([]);
  const [gear, setGear] = useState<FishingGear[]>([]);
  const [shopGear, setShopGear] = useState<FishingGear[]>([]);
  const [inventory, setInventory] = useState<Fish[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedGear, setSelectedGear] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFishing, setIsFishing] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    loadCharacters();
    loadLocations();
    loadShopGear();
  }, []);

  useEffect(() => {
    if (characterId) {
      loadGear();
    }
  }, [characterId]);

  useEffect(() => {
    if (selectedCharacter) {
      setCharacterId(selectedCharacter.id);
      setCredits(selectedCharacter.currency);
      loadInventory();
    }
  }, [selectedCharacter, activeTab]);

  const loadCharacters = async () => {
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
      console.error('Ошибка при загрузке персонажей:', error);
    }
  };

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/fishing/locations`);
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Ошибка при загрузке локаций:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGear = async () => {
    if (!characterId) return;
    try {
      const response = await fetch(`${API_URL}/fishing/gear/${characterId}`);
      const data = await response.json();
      setGear(data);
    } catch (error) {
      console.error('Ошибка при загрузке снаряжения:', error);
    }
  };

  const loadShopGear = async () => {
    try {
      const response = await fetch(`${API_URL}/fishing/gear`);
      const data = await response.json();
      // Показываем только покупаемое снаряжение (не базовое)
      const shopItems = data.filter((item: any) => !item.is_basic);
      
      // Сортируем по типу и качеству (от худшего к лучшему)
      const qualityOrder: { [key: string]: number } = { 'Обычное': 1, 'Хорошее': 2, 'Отличное': 3, 'Эпическое': 4, 'Легендарное': 5 };
      shopItems.sort((a: any, b: any) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return (qualityOrder[a.quality] || 0) - (qualityOrder[b.quality] || 0);
      });
      
      setShopGear(shopItems);
    } catch (error) {
      console.error('Ошибка при загрузке магазина:', error);
    }
  };

  const loadInventory = async () => {
    if (!characterId) return;
    try {
      const response = await fetch(`${API_URL}/fishing/inventory/${characterId}`);
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Ошибка при загрузке инвентаря:', error);
    }
  };

  const handleFish = async () => {
    if (!selectedLocation || !characterId) return;

    setIsFishing(true);
    try {
      const response = await fetch(`${API_URL}/fishing/catch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          location_id: selectedLocation,
          gear_ids: selectedGear
        })
      });

      const result = await response.json();
      if (result.success) {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            🎣 Поймана {result.fish.name}! Вес: {result.fish.weight} кг
          </Snackbar>
        );
        loadInventory();
      } else {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            {result.message || 'Рыба не клюёт...'}
          </Snackbar>
        );
      }
    } catch (error) {
      console.error('Ошибка при рыбалке:', error);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при рыбалке
        </Snackbar>
      );
    } finally {
      setTimeout(() => setIsFishing(false), 1500);
    }
  };

  const handleSell = async () => {
    if (inventory.length === 0 || !characterId) return;

    try {
      const fishIds = inventory.map(f => f.id);
      const response = await fetch(`${API_URL}/fishing/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          fish_ids: fishIds
        })
      });

      const result = await response.json();
      if (result.success) {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            💰 Продано за {result.credits.toLocaleString()} кредитов!
          </Snackbar>
        );
        setCredits(credits + result.credits);
        loadInventory();
      }
    } catch (error) {
      console.error('Ошибка при продаже:', error);
    }
  };

  const handleBuyGear = async (gearId: number, price: number) => {
    if (!characterId || credits < price) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Недостаточно кредитов
        </Snackbar>
      );
      return;
    }

    try {
      const response = await fetch(`${API_URL}/fishing/gear/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          gear_id: gearId
        })
      });

      const result = await response.json();
      if (result.success) {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            Снаряжение куплено!
          </Snackbar>
        );
        setCredits(credits - price);
        loadGear();
      }
    } catch (error) {
      console.error('Ошибка при покупке:', error);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      'Обычная': '#90a4ae',
      'Необычная': '#66bb6a',
      'Редкая': '#42a5f5',
      'Очень редкая': '#ab47bc',
      'Легендарная': '#ffa726'
    };
    return colors[rarity] || '#90a4ae';
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        🎣 Рыбалка
      </PanelHeader>

      <Group>
        <Div>
          <Text weight="2">💰 Кредиты: {credits.toLocaleString()} ₭</Text>
        </Div>
        {characters.length > 1 && (
          <Div>
            <Text weight="2">Персонаж:</Text>
            <NativeSelect
              value={selectedCharacter?.id || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const char = characters.find(c => c.id === parseInt(e.target.value));
                setSelectedCharacter(char);
              }}
            >
              {characters.map(char => (
                <option key={char.id} value={char.id}>
                  {char.character_name} - {char.currency.toLocaleString()} ₭
                </option>
              ))}
            </NativeSelect>
          </Div>
        )}
      </Group>

      <Tabs>
        <TabsItem selected={activeTab === 'game'} onClick={() => setActiveTab('game')}>
          Рыбачить
        </TabsItem>
        <TabsItem selected={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')}>
          Инвентарь ({inventory.length})
        </TabsItem>
        <TabsItem selected={activeTab === 'shop'} onClick={() => setActiveTab('shop')}>
          Магазин
        </TabsItem>
      </Tabs>

      {activeTab === 'game' && (
        <>
          <Group header={<Header>Выберите локацию</Header>}>
            {loading ? (
              <Div><Spinner size="m" /></Div>
            ) : (
              locations.map(location => (
                <Cell
                  key={location.id}
                  onClick={() => setSelectedLocation(location.id)}
                  before={selectedLocation === location.id ? '✅' : '🌊'}
                  subtitle={`${location.island} • ${location.water_type} • От ранга ${location.min_rank}`}
                  multiline
                >
                  {location.name}
                </Cell>
              ))
            )}
          </Group>

          {selectedLocation && (
            <>
              <Group header={<Header>Экипировка (опционально)</Header>}>
                <Div>
                  <Text weight="2">Удочки:</Text>
                  <NativeSelect
                    value={selectedGear[0] || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const gearId = parseInt(e.target.value);
                      setSelectedGear(gearId ? [gearId] : []);
                    }}
                  >
                    <option value="">Без удочки</option>
                    {gear.filter(g => g.type === 'Удочка').map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (+{(g.bonus_chance * 100).toFixed(0)}%) {g.quantity && g.quantity > 1 ? `[${g.quantity}]` : ''}
                      </option>
                    ))}
                  </NativeSelect>
                </Div>
                <Div>
                  <Text weight="2">Наживка:</Text>
                  <NativeSelect
                    value={selectedGear[1] || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const gearId = parseInt(e.target.value);
                      setSelectedGear(prev => {
                        const newGear = prev.filter(id => gear.find(g => g.id === id)?.type !== 'Наживка');
                        return gearId ? [...newGear, gearId] : newGear;
                      });
                    }}
                  >
                    <option value="">Без наживки</option>
                    {gear.filter(g => g.type === 'Наживка').map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (+{(g.bonus_rarity * 100).toFixed(0)}%) {g.quantity && g.quantity > 1 ? `[${g.quantity}]` : ''}
                      </option>
                    ))}
                  </NativeSelect>
                </Div>
              </Group>

              <Group>
                <Div>
                  <Button
                    size="l"
                    stretched
                    onClick={handleFish}
                    loading={isFishing}
                    disabled={isFishing}
                  >
                    {isFishing ? '🎣 Рыбачим...' : '🎣 Закинуть удочку'}
                  </Button>
                </Div>
              </Group>
            </>
          )}
        </>
      )}

      {activeTab === 'inventory' && (
        <Group header={<Header>Улов</Header>}>
          {inventory.length === 0 ? (
            <Div><Text>Инвентарь пуст</Text></Div>
          ) : (
            <>
              {inventory.map(fish => (
                <Cell
                  key={fish.id}
                  subtitle={`${fish.weight} кг • ${(fish.base_price * fish.weight).toLocaleString()} ₭ • ${fish.location_name}`}
                  before={
                    <Avatar size={48} style={{ background: getRarityColor(fish.rarity) }}>
                      🐟
                    </Avatar>
                  }
                  multiline
                >
                  {fish.name}
                </Cell>
              ))}
              <Div>
                <Button size="l" stretched mode="primary" onClick={handleSell}>
                  💰 Продать всё за {inventory.reduce((sum, f) => sum + f.base_price * f.weight, 0).toLocaleString()} ₭
                </Button>
              </Div>
            </>
          )}
        </Group>
      )}

      {activeTab === 'shop' && (
        <Group header={<Header>Магазин снаряжения</Header>}>
          {Object.entries(
            shopGear.reduce((acc: any, item: any) => {
              if (!acc[item.type]) acc[item.type] = [];
              acc[item.type].push(item);
              return acc;
            }, {})
          ).map(([type, items]: [string, any]) => (
            <Group key={type} header={<Header>{type}</Header>}>
              {items.map((item: any) => (
                <Cell
                  key={item.id}
                  subtitle={`${item.quality} • ${item.description}`}
                  after={
                    <Button size="s" onClick={() => handleBuyGear(item.id, item.price)}>
                      {item.price.toLocaleString()} ₭
                    </Button>
                  }
                  multiline
                >
                  {item.name}
                </Cell>
              ))}
            </Group>
          ))}
        </Group>
      )}

      {snackbar}
    </Panel>
  );
};

export default FishingPanel;

