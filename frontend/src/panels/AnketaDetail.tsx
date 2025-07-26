import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  Header,
  Spinner,
  Div,
  PanelHeaderBack,
  SimpleCell,
  Separator,
  Tabs,
  TabsItem,
  View
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect } from 'react';
import AuraCellsCalculator from '../components/AuraCellsCalculator';
import { UserInfo } from '@vkontakte/vk-bridge';
import { API_URL } from '../api';

interface Item {
    name: string;
    description: string;
    type: 'Обычный' | 'Синки';
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
}

interface Character {
    id: number;
    vk_id: number;
    status: string;
    character_name: string;
    nickname: string;
    age: number;
    rank: string;
    faction: string;
    home_island: string;
    appearance: string;
    personality: string;
    biography: string;
    archetypes: string[];
    attributes: { [key: string]: string };
    inventory: Item[];
    currency: number;
    contracts: any[];
    admin_note: string;
}

export interface AnketaDetailProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const AnketaDetail: FC<AnketaDetailProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const response = await fetch(`${API_URL}/characters/${characterId}`);
        const data = await response.json();
        setCharacter(data);
        setStatus(data.status);
      } catch (error) {
        console.error('Failed to fetch character:', error);
      } finally {
        setLoading(false);
      }
    };

    if (characterId) {
      fetchCharacter();
    }
  }, [characterId]);

  const handleStatusChange = async () => {
    try {
      await fetch(`${API_URL}/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Просмотр анкеты
      </PanelHeader>
      {loading ? (
        <Spinner size="l" style={{ margin: '20px 0' }} />
      ) : character ? (
        <>
          <Tabs>
            <TabsItem
              id="general"
              selected={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            >
              Основное
            </TabsItem>
            <TabsItem
              id="combat"
              selected={activeTab === 'combat'}
              onClick={() => setActiveTab('combat')}
            >
              Боевые
            </TabsItem>
            <TabsItem
              id="inventory"
              selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
            >
              Инвентарь
            </TabsItem>
          </Tabs>

          <View activePanel={activeTab}>
            <Panel id="general">
              <Group>
                <Header>I. ОБЩАЯ ИНФОРМАЦИЯ</Header>
                <SimpleCell multiline>Имя и Фамилия: {character.character_name}</SimpleCell>
                <SimpleCell multiline>Прозвище/Позывной: {character.nickname}</SimpleCell>
                <SimpleCell>Возраст: {character.age}</SimpleCell>
                <SimpleCell>Ранг: {character.rank}</SimpleCell>
                <SimpleCell>Фракция: {character.faction}</SimpleCell>
                <SimpleCell>Родной остров: {character.home_island}</SimpleCell>
              </Group>
              <Group>
                <Header>II. ЛИЧНОСТЬ И ВНЕШНОСТЬ</Header>
                <Div>{character.appearance}</Div>
                <Separator />
                <Div>{character.personality}</Div>
                <Separator />
                <Div>{character.biography}</Div>
              </Group>
            </Panel>
            <Panel id="combat">
                <Group>
                    <Header>III. БОЕВЫЕ ХАРАКТЕРИСТИКИ</Header>
                    <SimpleCell>Архетип(ы): {character.archetypes.join(', ')}</SimpleCell>
                    {Object.entries(character.attributes).map(([key, value]) => (
                      <SimpleCell key={key}>{key}: {value}</SimpleCell>
                    ))}
                    <AuraCellsCalculator
                      currentRank={character.rank}
                      contracts={character.contracts}
                    />
                </Group>
                <Group>
                    <Header>IV. КОНТРАКТ(Ы)</Header>
                    {character.contracts.map((contract, index) => (
                      <Div key={index}>
                        <Header>{contract.contract_name}</Header>
                        <SimpleCell>Существо: {contract.creature_name} ({contract.creature_rank})</SimpleCell>
                        <Div>{contract.creature_description}</Div>
                      </Div>
                    ))}
                </Group>
            </Panel>
            <Panel id="inventory">
                <Group>
                    <Header>V. ИНВЕНТАРЬ И РЕСУРСЫ</Header>
                    {character.inventory.map((item, index) => (
                        <SimpleCell key={index} subtitle={item.description}>
                            {item.name} ({item.type === 'Синки' ? `${item.type} (${item.sinki_type})` : item.type})
                        </SimpleCell>
                    ))}
                    <SimpleCell>Валюта: {character.currency} ₭</SimpleCell>
                </Group>
            </Panel>
          </View>
          {character.admin_note && (
            <Group>
                <Header>Примечание для администрации</Header>
                <Div>{character.admin_note}</Div>
            </Group>
          )}
        </>
      ) : (
        <Div>Не удалось загрузить данные персонажа.</Div>
      )}
    </Panel>
  );
};