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
  Button,
  FormItem,
  Select
} from '@vkontakte/vkui';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect } from 'react';
import { UserInfo } from '@vkontakte/vk-bridge';

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
    archetypes: string;
    attributes: string;
    inventory: string;
    currency: number;
    contracts: any[];
}

export interface AnketaDetailProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const AnketaDetail: FC<AnketaDetailProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const characterId = params?.id;
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL;
        const response = await fetch(`${apiUrl}/characters/${characterId}`);
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
      const apiUrl = process.env.REACT_APP_API_URL;
      await fetch(`${apiUrl}/characters/${characterId}`, {
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
          <Group>
            <Header>III. БОЕВЫЕ ХАРАКТЕРИСТИКИ</Header>
            <SimpleCell>Архетип(ы): {character.archetypes}</SimpleCell>
            <Div>{character.attributes}</Div>
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
          <Group>
            <Header>V. ИНВЕНТАРЬ И РЕСУРСЫ</Header>
            <Div>{character.inventory}</Div>
            <SimpleCell>Валюта: {character.currency} ₭</SimpleCell>
          </Group>
          {fetchedUser?.id === 1 && (
            <Group>
              <Header>Администрирование</Header>
              <FormItem top="Статус анкеты">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { label: 'На рассмотрении', value: 'на рассмотрении' },
                    { label: 'Принята', value: 'принята' },
                    { label: 'Отклонена', value: 'отклонена' },
                  ]}
                />
              </FormItem>
              <Div>
                <Button size="l" stretched onClick={handleStatusChange}>
                  Сохранить статус
                </Button>
              </Div>
            </Group>
          )}
        </>
      ) : (
        <Div>Не удалось загрузить данные персонажа.</Div>
      )}
    </Panel>
  );
};