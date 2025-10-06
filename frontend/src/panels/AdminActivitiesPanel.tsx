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
  FormItem,
  Input,
  Textarea,
  NativeSelect,
  Spinner,
  Snackbar,
  Text
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

const AdminActivitiesPanel: React.FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [activeTab, setActiveTab] = useState<'fishing' | 'hunting'>('fishing');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);

  // Fishing states
  const [fishingLocations, setFishingLocations] = useState<any[]>([]);
  const [fishSpecies, setFishSpecies] = useState<any[]>([]);
  const [fishingGear, setFishingGear] = useState<any[]>([]);

  // Hunting states
  const [huntingLocations, setHuntingLocations] = useState<any[]>([]);
  const [huntingGear, setHuntingGear] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'fishing') {
      loadFishingData();
    } else {
      loadHuntingData();
    }
  }, [activeTab]);

  const loadFishingData = async () => {
    setLoading(true);
    try {
      const [locations, species, gear] = await Promise.all([
        fetch(`${API_URL}/fishing/locations`).then(r => r.json()),
        fetch(`${API_URL}/fishing/gear`).then(r => r.json()),
        fetch(`${API_URL}/fishing/gear`).then(r => r.json())
      ]);
      setFishingLocations(locations);
      setFishingGear(gear);
    } catch (error) {
      console.error('Ошибка при загрузке данных рыбалки:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHuntingData = async () => {
    setLoading(true);
    try {
      const [locations, gear] = await Promise.all([
        fetch(`${API_URL}/hunting/locations`).then(r => r.json()),
        fetch(`${API_URL}/hunting/gear`).then(r => r.json())
      ]);
      setHuntingLocations(locations);
      setHuntingGear(gear);
    } catch (error) {
      console.error('Ошибка при загрузке данных охоты:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.replace('/admin_panel')} />}>
        🎮 Управление активностями
      </PanelHeader>

      <Tabs>
        <TabsItem selected={activeTab === 'fishing'} onClick={() => setActiveTab('fishing')}>
          🎣 Рыбалка
        </TabsItem>
        <TabsItem selected={activeTab === 'hunting'} onClick={() => setActiveTab('hunting')}>
          🏹 Охота
        </TabsItem>
      </Tabs>

      {loading ? (
        <Div><Spinner size="m" /></Div>
      ) : (
        <>
          {activeTab === 'fishing' && (
            <>
              <Group header={<Header>Локации рыбалки</Header>}>
                <Div>
                  <Text>Всего локаций: {fishingLocations.length}</Text>
                  {fishingLocations.map(loc => (
                    <Cell key={loc.id} subtitle={`${loc.island} • ${loc.water_type}`}>
                      {loc.name}
                    </Cell>
                  ))}
                </Div>
              </Group>

              <Group header={<Header>Снаряжение</Header>}>
                <Div>
                  <Text>Всего предметов: {fishingGear.length}</Text>
                  {fishingGear.slice(0, 5).map(g => (
                    <Cell key={g.id} subtitle={`${g.type} • ${g.quality} • ${g.price} ₭`}>
                      {g.name}
                    </Cell>
                  ))}
                </Div>
              </Group>
            </>
          )}

          {activeTab === 'hunting' && (
            <>
              <Group header={<Header>Локации охоты</Header>}>
                <Div>
                  <Text>Всего локаций: {huntingLocations.length}</Text>
                  {huntingLocations.map(loc => (
                    <Cell key={loc.id} subtitle={`${loc.island} • ${loc.terrain_type}`}>
                      {loc.name}
                    </Cell>
                  ))}
                </Div>
              </Group>

              <Group header={<Header>Снаряжение</Header>}>
                <Div>
                  <Text>Всего предметов: {huntingGear.length}</Text>
                  {huntingGear.slice(0, 5).map(g => (
                    <Cell key={g.id} subtitle={`${g.type} • ${g.quality} • ${g.price} ₭`}>
                      {g.name}
                    </Cell>
                  ))}
                </Div>
              </Group>
            </>
          )}
        </>
      )}

      <Group>
        <Div>
          <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
            💡 Данные берутся из базы. Для полного управления используйте SQL-запросы в базе данных.
          </Text>
        </Div>
      </Group>

      {snackbar}
    </Panel>
  );
};

export default AdminActivitiesPanel;

