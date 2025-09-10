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
  SimpleCell,
  Search,
  Checkbox,
  FormLayoutGroup,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormItem,
  Input,
  Select,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { UserInfo } from '@vkontakte/vk-bridge';
import { Icon24CheckCircleOutline, Icon24ErrorCircle } from '@vkontakte/icons';
import { ShinkiAbility } from '../components/ShinkiAbilityForm';

interface Character {
  id: number;
  character_name: string;
  currency: number;
  inventory: any[];
}

interface Item {
  id?: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  item_type: 'Обычный' | 'Синки';
  item_data: {
    sinki_type?: 'Осколок' | 'Фокус' | 'Эхо';
    rank?: string;
    aura_cells?: { small: number; significant: number; ultimate: number };
    abilities?: ShinkiAbility[];
  };
  image_url: string[];
}

interface MarketPanelProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

export const MarketPanel: FC<MarketPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    item_type: '',
    sinki_type: '',
    rank: '',
    inStock: false,
    canAfford: false,
  });
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [itemToSell, setItemToSell] = useState<{ index: number; price: number } | null>(null);

  // Fetch characters
  useEffect(() => {
    if (fetchedUser) {
      fetch(`${API_URL}/characters/by-vk/${fetchedUser.id}`)
        .then(res => res.json())
        .then(async (data) => {
          const charactersWithInventory = await Promise.all(data.map(async (char: Character) => {
            const inventoryRes = await fetch(`${API_URL}/characters/${char.id}`);
            const inventoryData = await inventoryRes.json();
            return { ...char, inventory: inventoryData.inventory };
          }));
          setCharacters(charactersWithInventory);
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
    const { inStock, canAfford, ...apiFilters } = filters;
    const query = new URLSearchParams(apiFilters).toString();
    fetch(`${API_URL}/market/items?${query}`)
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(error => console.error('Failed to fetch market items:', error));
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFilters(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
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
      // Refresh character data and item quantity
      const newCurrency = selectedCharacter.currency - items.find(i => i.id === itemId)!.price;
      const updatedCharacters = characters.map(c =>
        c.id === selectedCharacter.id ? { ...c, currency: newCurrency } : c
      );
      setCharacters(updatedCharacters);
      setSelectedCharacter(prev => prev ? { ...prev, currency: newCurrency } : null);

      const updatedItems = items.map(i =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
      setItems(updatedItems);
    })
    .catch(error => {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      showResultSnackbar(`Ошибка: ${message}`, false);
    });
  };

  const handleSellItem = () => {
    if (!selectedCharacter || itemToSell === null) return;

    fetch(`${API_URL}/market/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character_id: selectedCharacter.id,
        item_index: itemToSell.index,
        price: itemToSell.price,
      }),
    })
    .then(res => res.json())
    .then(result => {
      if (result.error) {
        throw new Error(result.error);
      }
      showResultSnackbar('Предмет выставлен на продажу!', true);
      // Refresh character inventory and market items
      const updatedInventory = selectedCharacter.inventory.filter((_, i) => i !== itemToSell.index);
      const updatedCharacters = characters.map(c =>
        c.id === selectedCharacter.id ? { ...c, inventory: updatedInventory } : c
      );
      setCharacters(updatedCharacters);
      setSelectedCharacter(prev => prev ? { ...prev, inventory: updatedInventory } : null);
      
      // Optimistically add to market items list
      fetch(`${API_URL}/market/items`)
        .then(res => res.json())
        .then(data => setItems(data));
      
      setActiveModal(null);
      setItemToSell(null);
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
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
       <ModalPage
         id="sell-item"
         onClose={() => setActiveModal(null)}
         header={<ModalPageHeader>Продать предмет</ModalPageHeader>}
       >
         <Div>
           <FormItem top="Предмет">
             <Select
               placeholder="Выберите предмет для продажи"
               value={String(itemToSell?.index)}
               onChange={(e) => setItemToSell({ index: Number(e.target.value), price: 0 })}
               options={selectedCharacter.inventory.map((item, index) => ({
                 label: item.name,
                 value: index,
               }))}
             />
           </FormItem>
           <FormItem top="Цена">
             <Input
               type="number"
               value={String(itemToSell?.price)}
               onChange={(e) => setItemToSell(prev => prev ? { ...prev, price: Number(e.target.value) } : null)}
             />
           </FormItem>
           <Button size="l" stretched onClick={handleSellItem}>
             Выставить на продажу
           </Button>
         </Div>
       </ModalPage>
      </ModalRoot>
      <Group>
        <Div>
         <Button stretched size="l" mode="secondary" onClick={() => setActiveModal('sell-item')}>
           Продать предмет
         </Button>
        </Div>
        <Search value={search} onChange={(e) => setSearch(e.target.value)} />
        <FormLayoutGroup mode="horizontal">
          <FormItem top="Тип предмета">
            <Select
              name="item_type"
              value={filters.item_type}
              onChange={handleFilterChange}
              placeholder="Любой"
              options={[
                { label: 'Любой', value: '' },
                { label: 'Обычный', value: 'Обычный' },
                { label: 'Синки', value: 'Синки' },
              ]}
            />
          </FormItem>
          <FormItem top="Тип Синки">
            <Select
              name="sinki_type"
              value={filters.sinki_type}
              onChange={handleFilterChange}
              placeholder="Любой"
              disabled={filters.item_type !== 'Синки'}
              options={[
                { label: 'Любой', value: '' },
                { label: 'Осколок', value: 'Осколок' },
                { label: 'Фокус', value: 'Фокус' },
                { label: 'Эхо', value: 'Эхо' },
              ]}
            />
          </FormItem>
          <FormItem top="Ранг">
            <Select
              name="rank"
              value={filters.rank}
              onChange={handleFilterChange}
              placeholder="Любой"
              disabled={filters.item_type !== 'Синки'}
              options={[
                { label: 'Любой', value: '' },
                { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
                { label: 'C', value: 'C' }, { label: 'B', value: 'B' }, { label: 'A', value: 'A' },
                { label: 'S', value: 'S' }, { label: 'SS', value: 'SS' }, { label: 'SSS', value: 'SSS' },
              ]}
            />
          </FormItem>
        </FormLayoutGroup>
        <FormLayoutGroup mode="horizontal" style={{ margin: '0 16px' }}>
          <Checkbox name="inStock" checked={filters.inStock} onChange={handleFilterChange}>
            Есть в наличии
          </Checkbox>
          <Checkbox name="canAfford" checked={filters.canAfford} onChange={handleFilterChange}>
            Могу позволить
          </Checkbox>
        </FormLayoutGroup>
        <CardGrid size="l">
          {items
            .filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
            .filter(i => !filters.inStock || i.quantity > 0)
            .filter(i => !filters.canAfford || selectedCharacter.currency >= i.price)
            .map(item => (
            <Card key={item.id}>
              {item.image_url && <img src={item.image_url[0]} alt={item.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} />}
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
                <p><b>В наличии: {item.quantity}</b></p>
                <Button stretched onClick={() => handlePurchase(item.id!)} disabled={selectedCharacter.currency < item.price || item.quantity <= 0}>
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