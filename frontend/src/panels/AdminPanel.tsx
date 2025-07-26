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
  PanelHeaderBack,
  ButtonGroup,
  Link,
  Snackbar,
  Alert
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../api';
import { Icon24CheckCircleOutline, Icon24ErrorCircle } from '@vkontakte/icons';

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
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(null);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/characters`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
      routeNavigator.replace('admin_login');
      return;
    }
    fetchCharacters();
  }, [routeNavigator]);

  const handleLogout = () => {
    localStorage.removeItem('adminId');
    routeNavigator.replace('/');
  };

  const showResultSnackbar = (message: string, isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={isSuccess ? <Icon24CheckCircleOutline fill="var(--vkui--color_icon_positive)" /> : <Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
      >
        {message}
      </Snackbar>
    );
  };
  
  const handleStatusChange = async (characterId: number, status: 'Принято' | 'Отклонено') => {
    const adminId = localStorage.getItem('adminId');
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId || ''
        },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        showResultSnackbar(`Статус анкеты #${characterId} обновлен на "${status}"`, true);
        fetchCharacters(); // Refresh the list
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Не удалось обновить статус');
      }
    } catch (error) {
       const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
       showResultSnackbar(message, false);
    }
  };

  const handleDelete = async (characterId: number) => {
     setPopout(
      <Alert
        actions={[
          {
            title: 'Отмена',
            mode: 'cancel',
          },
          {
            title: 'Удалить',
            mode: 'destructive',
            action: async () => {
              const adminId = localStorage.getItem('adminId');
               try {
                  const response = await fetch(`${API_URL}/characters/${characterId}`, {
                    method: 'DELETE',
                    headers: { 'x-admin-id': adminId || '' }
                  });
                  if (response.ok) {
                    showResultSnackbar(`Анкета #${characterId} удалена`, true);
                    fetchCharacters();
                  } else {
                    const result = await response.json();
                    throw new Error(result.error || 'Не удалось удалить анкету');
                  }
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
                  showResultSnackbar(message, false);
                }
            },
          },
        ]}
        actionsLayout="vertical"
        onClose={() => setPopout(null)}
      >
        <p>Подтверждение удаления</p>
        <p>{`Вы уверены, что хотите удалить анкету ID ${characterId}? Это действие необратимо.`}</p>
      </Alert>
    );
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
              <Card key={char.id}>
                <Header>{char.character_name}</Header>
                <Div>
                  <p><b>Статус:</b> {char.status}</p>
                  <p><b>Ранг:</b> {char.rank}</p>
                  <p><b>Фракция:</b> {char.faction}</p>
                  <p><b>Автор:</b> <Link href={`https://vk.com/id${char.vk_id}`} target="_blank">{`ID: ${char.vk_id}`}</Link></p>
                </Div>
                 <ButtonGroup mode="horizontal" gap="m" stretched style={{ padding: '0 16px 16px' }}>
                   {char.status === 'на рассмотрении' && (
                     <>
                        <Button size="m" appearance="positive" onClick={() => handleStatusChange(char.id, 'Принято')}>
                          Принять
                        </Button>
                        <Button size="m" appearance="negative" onClick={() => handleStatusChange(char.id, 'Отклонено')}>
                          Отклонить
                        </Button>
                     </>
                   )}
                  <Button size="m" onClick={() => routeNavigator.push(`/anketa_detail/${char.id}`)}>
                    Открыть
                  </Button>
                  <Button size="m" appearance="negative" onClick={() => handleDelete(char.id)}>
                    Удалить
                  </Button>
                </ButtonGroup>
              </Card>
            ))}
          </CardGrid>
        </Group>
      )}
      {snackbar}
      {popout}
    </Panel>
  );
};