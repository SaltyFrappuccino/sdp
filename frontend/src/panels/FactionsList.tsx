import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Header,
  Group,
  SimpleCell,
  Search,
  PanelHeaderBack,
  ScreenSpinner,
  Button,
  Div,
  NavIdProps,
} from '@vkontakte/vkui';
import { API_URL } from '../api';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

interface Faction {
  id: number;
  name: string;
  description: string;
}

export const FactionsList: React.FC<NavIdProps> = ({ id }) => {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const routeNavigator = useRouteNavigator();

  useEffect(() => {
    const fetchFactions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/factions`);
        const fetchedFactions = await response.json();
        setFactions(fetchedFactions);
      } catch (error) {
        console.error('Error fetching factions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFactions();
  }, []);

  const filteredFactions = factions.filter(faction =>
    faction.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Реестр фракций
      </PanelHeader>
      
      <Group>
        <Div>
          <Button stretched size="l" mode="primary" onClick={() => routeNavigator.push('factions_create')}>
            Создать свою фракцию
          </Button>
        </Div>
      </Group>

      <Group>
        <Search value={search} onChange={(e) => setSearch(e.target.value)} />
      </Group>

      {loading ? <ScreenSpinner /> : (
        <Group header={<Header>Доступные фракции</Header>}>
          {filteredFactions.map(faction => (
            <SimpleCell key={faction.id} subtitle={faction.description}>
              {faction.name}
            </SimpleCell>
          ))}
        </Group>
      )}
    </Panel>
  );
};
