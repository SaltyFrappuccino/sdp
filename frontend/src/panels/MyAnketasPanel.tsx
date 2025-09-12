import { FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  Spinner,
  Div,
  PanelHeaderBack,
  SimpleCell,
  Button,
  ButtonGroup,
  Header,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { UserInfo } from '@vkontakte/vk-bridge';

interface Anketa {
  id: number;
  character_name: string;
  status: string;
}

interface MyAnketasPanelProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const MyAnketasPanel: FC<MyAnketasPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [anketas, setAnketas] = useState<Anketa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fetchedUser) {
      fetch(`${API_URL}/my-anketas/${fetchedUser.id}`)
        .then(res => res.json())
        .then(data => {
          setAnketas(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch my anketas:', error);
          setLoading(false);
        });
    }
  }, [fetchedUser]);

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Мои анкеты</PanelHeader>
        <Spinner size="l" style={{ margin: '20px 0' }} />
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>Мои анкеты</PanelHeader>
      <Group header={<Header>Список ваших анкет</Header>}>
        {anketas.length > 0 ? (
          anketas.map(anketa => (
            <SimpleCell
              key={anketa.id}
              after={
                <ButtonGroup>
                  <Button size="s" onClick={() => routeNavigator.push(`/anketa_detail/${anketa.id}`)}>
                    Просмотр
                  </Button>
                  <Button size="s" mode="secondary" onClick={() => routeNavigator.push(`/anketa-editor/${anketa.id}`)}>
                    Редактировать
                  </Button>
                </ButtonGroup>
              }
              subtitle={`Статус: ${anketa.status}`}
            >
              {anketa.character_name}
            </SimpleCell>
          ))
        ) : (
          <Div>У вас пока нет анкет.</Div>
        )}
      </Group>
    </Panel>
  );
};