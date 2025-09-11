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
  ButtonGroup,
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
        <Group header={<Header size="s">Информация о  профиле ВК:</Header>}>
          <Cell before={photo_200 && <Avatar src={photo_200} />} subtitle={city?.title}>
            {`${first_name} ${last_name}`}
          </Cell>
        </Group>
      )}

      <Group header={<Header size="s">Salty's Dream Project</Header>}>
        <Div>
          <ButtonGroup stretched mode="horizontal">
            <Button stretched size="l" mode="primary" onClick={() => routeNavigator.push('anketa')}>
              Создать анкету
            </Button>
            <Button stretched size="l" mode="primary" onClick={() => routeNavigator.push('my_anketas')}>
              Мои анкеты
            </Button>
          </ButtonGroup>
        </Div>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('anketa_list')}>
            Реестр анкет
          </Button>
        </Div>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('calculator')}>
            Калькулятор
          </Button>
        </Div>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('market')}>
            Рынок
          </Button>
        </Div>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('market_exchange')}>
            Биржа
          </Button>
        </Div>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('activity_requests')}>
            Заявки на Активности
          </Button>
        </Div>
        <Div>
          <Button stretched size="l" mode="secondary" onClick={() => routeNavigator.push('handbook')}>
            Справочник
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
