import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  Button,
  Tabs,
  TabsItem,
  Div,
  Title,
  Text,
  Spinner,
  Snackbar,
  Card,
  SimpleCell,
  Avatar,
  NativeSelect,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  ButtonGroup,
  Checkbox,
  SegmentedControl
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import GroundHuntingMinigameV2 from '../components/GroundHuntingMinigameV2';
import AerialHuntingMinigameV2 from '../components/AerialHuntingMinigameV2';
import LocationSelector from '../components/LocationSelector';
import { Icon24DoneOutline, Icon24CancelOutline } from '@vkontakte/icons';

interface NavIdProps {
  id: string;
  fetchedUser?: any;
}

const HuntingPanelV2: React.FC<NavIdProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [activeTab, setActiveTab] = useState<'game' | 'gear' | 'catch' | 'shop'>('game');
  const [huntingType, setHuntingType] = useState<'ground' | 'aerial'>('ground');
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  
  // Gear state
  const [availableGear, setAvailableGear] = useState<any[]>([]);
  const [selectedGearIds, setSelectedGearIds] = useState<number[]>([]);
  const [selectedTraps, setSelectedTraps] = useState<any[]>([]);
  const [shopGear, setShopGear] = useState<any[]>([]);
  
  // Session state
  const [sessionData, setSessionData] = useState<any>(null);
  const [minigameActive, setMinigameActive] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  
  // Hunt stats and catch
  const [huntStats, setHuntStats] = useState<any>(null);
  const [huntInventory, setHuntInventory] = useState<any[]>([]);
  const [selectedPrey, setSelectedPrey] = useState<number[]>([]);

  useEffect(() => {
    loadCharacters();
  }, []);

  useEffect(() => {
    if (characterId) {
      loadGear();
      loadHuntStats();
      loadHuntInventory();
      loadShopGear();
    }
  }, [characterId]);

  const loadCharacters = async () => {
    if (!fetchedUser?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/my-anketas/${fetchedUser.id}`);
      const data = await response.json();
      
      const acceptedChars = data.filter((char: any) => 
        char.status === 'Принято' && 
        (char.life_status === 'Жив' || char.life_status === 'Жива')
      );
      
      if (acceptedChars.length > 0) {
        setCharacters(acceptedChars);
        const firstChar = acceptedChars[0];
        setSelectedCharacter(firstChar);
        setCharacterId(firstChar.id);
        setCredits(firstChar.currency || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки персонажей:', error);
      showSnackbar('Ошибка загрузки персонажей', false);
    }
    setLoading(false);
  };

  const loadGear = async () => {
    if (!characterId) return;
    
    try {
      const response = await fetch(`${API_URL}/hunting/gear/${characterId}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableGear(data.gear || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки снаряжения:', error);
    }
  };

  const loadHuntStats = async () => {
    if (!characterId) return;
    
    try {
      const response = await fetch(`${API_URL}/hunting/stats/${characterId}`);
      const data = await response.json();
      
      if (data.success) {
        setHuntStats(data.stats);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const loadHuntInventory = async () => {
    if (!characterId) return;
    
    try {
      const response = await fetch(`${API_URL}/hunting/inventory/${characterId}`);
      const data = await response.json();
      setHuntInventory(data || []);
    } catch (error) {
      console.error('Ошибка загрузки добычи:', error);
    }
  };

  const loadShopGear = async () => {
    try {
      const response = await fetch(`${API_URL}/hunting/gear`);
      const data = await response.json();
      setShopGear(data || []);
    } catch (error) {
      console.error('Ошибка загрузки магазина:', error);
    }
  };

  const handleBuyGear = async (gearId: number, price: number) => {
    if (!characterId || credits < price) {
      showSnackbar('Недостаточно кредитов', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/hunting/gear/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, gear_id: gearId })
      });

      const result = await response.json();
      if (result.success) {
        showSnackbar('Снаряжение куплено!', true);
        setCredits(credits - price);
        await loadGear();
        await loadShopGear();
      } else {
        showSnackbar(result.message || 'Ошибка покупки', false);
      }
    } catch (error) {
      console.error('Ошибка покупки:', error);
      showSnackbar('Ошибка сервера', false);
    }
  };

  const sellPrey = async (preyIds?: number[]) => {
    if (!characterId) return;

    const idsToSell = preyIds || huntInventory.map(p => p.id);
    if (idsToSell.length === 0) {
      showSnackbar('Нечего продавать', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/hunting/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, prey_ids: idsToSell })
      });

      const result = await response.json();
      if (result.success) {
        showSnackbar(`Продано за ${result.credits?.toLocaleString() || 0} кредитов!`, true);
        setCredits(prevCredits => prevCredits + (result.credits || 0));
        setSelectedPrey([]);
        await loadHuntInventory();
        await loadCharacters();
      } else {
        showSnackbar(result.message || 'Ошибка продажи', false);
      }
    } catch (error) {
      console.error('Ошибка продажи:', error);
      showSnackbar('Ошибка сервера', false);
    }
  };

  const togglePrey = (preyId: number) => {
    setSelectedPrey(prev => 
      prev.includes(preyId) 
        ? prev.filter(id => id !== preyId)
        : [...prev, preyId]
    );
  };

  const startHunting = async (locationId: number) => {
    if (!characterId) return;
    
    setLoading(true);
    try {
      const endpoint = huntingType === 'ground' 
        ? `${API_URL}/hunting/ground/start-v2`
        : `${API_URL}/hunting/aerial/start-v2`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          location_id: locationId,
          gear_ids: selectedGearIds,
          trap_ids: selectedTraps.map(t => t.id)
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessionData({ ...data, huntingType });
        setMinigameActive(true);
        setShowLocationSelector(false);
      } else {
        showSnackbar(data.message || 'Ошибка начала охоты', false);
      }
    } catch (error) {
      console.error('Ошибка начала охоты:', error);
      showSnackbar('Ошибка сервера', false);
    }
    setLoading(false);
  };

  const completeHunting = async (success: boolean, score: number, perfectHits: number, trapUsed: boolean = false) => {
    if (!characterId || !sessionData) return;
    
    setLoading(true);
    try {
      const endpoint = sessionData.huntingType === 'ground' 
        ? `${API_URL}/hunting/ground/complete-v2`
        : `${API_URL}/hunting/aerial/complete-v2`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          location_id: sessionData.location_id,
          gear_ids: sessionData.gear_ids,
          trap_ids: sessionData.trap_ids,
          success,
          minigame_score: score,
          perfect_hits: perfectHits,
          trap_used: trapUsed
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.catch) {
          showSnackbar(`Поймано: ${data.catch.species_name} (${data.catch.mutation_class})!`, true);
        }
        if (data.materials && data.materials.length > 0) {
          showSnackbar(`Получено материалов: ${data.materials.length}`, true);
        }
        
        // Обновляем данные
        await loadCharacters();
        await loadHuntStats();
      } else {
        showSnackbar(data.message || 'Охота не удалась', false);
      }
    } catch (error) {
      console.error('Ошибка завершения охоты:', error);
      showSnackbar('Ошибка сервера', false);
    }
    
    setMinigameActive(false);
    setSessionData(null);
    setLoading(false);
  };

  const toggleGear = (gearId: number) => {
    setSelectedGearIds(prev => 
      prev.includes(gearId) 
        ? prev.filter(id => id !== gearId)
        : [...prev, gearId]
    );
  };

  const showSnackbar = (message: string, success: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={
          <Avatar size={24} style={{ background: success ? 'var(--vkui--color_accent_green)' : 'var(--vkui--color_accent_red)' }}>
            {success ? <Icon24DoneOutline fill="#fff" /> : <Icon24CancelOutline fill="#fff" />}
          </Avatar>
        }
      >
        {message}
      </Snackbar>
    );
  };

  const getRankColor = (rank: string) => {
    const colors: { [key: string]: string } = {
      F: '#9E9E9E',
      E: '#8BC34A',
      D: '#03A9F4',
      C: '#9C27B0',
      B: '#FF9800',
      A: '#F44336',
      S: '#E91E63',
      SS: '#9C27B0',
      SSS: '#FFD700'
    };
    return colors[rank] || '#9E9E9E';
  };

  if (loading && !characterId) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
          🏹 Охота
        </PanelHeader>
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="l" />
        </Div>
      </Panel>
    );
  }

  if (!characterId) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
          🏹 Охота
        </PanelHeader>
        <Div>
          <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
            <Text>Создайте персонажа для начала охоты</Text>
            <Button size="l" mode="primary" onClick={() => routeNavigator.push('/anketa')} style={{ marginTop: 16 }}>
              Создать персонажа
            </Button>
          </Card>
        </Div>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        🏹 Охота V2
      </PanelHeader>

      {/* Character Info */}
      <Card mode="shadow" style={{ margin: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level="3">{selectedCharacter?.character_name}</Title>
            <Text style={{ color: 'var(--text_secondary)' }}>
              Ранг: <span style={{ color: getRankColor(selectedCharacter?.rank), fontWeight: 'bold' }}>{selectedCharacter?.rank}</span>
            </Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>💰 {credits.toLocaleString()}</Text>
            <Text style={{ color: 'var(--text_secondary)', fontSize: 12 }}>Кредиты</Text>
          </div>
        </div>

        {characters.length > 1 && (
          <NativeSelect
            value={characterId?.toString()}
            onChange={(e) => {
              const id = parseInt(e.target.value);
              const char = characters.find(c => c.id === id);
              setCharacterId(id);
              setSelectedCharacter(char);
              setCredits(char?.currency || 0);
            }}
            style={{ marginTop: 12 }}
          >
            {characters.map(char => (
              <option key={char.id} value={char.id}>
                {char.character_name} ({char.rank})
              </option>
            ))}
          </NativeSelect>
        )}
      </Card>

      {/* Hunting Type Selector */}
      <Div>
        <SegmentedControl
          value={huntingType}
          onChange={(value) => setHuntingType(value as 'ground' | 'aerial')}
          options={[
            { label: '🐗 Наземная', value: 'ground' },
            { label: '🦅 Воздушная', value: 'aerial' }
          ]}
        />
      </Div>

      {/* Quick Actions */}
      <Div>
        <ButtonGroup mode="horizontal" gap="m" stretched>
          <Button
            size="l"
            mode="primary"
            stretched
            onClick={() => setShowLocationSelector(true)}
            loading={loading}
          >
            🏹 Начать охоту
          </Button>
          <Button
            size="l"
            mode="secondary"
            stretched
            onClick={() => routeNavigator.push('/journal')}
          >
            📖 Журнал
          </Button>
          <Button
            size="l"
            mode="secondary"
            stretched
            onClick={() => routeNavigator.push('/crafting')}
          >
            🔨 Крафт
          </Button>
        </ButtonGroup>
      </Div>

      {/* Tabs */}
      <Tabs mode="default">
        <TabsItem selected={activeTab === 'game'} onClick={() => setActiveTab('game')}>
          Охота
        </TabsItem>
        <TabsItem selected={activeTab === 'gear'} onClick={() => setActiveTab('gear')}>
          Снаряжение
        </TabsItem>
        <TabsItem selected={activeTab === 'catch'} onClick={() => setActiveTab('catch')}>
          Добыча
        </TabsItem>
        <TabsItem selected={activeTab === 'shop'} onClick={() => setActiveTab('shop')}>
          Магазин
        </TabsItem>
      </Tabs>

      {/* Game Tab */}
      {activeTab === 'game' && (
        <Div>
          <Card mode="shadow" style={{ padding: 16, marginBottom: 12 }}>
            <Title level="2">
              {huntingType === 'ground' ? '🐗 Наземная охота' : '🦅 Воздушная охота'}
            </Title>
            <Text style={{ marginTop: 8, color: 'var(--text_secondary)' }}>
              {huntingType === 'ground' 
                ? 'Выслеживайте наземных существ. Используйте ловушки и тактику.'
                : 'Охотьтесь на летающих существ. Требуется точность и расчёт траектории.'}
            </Text>
          </Card>

          <Card mode="shadow" style={{ padding: 16 }}>
            <Title level="3">🎯 Особенности охоты</Title>
            <ul style={{ paddingLeft: 20, color: 'var(--text_secondary)' }}>
              <li>Разные типы добычи: Затронутые, Искажённые, Бестии</li>
              <li>Влияние Echo-зон на спавн мутаций</li>
              <li>Система ловушек и продвинутого оружия</li>
              <li>Сбор материалов зависит от качества охоты</li>
              <li>События миграции и редкие появления</li>
            </ul>
          </Card>
        </Div>
      )}

      {/* Gear Tab */}
      {activeTab === 'gear' && (
        <Div>
          <Card mode="shadow" style={{ padding: 16, marginBottom: 12 }}>
            <Title level="2">🏹 Снаряжение</Title>
            <Text style={{ color: 'var(--text_secondary)' }}>
              Выберите оружие, броню и ловушки для охоты.
            </Text>
          </Card>

          {availableGear.length === 0 ? (
            <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
              <Text>У вас пока нет снаряжения для охоты</Text>
              <Button size="m" mode="primary" onClick={() => routeNavigator.push('/market')} style={{ marginTop: 12 }}>
                Магазин
              </Button>
            </Card>
          ) : (
            <Group header={<Header>Доступное снаряжение</Header>}>
              {availableGear.map(gear => (
                <SimpleCell
                  key={gear.id}
                  before={
                    <Checkbox
                      checked={selectedGearIds.includes(gear.id)}
                      onChange={() => toggleGear(gear.id)}
                    />
                  }
                  subtitle={`${gear.description} • ${gear.gear_type}`}
                  after={
                    <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>
                      {gear.activity_type}
                    </Text>
                  }
                >
                  {gear.name}
                </SimpleCell>
              ))}
            </Group>
          )}
        </Div>
      )}

      {/* Catch Tab */}
      {activeTab === 'catch' && (
        <Div>
          <Card mode="shadow" style={{ padding: 16, marginBottom: 12 }}>
            <Title level="2">🎯 Добыча</Title>
            <Text style={{ color: 'var(--text_secondary)' }}>
              Всего добыто: {huntInventory.length}
            </Text>
          </Card>

          {huntInventory.length > 0 && (
            <Div>
              <ButtonGroup mode="horizontal" gap="m" stretched>
                <Button
                  size="m"
                  mode="primary"
                  stretched
                  onClick={() => sellPrey(selectedPrey)}
                  disabled={selectedPrey.length === 0}
                >
                  Продать выбранное ({selectedPrey.length})
                </Button>
                <Button
                  size="m"
                  mode="secondary"
                  stretched
                  onClick={() => sellPrey()}
                >
                  Продать всё
                </Button>
              </ButtonGroup>
            </Div>
          )}

          {huntInventory.length === 0 ? (
            <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
              <Text>Вы еще ничего не добыли</Text>
            </Card>
          ) : (
            <Group header={<Header>Последняя добыча</Header>}>
              {huntInventory.slice(0, 20).map((prey, index) => (
                <SimpleCell
                  key={index}
                  before={
                    <Checkbox
                      checked={selectedPrey.includes(prey.id)}
                      onChange={() => togglePrey(prey.id)}
                    />
                  }
                  subtitle={`${prey.location_name} • ${new Date(prey.hunted_at).toLocaleDateString()}`}
                  after={
                    <div style={{ textAlign: 'right' }}>
                      <Text style={{ fontWeight: 'bold' }}>💰 {prey.base_price?.toLocaleString()}</Text>
                      <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>{prey.rarity || 'Обычная'}</Text>
                    </div>
                  }
                  indicator={
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: 'var(--vkui--color_background_accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      🦌
                    </div>
                  }
                >
                  {prey.name}
                </SimpleCell>
              ))}
            </Group>
          )}
        </Div>
      )}

      {/* Shop Tab */}
      {activeTab === 'shop' && (
        <Div>
          <Card mode="shadow" style={{ padding: 16, marginBottom: 12 }}>
            <Title level="2">🏪 Магазин снаряжения</Title>
            <Text style={{ color: 'var(--text_secondary)' }}>
              Покупайте снаряжение для эффективной охоты
            </Text>
          </Card>

          {shopGear.length === 0 ? (
            <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
              <Spinner size="l" />
            </Card>
          ) : (
            <Group header={<Header>Доступное снаряжение</Header>}>
              {shopGear.map(gear => (
                <SimpleCell
                  key={gear.id}
                  subtitle={gear.description}
                  after={
                    <Button
                      size="s"
                      mode="primary"
                      onClick={() => handleBuyGear(gear.id, gear.price)}
                      disabled={credits < gear.price}
                    >
                      {gear.price.toLocaleString()} ₭
                    </Button>
                  }
                  before={
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: 'var(--vkui--color_background_tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      {gear.type === 'weapon' ? '🏹' : gear.type === 'trap' ? '🪤' : '📦'}
                    </div>
                  }
                  indicator={
                    <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>
                      {gear.quality}
                    </Text>
                  }
                >
                  {gear.name}
                </SimpleCell>
              ))}
            </Group>
          )}
        </Div>
      )}

      {/* Modals */}
      <ModalRoot
        activeModal={showLocationSelector ? 'location' : (minigameActive ? 'minigame' : null)}
        onClose={() => {
          setShowLocationSelector(false);
          setMinigameActive(false);
        }}
      >
        {/* Location Selector Modal */}
        <ModalPage
          id="location"
          onClose={() => setShowLocationSelector(false)}
          header={<ModalPageHeader>Выбор локации</ModalPageHeader>}
        >
          {characterId && (
            <LocationSelector
              activityType={huntingType === 'ground' ? 'hunting_ground' : 'hunting_aerial'}
              characterRank={selectedCharacter?.rank || 'F'}
              onSelectLocation={(locationId) => startHunting(locationId)}
              onCancel={() => setShowLocationSelector(false)}
            />
          )}
        </ModalPage>

        {/* Minigame Modal */}
        <ModalPage
          id="minigame"
          onClose={() => {
            setMinigameActive(false);
            setSessionData(null);
          }}
          header={<ModalPageHeader>Охота</ModalPageHeader>}
        >
          {sessionData && sessionData.huntingType === 'ground' && (
            <GroundHuntingMinigameV2
              difficulty={sessionData.difficulty}
              weatherConditions={sessionData.weatherConditions}
              echoZone={sessionData.echoZone}
              trapsAvailable={sessionData.traps || []}
              onComplete={completeHunting}
              onCancel={() => {
                setMinigameActive(false);
                setSessionData(null);
              }}
            />
          )}
          {sessionData && sessionData.huntingType === 'aerial' && (
            <AerialHuntingMinigameV2
              difficulty={sessionData.difficulty}
              windConditions={sessionData.windConditions}
              echoZone={sessionData.echoZone}
              onComplete={completeHunting}
              onCancel={() => {
                setMinigameActive(false);
                setSessionData(null);
              }}
            />
          )}
        </ModalPage>
      </ModalRoot>

      {snackbar}
    </Panel>
  );
};

export default HuntingPanelV2;

