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
  Avatar,
  Checkbox
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface HuntingLocation {
  id: number;
  name: string;
  island: string;
  terrain_type: string;
  min_rank: string;
  description: string;
}

interface HuntingGear {
  id: number;
  name: string;
  type: string;
  quality: string;
  price: number;
  bonus_damage: number;
  bonus_defense: number;
  bonus_success: number;
  description: string;
  min_rank: string;
}

interface Hunt {
  id: number;
  name: string;
  danger_rank: string;
  loot_items: string;
  credit_value_min: number;
  credit_value_max: number;
  location_name: string;
  hunted_at: string;
}

const HuntingPanel: React.FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [activeTab, setActiveTab] = useState<'game' | 'inventory' | 'shop'>('game');
  const [locations, setLocations] = useState<HuntingLocation[]>([]);
  const [gear, setGear] = useState<HuntingGear[]>([]);
  const [inventory, setInventory] = useState<Hunt[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedGear, setSelectedGear] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHunting, setIsHunting] = useState(false);
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
      const response = await fetch(`${API_URL}/hunting/locations`);
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
      const response = await fetch(`${API_URL}/hunting/gear`);
      const data = await response.json();
      setGear(data);
    } catch (error) {
      console.error('Ошибка при загрузке снаряжения:', error);
    }
  };

  const loadInventory = async () => {
    if (!characterId) return;
    try {
      const response = await fetch(`${API_URL}/hunting/inventory/${characterId}`);
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Ошибка при загрузке инвентаря:', error);
    }
  };

  const handleHunt = async () => {
    if (!selectedLocation || !characterId) return;

    setIsHunting(true);
    try {
      const response = await fetch(`${API_URL}/hunting/hunt`, {
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
            🏹 Добыча: {result.creature.name} (Ранг {result.creature.danger_rank})!
          </Snackbar>
        );
        loadInventory();
      } else {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            {result.message || 'Зверь ушёл...'}
          </Snackbar>
        );
      }
    } catch (error) {
      console.error('Ошибка при охоте:', error);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при охоте
        </Snackbar>
      );
    } finally {
      setTimeout(() => setIsHunting(false), 1500);
    }
  };

  const handleSell = async () => {
    if (inventory.length === 0 || !characterId) return;

    try {
      const huntIds = inventory.map(h => h.id);
      const response = await fetch(`${API_URL}/hunting/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          hunt_ids: huntIds
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
      const response = await fetch(`${API_URL}/hunting/gear/buy`, {
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

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      'F': '#90a4ae',
      'E': '#66bb6a',
      'D': '#42a5f5',
      'C': '#ab47bc',
      'B': '#ffa726',
      'A': '#ef5350',
      'S': '#d32f2f',
      'SS': '#b71c1c',
      'SSS': '#880e4f'
    };
    return colors[rank] || '#90a4ae';
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        🏹 Охота
      </PanelHeader>

      <Group>
        <Div>
          <Text weight="2">💰 Кредиты: {credits.toLocaleString()}</Text>
        </Div>
      </Group>

      <Tabs>
        <TabsItem selected={activeTab === 'game'} onClick={() => setActiveTab('game')}>
          Охотиться
        </TabsItem>
        <TabsItem selected={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')}>
          Добыча ({inventory.length})
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
                  before={selectedLocation === location.id ? '✅' : '🌲'}
                  subtitle={`${location.island} • ${location.terrain_type} • От ранга ${location.min_rank}`}
                  multiline
                >
                  {location.name}
                </Cell>
              ))
            )}
          </Group>

          {selectedLocation && (
            <>
              <Group header={<Header>Снаряжение (опционально)</Header>}>
                {gear.filter(g => g.type === 'Оружие').slice(0, 3).map(g => (
                  <Checkbox
                    key={g.id}
                    checked={selectedGear.includes(g.id)}
                    onChange={() => {
                      setSelectedGear(prev =>
                        prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                      );
                    }}
                  >
                    {g.name} (+{(g.bonus_success * 100).toFixed(0)}%)
                  </Checkbox>
                ))}
              </Group>

              <Group>
                <Div>
                  <Button
                    size="l"
                    stretched
                    onClick={handleHunt}
                    loading={isHunting}
                    disabled={isHunting}
                  >
                    {isHunting ? '🏹 Выслеживаем...' : '🏹 Начать охоту'}
                  </Button>
                </Div>
              </Group>
            </>
          )}
        </>
      )}

      {activeTab === 'inventory' && (
        <Group header={<Header>Добыча</Header>}>
          {inventory.length === 0 ? (
            <Div><Text>Инвентарь пуст</Text></Div>
          ) : (
            <>
              {inventory.map(hunt => (
                <Cell
                  key={hunt.id}
                  subtitle={`Ранг ${hunt.danger_rank} • ${hunt.credit_value_min}-${hunt.credit_value_max} ₽ • ${hunt.location_name}`}
                  before={
                    <Avatar size={48} style={{ background: getRankColor(hunt.danger_rank) }}>
                      🦌
                    </Avatar>
                  }
                  multiline
                >
                  {hunt.name}
                </Cell>
              ))}
              <Div>
                <Button size="l" stretched mode="primary" onClick={handleSell}>
                  💰 Продать всю добычу
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
              subtitle={`${item.type} • ${item.quality} • ${item.description}`}
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

export default HuntingPanel;

