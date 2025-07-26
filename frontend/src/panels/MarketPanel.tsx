import { FC, useState, useEffect, ReactNode } from 'react';
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
  Snackbar,
  Avatar,
  SimpleCell,
  IconButton,
  Search,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { UserInfo } from '@vkontakte/vk-bridge';
import { Icon24CheckCircleOutline, Icon24ErrorCircle } from '@vkontakte/icons';

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface MarketItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  item_type: 'Обычный' | 'Синки';
  item_data: {
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
  };
}

interface MarketPanelProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const MarketPanel: FC<MarketPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [search, setSearch] = useState('');

  // Fetch characters
  useEffect(() => {
    if (fetchedUser) {
      fetch(`${API_URL}/characters/by-vk/${fetchedUser.id}`)
        .then(res => res.json())
        .then(data => {
          setCharacters(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to fetch characters:', error);
          setLoading(false);
        });
    }
  }, [fetchedUser]);

  // Fetch market items
  useEffect(() => {
    fetch(`${API_URL}/market/items`)
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(error => console.error('Failed to fetch market items:', error));
  }, []);

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

  const handlePurchase = (itemId: number) => {
    if (!selectedCharacter) return;

    fetch(`${API_URL}/market/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: selectedCharacter.id, item_id: itemId }),
    })
    .then(res => res.json())
    .then(result => {
      if (result.error) {
        throw new Error(result.error);
      }
      showResultSnackbar('Покупка совершена успешно!', true);
      // Refresh character data
      const updatedCharacters = characters.map(c => 
        c.id === selectedCharacter.id ? { ...c, currency: result.newCurrency } : c
      );
      setCharacters(updatedCharacters);
      setSelectedCharacter(prev => prev ? { ...prev, currency: result.newCurrency } : null);
    })
    .catch(error => {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showResultSnackbar(`Ошибка: ${message}`, false);
    });
  };

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Рынок</PanelHeader>
        <Spinner size="l" style={{ margin: '20px 0' }} />
      </Panel>
    );
  }

  if (!selectedCharacter) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Выбор персонажа</PanelHeader>
        <Group header={<Header>Выберите персонажа для входа на рынок</Header>}>
          {characters.map(char => (
            <SimpleCell key={char.id} onClick={() => setSelectedCharacter(char)}>
              {char.character_name} (Баланс: {char.currency})
            </SimpleCell>
          ))}
        </Group>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => setSelectedCharacter(null)} />}>
        Рынок - {selectedCharacter.character_name} (Баланс: {selectedCharacter.currency})
      </PanelHeader>
      <Group>
        <Search value={search} onChange={(e) => setSearch(e.target.value)} />
        <CardGrid size="l">
          {items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(item => (
            <Card key={item.id}>
              {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} />}
              <Div>
                <Header>{item.name}</Header>
                <p>{item.description}</p>
                {item.item_type === 'Синки' && item.item_data && (
                  <>
                    <p><b>Тип Синки:</b> {item.item_data.sinki_type}</p>
                    <p><b>Ранг Синки:</b> {item.item_data.rank}</p>
                  </>
                )}
                <p><b>Цена: {item.price} кредитов</b></p>
                <Button stretched onClick={() => handlePurchase(item.id)} disabled={selectedCharacter.currency < item.price}>
                  Купить
                </Button>
              </Div>
            </Card>
          ))}
        </CardGrid>
      </Group>
      {snackbar}
    </Panel>
  );
};