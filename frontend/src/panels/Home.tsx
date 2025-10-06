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

      <Group header={<Header>📋 Персонажи</Header>}>
        <Div>
          <ButtonGroup stretched mode="vertical" gap="m">
            <Button size="l" mode="primary" onClick={() => routeNavigator.push('anketa')} before={<span>➕</span>}>
              Создать анкету
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('my_anketas')} before={<span>📝</span>}>
              Мои анкеты
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('anketa_list')} before={<span>📖</span>}>
              Реестр анкет
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('factions_list')} before={<span>🔰</span>}>
              Реестр фракций
            </Button>
          </ButtonGroup>
        </Div>
      </Group>

      <Group header={<Header>💰 Экономика</Header>}>
        <Div>
          <ButtonGroup stretched mode="vertical" gap="m">
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('market')} before={<span>🛒</span>}>
              Рынок
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('market_exchange')} before={<span>📈</span>}>
              Биржа
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('crypto_exchange')} before={<span>₿</span>}>
              Криптовалюты
            </Button>
          </ButtonGroup>
        </Div>
      </Group>

      <Group header={<Header>🎮 Развлечения</Header>}>
        <Div>
          <ButtonGroup stretched mode="vertical" gap="m">
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('casino')} before={<span>🎰</span>}>
              Казино
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('events')} before={<span>🎪</span>}>
              Ивенты
            </Button>
          </ButtonGroup>
        </Div>
      </Group>

      <Group header={<Header>🎁 Личное</Header>}>
        <Div>
          <ButtonGroup stretched mode="vertical" gap="m">
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('purchases')} before={<span>🛍️</span>}>
              Мои покупки
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('collections')} before={<span>💎</span>}>
              Коллекции
            </Button>
          </ButtonGroup>
        </Div>
      </Group>

      <Group header={<Header>⚙️ Управление</Header>}>
        <Div>
          <ButtonGroup stretched mode="vertical" gap="m">
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('activity_requests')} before={<span>📋</span>}>
              Заявки на активности
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('calculator')} before={<span>🧮</span>}>
              Калькулятор
            </Button>
            <Button size="l" mode="secondary" onClick={() => routeNavigator.push('handbook')} before={<span>📚</span>}>
              Справочник
            </Button>
          </ButtonGroup>
        </Div>
      </Group>

      <Group>
        <Div>
          <Button stretched size="l" mode="tertiary" onClick={() => routeNavigator.push('admin_login')}>
            🔐 Админ-панель
          </Button>
        </Div>
      </Group>
    </Panel>
  );
};
