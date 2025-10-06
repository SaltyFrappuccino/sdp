import { FC, useState } from 'react';
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
  Accordion,
} from '@vkontakte/vkui';
import { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

export interface HomeProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const Home: FC<HomeProps> = ({ id, fetchedUser }) => {
  const { photo_200, city, first_name, last_name } = { ...fetchedUser };
  const routeNavigator = useRouteNavigator();
  const [expanded, setExpanded] = useState<string[]>(['characters']);

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

      <Group>
        <Accordion
          expanded={expanded.includes('characters')}
          onChange={(e) => setExpanded(e ? [...expanded.filter(i => i !== 'characters'), 'characters'] : expanded.filter(i => i !== 'characters'))}
        >
          <Accordion.Summary>📋 Персонажи</Accordion.Summary>
          <Accordion.Content>
            <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px' }}>
              <Button size="l" mode="primary" onClick={() => routeNavigator.push('anketa')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>➕</span>
                  <span>Создать анкету</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('my_anketas')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>📝</span>
                  <span>Мои анкеты</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('anketa_list')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>📖</span>
                  <span>Реестр анкет</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('factions_list')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>🔰</span>
                  <span>Реестр фракций</span>
                </div>
              </Button>
            </Div>
          </Accordion.Content>
        </Accordion>
      </Group>

      <Group>
        <Accordion
          expanded={expanded.includes('economy')}
          onChange={(e) => setExpanded(e ? [...expanded.filter(i => i !== 'economy'), 'economy'] : expanded.filter(i => i !== 'economy'))}
        >
          <Accordion.Summary>💰 Экономика</Accordion.Summary>
          <Accordion.Content>
            <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px' }}>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('market')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>🛒</span>
                  <span>Рынок</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('market_exchange')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>📈</span>
                  <span>Биржа</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('crypto_exchange')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>₿</span>
                  <span>Криптовалюты</span>
                </div>
              </Button>
            </Div>
          </Accordion.Content>
        </Accordion>
      </Group>

      <Group>
        <Accordion
          expanded={expanded.includes('fun')}
          onChange={(e) => setExpanded(e ? [...expanded.filter(i => i !== 'fun'), 'fun'] : expanded.filter(i => i !== 'fun'))}
        >
          <Accordion.Summary>🎮 Развлечения</Accordion.Summary>
          <Accordion.Content>
            <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px' }}>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('casino')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>🎰</span>
                  <span>Казино</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('events')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>🎪</span>
                  <span>Ивенты</span>
                </div>
              </Button>
            </Div>
          </Accordion.Content>
        </Accordion>
      </Group>

      <Group>
        <Accordion
          expanded={expanded.includes('personal')}
          onChange={(e) => setExpanded(e ? [...expanded.filter(i => i !== 'personal'), 'personal'] : expanded.filter(i => i !== 'personal'))}
        >
          <Accordion.Summary>🎁 Личное</Accordion.Summary>
          <Accordion.Content>
            <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px' }}>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('purchases')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>🛍️</span>
                  <span>Мои покупки</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('collections')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>💎</span>
                  <span>Коллекции</span>
                </div>
              </Button>
            </Div>
          </Accordion.Content>
        </Accordion>
      </Group>

      <Group>
        <Accordion
          expanded={expanded.includes('management')}
          onChange={(e) => setExpanded(e ? [...expanded.filter(i => i !== 'management'), 'management'] : expanded.filter(i => i !== 'management'))}
        >
          <Accordion.Summary>⚙️ Управление</Accordion.Summary>
          <Accordion.Content>
            <Div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px' }}>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('activity_requests')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>📋</span>
                  <span>Заявки на активности</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('calculator')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>🧮</span>
                  <span>Калькулятор</span>
                </div>
              </Button>
              <Button size="l" mode="secondary" onClick={() => routeNavigator.push('handbook')} stretched style={{ minHeight: '80px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '24px' }}>📚</span>
                  <span>Справочник</span>
                </div>
              </Button>
            </Div>
          </Accordion.Content>
        </Accordion>
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
