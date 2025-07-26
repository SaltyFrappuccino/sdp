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
  Button,
  PanelHeaderBack
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect } from 'react';

interface Character {
  id: number;
  character_name: string;
  vk_id: number;
  status: string;
  rank: string;
  faction: string;
}

export const AdminPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      routeNavigator.replace('admin_login');
      return;
    }

    const fetchCharacters = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL;
        const response = await fetch(`${apiUrl}/characters`);
        const data = await response.json();
        setCharacters(data);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, [routeNavigator]);

  const handleLogout = () => {
    localStorage.removeItem('adminId');
    routeNavigator.replace('/');
  };

  return (
    <Panel id={id}>
      <PanelHeader
        before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}
        after={<Button onClick={handleLogout}>Выйти</Button>}
      >
        Админ-панель
      </PanelHeader>
      {loading ? (
        <Spinner size="l" style={{ margin: '20px 0' }} />
      ) : (
        <Group>
          <Header>Реестр анкет</Header>
          <CardGrid size="l">
            {characters.map((char) => (
              <Card key={char.id} onClick={() => routeNavigator.push(`/anketa_detail/${char.id}`)}>
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