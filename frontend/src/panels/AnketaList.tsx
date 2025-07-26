import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  CardGrid,
  Card,
  Header,
  Spinner,
  Div,
  PanelHeaderBack
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect } from 'react';
import { API_URL } from '../api';

interface Character {
  id: number;
  character_name: string;
  vk_id: number;
  status: string;
  rank: string;
  faction: string;
}

export const AnketaList: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch(`${API_URL}/characters`);
        const data = await response.json();
        setCharacters(data);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Реестр анкет
      </PanelHeader>
      {loading ? (
        <Spinner size="l" style={{ margin: '20px 0' }} />
      ) : (
        <Group>
          <CardGrid size="l">
            {characters.map((char) => (
              <Card key={char.id} onClick={() => routeNavigator.push(`/anketa/${char.id}`)}>
                <Header>{char.character_name}</Header>
                <Div>
                  <p>Статус: {char.status}</p>
                  <p>Ранг: {char.rank}</p>
                  <p>Фракция: {char.faction}</p>
                </Div>
              </Card>
            ))}
          </CardGrid>
        </Group>
      )}
    </Panel>
  );
};