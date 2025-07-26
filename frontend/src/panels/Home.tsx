import { FC } from 'react';
import {
  Panel,
  PanelHeader,
  Header,
  Button,
  Group,
  Cell,
  Div,
  Avatar,
  NavIdProps,
} from '@vkontakte/vkui';
import { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

export interface HomeProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const Home: FC<HomeProps> = ({ id, fetchedUser }) => {
  const { photo_200, city, first_name, last_name } = { ...fetchedUser };
  const routeNavigator = useRouteNavigator();

  return (
    <Panel id={id}>
      <PanelHeader>Главная</PanelHeader>
      {fetchedUser && (
        <Group header={<Header size="s">User Data Fetched with VK Bridge</Header>}>
          <Cell before={photo_200 && <Avatar src={photo_200} />} subtitle={city?.title}>
            {`${first_name} ${last_name}`}
          </Cell>
        </Group>
      )}

      <Group header={<Header size="s">Анкетница</Header>}>
        <Div>
          <Button stretched size="l" mode="primary" onClick={() => routeNavigator.push('anketa')}>
            Создать анкету
          </Button>
        </Div>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('anketa_list')}>
            Реестр анкет
          </Button>
        </Div>
        <Div>
          <Button stretched size="l" mode="tertiary" onClick={() => routeNavigator.push('admin_login')}>
            Админ-панель
          </Button>
        </Div>
      </Group>
    </Panel>
  );
};
