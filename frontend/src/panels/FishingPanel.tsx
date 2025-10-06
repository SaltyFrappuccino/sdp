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
  Checkbox
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
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

const FishingPanel: React.FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [activeTab, setActiveTab] = useState<'game' | 'inventory' | 'shop'>('game');
  const [locations, setLocations] = useState<FishingLocation[]>([]);
  const [gear, setGear] = useState<FishingGear[]>([]);
  const [inventory, setInventory] = useState<Fish[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedGear, setSelectedGear] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFishing, setIsFishing] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    loadCharacter();
    loadLocations();
    loadGear();
  }, []);

  useEffect(() => {
    if (characterId) {
      loadInventory();
    }
  }, [characterId, activeTab]);

  const loadCharacter = async () => {
    try {
      const vkUserInfo = await (window as any).bridge.send('VKWebAppGetUserInfo');
      const response = await fetch(`${API_URL}/characters/user/${vkUserInfo.id}`);
      const characters = await response.json();
      if (characters.length > 0) {
        setCharacterId(characters[0].id);
        setCredits(characters[0].currency);
      }
    } catch (error) {
      console.error('Ошибка при загрузке персонажа:', error);
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
    try {
      const response = await fetch(`${API_URL}/fishing/gear`);
      const data = await response.json();
      setGear(data);
    } catch (error) {
      console.error('Ошибка при загрузке снаряжения:', error);
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
        loadCharacter();
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
          <Text weight="2">💰 Кредиты: {credits.toLocaleString()}</Text>
        </Div>
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
                {gear.filter(g => g.type === 'Удочка').slice(0, 3).map(g => (
                  <Checkbox
                    key={g.id}
                    checked={selectedGear.includes(g.id)}
                    onChange={() => {
                      setSelectedGear(prev =>
                        prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                      );
                    }}
                  >
                    {g.name} (+{(g.bonus_chance * 100).toFixed(0)}%)
                  </Checkbox>
                ))}
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
                  subtitle={`${fish.weight} кг • ${(fish.base_price * fish.weight).toLocaleString()} ₽ • ${fish.location_name}`}
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
                  💰 Продать всё за {inventory.reduce((sum, f) => sum + f.base_price * f.weight, 0).toLocaleString()} ₽
                </Button>
              </Div>
            </>
          )}
        </Group>
      )}

      {activeTab === 'shop' && (
        <Group header={<Header>Магазин снаряжения</Header>}>
          {gear.map(item => (
            <Cell
              key={item.id}
              subtitle={`${item.quality} • ${item.description}`}
              after={
                <Button size="s" onClick={() => handleBuyGear(item.id, item.price)}>
                  {item.price.toLocaleString()} ₽
                </Button>
              }
              multiline
            >
              {item.name}
            </Cell>
          ))}
        </Group>
      )}

      {snackbar}
    </Panel>
  );
};

export default FishingPanel;

