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
  Checkbox,
  NativeSelect,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  Card,
  ButtonGroup
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import TerrestrialHuntingMinigame from '../components/TerrestrialHuntingMinigame';
import AerialHuntingMinigame from '../components/AerialHuntingMinigame';

interface NavIdProps {
  id: string;
  fetchedUser?: any;
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
  quantity?: number;
  is_consumable?: boolean;
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

const HuntingPanel: React.FC<NavIdProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [activeTab, setActiveTab] = useState<'game' | 'inventory' | 'shop'>('game');
  const [locations, setLocations] = useState<HuntingLocation[]>([]);
  const [gear, setGear] = useState<HuntingGear[]>([]);
  const [shopGear, setShopGear] = useState<HuntingGear[]>([]);
  const [inventory, setInventory] = useState<Hunt[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedGear, setSelectedGear] = useState<number[]>([]);
  const [huntType, setHuntType] = useState<'aerial' | 'terrestrial'>('terrestrial');
  const [loading, setLoading] = useState(false);
  const [isHunting, setIsHunting] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [huntModal, setHuntModal] = useState<{ show: boolean; creature?: any; loot?: any[]; credits?: number }>({ show: false });
  const [minigameModal, setMinigameModal] = useState<{ 
    show: boolean; 
    difficulty?: number;
    qualityModifier?: number;
    rarityBonus?: number;
    huntType?: string;
    location_id?: number;
    character_id?: number;
    gear_ids?: number[];
  }>({ show: false });

  useEffect(() => {
    loadCharacters();
    loadLocations();
    loadShopGear(); // Загружаем магазин при инициализации
  }, []);

  useEffect(() => {
    loadGear();
    loadShopGear();
    setSelectedGear([]); // Сбрасываем выбранное снаряжение при смене типа охоты
  }, [huntType, characterId]);

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
    if (!characterId) return;
    try {
      const response = await fetch(`${API_URL}/hunting/gear/${characterId}`);
      const data = await response.json();
      // Фильтруем снаряжение по типу охоты
      const filteredGear = data.filter((item: any) => {
        if (huntType === 'aerial') {
          return item.type === 'Оружие' || item.type === 'Броня' || item.type === 'Воздушная ловушка';
        } else {
          return item.type === 'Оружие' || item.type === 'Броня' || item.type === 'Наземная ловушка';
        }
      });
      setGear(filteredGear);
    } catch (error) {
      console.error('Ошибка при загрузке снаряжения:', error);
    }
  };

  const loadShopGear = async () => {
    try {
      const response = await fetch(`${API_URL}/hunting/gear`);
      const data = await response.json();
      
      // Показываем только покупаемое снаряжение (не базовое) и фильтруем по типу охоты
      const shopItems = data.filter((item: any) => {
        if (item.is_basic) return false;
        if (huntType === 'aerial') {
          return item.type === 'Оружие' || item.type === 'Броня' || item.type === 'Воздушная ловушка';
        } else {
          return item.type === 'Оружие' || item.type === 'Броня' || item.type === 'Наземная ловушка';
        }
      });
      
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
      // Запускаем охоту и получаем параметры мини-игры
      const response = await fetch(`${API_URL}/hunting/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          location_id: selectedLocation,
          gear_ids: selectedGear,
          hunt_type: huntType
        })
      });

      const result = await response.json();
      if (result.success) {
        setMinigameModal({ 
          show: true, 
          difficulty: result.difficulty,
          qualityModifier: result.qualityModifier,
          rarityBonus: result.rarityBonus,
          huntType: result.hunt_type,
          location_id: result.location_id,
          character_id: result.character_id,
          gear_ids: result.gear_ids
        });
      } else {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            {result.message || 'Ошибка при начале охоты'}
          </Snackbar>
        );
      }
    } catch (error) {
      console.error('Ошибка при начале охоты:', error);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при начале охоты
        </Snackbar>
      );
    } finally {
      setIsHunting(false);
    }
  };

  const handleMinigameComplete = async (success: boolean) => {
    const gameData = minigameModal;
    setMinigameModal({ show: false });
    
    if (!success) {
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Добыча ускользнула!
        </Snackbar>
      );
      return;
    }

    setIsHunting(true);
    try {
      // Завершаем охоту и сохраняем результат
      const response = await fetch(`${API_URL}/hunting/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: gameData.character_id,
          location_id: gameData.location_id,
          gear_ids: gameData.gear_ids,
          hunt_type: gameData.huntType,
          success: true,
          qualityModifier: gameData.qualityModifier,
          rarityBonus: gameData.rarityBonus
        })
      });

      const result = await response.json();
      if (result.success) {
        setHuntModal({ 
          show: true, 
          creature: result.creature, 
          loot: result.loot
        });
        loadInventory();
        loadGear(); // Обновляем снаряжение (ловушки расходуются)
      } else {
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            {result.message || 'Зверь ушёл...'}
          </Snackbar>
        );
      }
    } catch (error) {
      console.error('Ошибка при завершении охоты:', error);
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
        loadGear();
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
          <Group header={<Header>Тип охоты</Header>}>
            <Div>
              <Text weight="2" style={{ marginBottom: '8px' }}>Выберите тип охоты:</Text>
              <ButtonGroup mode="horizontal" stretched>
                <Button
                  mode={huntType === 'terrestrial' ? 'primary' : 'secondary'}
                  onClick={() => setHuntType('terrestrial')}
                  stretched
                >
                  🐺 Наземная охота
                </Button>
                <Button
                  mode={huntType === 'aerial' ? 'primary' : 'secondary'}
                  onClick={() => setHuntType('aerial')}
                  stretched
                >
                  🦅 Воздушная охота
                </Button>
              </ButtonGroup>
            </Div>
          </Group>

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
              <Group header={<Header>Снаряжение{selectedGear.length > 0 && ` (+${Math.round((selectedGear.reduce((sum, id) => {
                const g = gear.find(g => g.id === id);
                return sum + (g?.bonus_success || 0) + (g?.bonus_damage || 0) + (g?.bonus_defense || 0);
              }, 0)) * 100)}% бонус)`}</Header>}>
                <Div>
                  <Text weight="2">Оружие:</Text>
                  <NativeSelect
                    value={selectedGear[0] || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const gearId = parseInt(e.target.value);
                      setSelectedGear(gearId ? [gearId] : []);
                    }}
                  >
                    <option value="">Без оружия</option>
                    {gear.filter(g => g.type === 'Оружие').map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (+{(g.bonus_success * 100).toFixed(0)}%) {g.quantity && g.quantity > 1 ? `[${g.quantity}]` : ''}
                      </option>
                    ))}
                  </NativeSelect>
                </Div>
                <Div>
                  <Text weight="2">Броня: {!selectedGear[0] && <Text style={{ color: 'var(--text_secondary)', fontSize: '12px' }}>(сначала выберите оружие)</Text>}</Text>
                  <NativeSelect
                    value={selectedGear[1] || ''}
                    disabled={!selectedGear[0]}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const gearId = parseInt(e.target.value);
                      setSelectedGear(prev => {
                        const newGear = prev.filter(id => gear.find(g => g.id === id)?.type !== 'Броня');
                        // Если убираем броню, убираем и ловушку
                        if (!gearId) {
                          return newGear.filter(id => {
                            const g = gear.find(g => g.id === id);
                            return g?.type !== 'Наземная ловушка' && g?.type !== 'Воздушная ловушка';
                          });
                        }
                        return gearId ? [...newGear, gearId] : newGear;
                      });
                    }}
                  >
                    <option value="">Без брони</option>
                    {gear.filter(g => g.type === 'Броня').map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (+{(g.bonus_defense * 100).toFixed(0)}%) {g.quantity && g.quantity > 1 ? `[${g.quantity}]` : ''}
                      </option>
                    ))}
                  </NativeSelect>
                </Div>
                <Div>
                  <Text weight="2">{huntType === 'aerial' ? 'Воздушная ловушка:' : 'Наземная ловушка:'} {!selectedGear[1] && <Text style={{ color: 'var(--text_secondary)', fontSize: '12px' }}>(сначала выберите броню)</Text>}</Text>
                  <NativeSelect
                    value={selectedGear[2] || ''}
                    disabled={!selectedGear[1]}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const gearId = parseInt(e.target.value);
                      setSelectedGear(prev => {
                        const trapType = huntType === 'aerial' ? 'Воздушная ловушка' : 'Наземная ловушка';
                        const newGear = prev.filter(id => gear.find(g => g.id === id)?.type !== trapType);
                        return gearId ? [...newGear, gearId] : newGear;
                      });
                    }}
                  >
                    <option value="">Без ловушки</option>
                    {gear.filter(g => g.type === (huntType === 'aerial' ? 'Воздушная ловушка' : 'Наземная ловушка')).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (+{(g.bonus_success * 100).toFixed(0)}%) {g.quantity && g.quantity > 1 ? `[${g.quantity}]` : ''}
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
                  subtitle={`Ранг ${hunt.danger_rank} • ${hunt.credit_value_min}-${hunt.credit_value_max} ₭ • ${hunt.location_name}`}
                  before={
                    <Avatar size={48} style={{ background: getRankColor(hunt.danger_rank) }}>
                      🦌
                    </Avatar>
                  }
                  after={
                    <Button 
                      size="s" 
                      mode="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch(`${API_URL}/hunting/sell`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              character_id: characterId,
                              hunt_ids: [hunt.id]
                            })
                          });
                          const result = await response.json();
                          if (result.success) {
                            setSnackbar(
                              <Snackbar onClose={() => setSnackbar(null)}>
                                💰 Продано за {result.credits.toLocaleString()} ₭
                              </Snackbar>
                            );
                            setCredits(credits + result.credits);
                            loadInventory();
                          }
                        } catch (error) {
                          console.error('Ошибка при продаже:', error);
                        }
                      }}
                    >
                      💰 Продать
                    </Button>
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
          {Object.entries(
            shopGear.reduce((acc: any, item: any) => {
              if (!acc[item.type]) acc[item.type] = [];
              acc[item.type].push(item);
              return acc;
            }, {})
          ).map(([type, items]: [string, any]) => (
            <Group key={type} header={<Header>{type}</Header>}>
              {items.map((item: any) => {
                const ownedGear = gear.find(g => g.id === item.id);
                const isOwned = !!ownedGear;
                const isConsumable = item.is_consumable;
                
                return (
                  <Cell
                    key={item.id}
                    subtitle={`${item.quality} • ${item.description}`}
                    after={
                      isOwned && !isConsumable ? (
                        <Button size="s" mode="secondary" disabled>
                          Присутствует
                        </Button>
                      ) : (
                        <Button 
                          size="s" 
                          onClick={() => handleBuyGear(item.id, item.price)}
                          disabled={credits < item.price}
                        >
                          {item.price.toLocaleString()} ₭
                        </Button>
                      )
                    }
                    multiline
                  >
                    {item.name}
                  </Cell>
                );
              })}
            </Group>
          ))}
        </Group>
      )}

      {snackbar}
      
      {minigameModal.show && (
        <ModalRoot activeModal="minigame">
          <ModalPage
            id="minigame"
            onClose={() => setMinigameModal({ show: false })}
            header={
              <ModalPageHeader>
                {minigameModal.huntType === 'aerial' ? '🦅 Воздушная охота' : '🏹 Наземная охота'}
              </ModalPageHeader>
            }
          >
            <Group>
              {minigameModal.huntType === 'aerial' ? (
                <AerialHuntingMinigame
                  difficulty={minigameModal.difficulty || 1.0}
                  onComplete={handleMinigameComplete}
                  onCancel={() => setMinigameModal({ show: false })}
                />
              ) : (
                <TerrestrialHuntingMinigame
                  difficulty={minigameModal.difficulty || 1.0}
                  onComplete={handleMinigameComplete}
                  onCancel={() => setMinigameModal({ show: false })}
                />
              )}
            </Group>
          </ModalPage>
        </ModalRoot>
      )}

      {huntModal.show && (
        <ModalRoot activeModal="hunt">
          <ModalPage
            id="hunt"
            onClose={() => setHuntModal({ show: false })}
            header={
              <ModalPageHeader>
                🏹 Добыча!
              </ModalPageHeader>
            }
          >
            <Group>
              <Card>
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🦌</div>
                  <Title level="2" style={{ marginBottom: '8px' }}>
                    {huntModal.creature?.name}
                  </Title>
                  <Text weight="2" style={{ marginBottom: '8px' }}>
                    Ранг опасности: {huntModal.creature?.danger_rank}
                  </Text>
                  {huntModal.credits && (
                    <Text weight="2" style={{ marginBottom: '8px', color: 'var(--accent)' }}>
                      +{huntModal.credits.toLocaleString()} ₭
                    </Text>
                  )}
                  {huntModal.loot && huntModal.loot.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <Text weight="2" style={{ marginBottom: '8px' }}>Добыча:</Text>
                      {huntModal.loot.map((item: any, index: number) => (
                        <Text key={index} style={{ display: 'block', color: 'var(--text_secondary)' }}>
                          • {item}
                        </Text>
                      ))}
                    </div>
                  )}
                  <Button 
                    size="l" 
                    mode="primary" 
                    onClick={() => setHuntModal({ show: false })}
                    stretched
                  >
                    Отлично!
                  </Button>
                </div>
              </Card>
            </Group>
          </ModalPage>
        </ModalRoot>
      )}
    </Panel>
  );
};

export default HuntingPanel;

