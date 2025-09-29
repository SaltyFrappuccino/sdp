import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  CardGrid,
  Card,
  Header,
  Div,
  Button,
  PanelHeaderBack,
  ButtonGroup,
  Link,
  Snackbar,
  Alert,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormLayoutGroup,
  Placeholder,
  Input,
  Textarea,
  FormItem,
  Select,
  Search,
  Cell,
  Tabs,
  TabsItem
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect, ReactNode } from 'react';
import { API_URL } from '../api';
import { Icon24CheckCircleOutline, Icon24ErrorCircle, Icon24Add } from '@vkontakte/icons';

interface PurchaseCategory {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  created_at: string;
}

interface PurchaseItem {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image_url: string;
  properties: string;
  is_available: boolean;
  category_name: string;
  created_at: string;
}

interface CharacterPurchase {
  id: number;
  name: string;
  description: string;
  image_url: string;
  properties: string;
  category_name: string;
  purchase_price: number;
  purchased_at: string;
}

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

const MODAL_PAGE_PURCHASE = 'purchase';

const RARITY_COLORS = {
  common: '#8E8E93',
  uncommon: '#34C759',
  rare: '#007AFF',
  epic: '#AF52DE',
  legendary: '#FF9500'
};

const RARITY_NAMES = {
  common: 'Обычная',
  uncommon: 'Необычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная'
};

export const PurchasesPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [categories, setCategories] = useState<PurchaseCategory[]>([]);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [characterPurchases, setCharacterPurchases] = useState<CharacterPurchase[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState({ 
    categories: true, 
    items: true, 
    characterPurchases: true, 
    characters: true 
  });
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PurchaseItem | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'shop' | 'purchases'>('shop');

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/purchases/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      showResultSnackbar('Не удалось загрузить категории', false);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const fetchItems = async () => {
    try {
      const url = selectedCategory 
        ? `${API_URL}/purchases/items?category_id=${selectedCategory}`
        : `${API_URL}/purchases/items`;
      const response = await fetch(url);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      showResultSnackbar('Не удалось загрузить предметы', false);
    } finally {
      setLoading(prev => ({ ...prev, items: false }));
    }
  };

  const fetchCharacterPurchases = async () => {
    if (!selectedCharacter) return;
    
    try {
      const response = await fetch(`${API_URL}/purchases/character/${selectedCharacter.id}`);
      const data = await response.json();
      setCharacterPurchases(data);
    } catch (error) {
      console.error('Failed to fetch character purchases:', error);
      showResultSnackbar('Не удалось загрузить покупки персонажа', false);
    } finally {
      setLoading(prev => ({ ...prev, characterPurchases: false }));
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/characters?status=Принято`);
      const data = await response.json();
      setCharacters(data);
      if (data.length > 0) {
        setSelectedCharacter(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      showResultSnackbar('Не удалось загрузить персонажей', false);
    } finally {
      setLoading(prev => ({ ...prev, characters: false }));
    }
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

  const openPurchaseModal = (item: PurchaseItem) => {
    setSelectedItem(item);
    setActiveModal(MODAL_PAGE_PURCHASE);
  };

  const handlePurchase = async () => {
    if (!selectedItem || !selectedCharacter) return;
    
    if (selectedCharacter.currency < selectedItem.price) {
      showResultSnackbar('Недостаточно средств', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/purchases/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          item_id: selectedItem.id
        })
      });

      if (response.ok) {
        showResultSnackbar('Предмет приобретен!', true);
        setActiveModal(null);
        fetchCharacterPurchases();
        fetchCharacters(); // Обновляем баланс
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при покупке', false);
      }
    } catch (error) {
      console.error('Failed to purchase item:', error);
      showResultSnackbar('Не удалось приобрести предмет', false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCharacters();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCharacter) {
      fetchCharacterPurchases();
    }
  }, [selectedCharacter]);

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage id={MODAL_PAGE_PURCHASE} onClose={() => setActiveModal(null)}>
        <ModalPageHeader>
          Покупка предмета
        </ModalPageHeader>
        <FormLayoutGroup>
          {selectedItem && (
            <>
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {selectedItem.name}
                </div>
                <div style={{ color: RARITY_COLORS[selectedItem.rarity], marginBottom: '8px' }}>
                  {RARITY_NAMES[selectedItem.rarity] || 'Неизвестно'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                  {selectedItem.price.toLocaleString('ru-RU')} ₭
                </div>
                <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                  {selectedItem.category_name}
                </div>
                {selectedItem.description && (
                  <div style={{ marginTop: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                    {selectedItem.description}
                  </div>
                )}
              </div>

              <FormItem top="Персонаж">
                <Select
                  value={selectedCharacter?.id || ''}
                  onChange={(e) => {
                    const character = characters.find(c => c.id === parseInt(e.target.value));
                    setSelectedCharacter(character || null);
                  }}
                  options={characters && characters.length > 0 ? characters.map(char => ({
                    label: `${char.character_name} (${char.currency.toLocaleString('ru-RU')} ₭)`,
                    value: char.id.toString()
                  })) : []}
                />
              </FormItem>

              <ButtonGroup mode="horizontal" gap="m" stretched>
                <Button onClick={() => setActiveModal(null)}>Отмена</Button>
                <Button 
                  onClick={handlePurchase} 
                  mode="primary"
                  disabled={!selectedCharacter || selectedCharacter.currency < selectedItem.price}
                >
                  Купить
                </Button>
              </ButtonGroup>
            </>
          )}
        </FormLayoutGroup>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Покупки
      </PanelHeader>

      <Group>
        <Tabs>
          <TabsItem
            selected={activeTab === 'shop'}
            onClick={() => setActiveTab('shop')}
          >
            Магазин
          </TabsItem>
          <TabsItem
            selected={activeTab === 'purchases'}
            onClick={() => setActiveTab('purchases')}
          >
            Мои покупки
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'shop' && (
        <>
          <Group>
            <FormItem top="Категория">
              <Select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Все категории"
                options={[
                  { label: 'Все категории', value: '' },
                  ...(categories && categories.length > 0 ? categories.map(category => ({
                    label: category.name,
                    value: category.id.toString()
                  })) : [])
                ]}
              />
            </FormItem>
          </Group>

          <Group>
            <Header>Предметы для покупки</Header>

            {loading.items ? (
              <Div>
                <Placeholder>
                  Загрузка...
                </Placeholder>
              </Div>
            ) : (
              <CardGrid size="l">
                {items && items.length > 0 ? items.map((item) => (
                  <Card key={item.id} mode="outline">
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: RARITY_COLORS[item.rarity],
                            borderRadius: '50%',
                            marginRight: '8px'
                          }}
                        />
                        <strong>{item.name}</strong>
                      </div>
                      
                      <div style={{ marginBottom: '8px', fontSize: '12px', color: RARITY_COLORS[item.rarity] }}>
                        {RARITY_NAMES[item.rarity] || 'Неизвестно'}
                      </div>
                      
                      <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                        {item.category_name}
                      </div>
                      
                      <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                        {item.price.toLocaleString('ru-RU')} ₭
                      </div>
                      
                      {item.description && (
                        <div style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                          {item.description}
                        </div>
                      )}
                      
                      <Button
                        size="s"
                        onClick={() => openPurchaseModal(item)}
                        mode="primary"
                      >
                        Купить
                      </Button>
                    </div>
                  </Card>
                )) : (
                  <Placeholder>Нет доступных предметов для покупки</Placeholder>
                )}
              </CardGrid>
            )}
          </Group>
        </>
      )}

      {activeTab === 'purchases' && (
        <Group>
          <FormItem top="Персонаж">
            <Select
              value={selectedCharacter?.id || ''}
              onChange={(e) => {
                const character = characters.find(c => c.id === parseInt(e.target.value));
                setSelectedCharacter(character || null);
              }}
              options={characters && characters.length > 0 ? characters.map(char => ({
                label: char.character_name,
                value: char.id.toString()
              })) : []}
            />
          </FormItem>

          <Header>Мои покупки</Header>

          {loading.characterPurchases ? (
            <Div>
              <Placeholder>
                Загрузка...
              </Placeholder>
            </Div>
          ) : (
            <CardGrid size="l">
              {characterPurchases && characterPurchases.length > 0 ? characterPurchases.map((purchase) => (
                <Card key={purchase.id} mode="outline">
                  <div style={{ padding: '16px' }}>
                    <strong>{purchase.name}</strong>
                    
                    <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                      {purchase.category_name}
                    </div>
                    
                    <div style={{ marginTop: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                      {purchase.purchase_price.toLocaleString('ru-RU')} ₭
                    </div>
                    
                    {purchase.description && (
                      <div style={{ marginTop: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                        {purchase.description}
                      </div>
                    )}
                    
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                      Куплено: {new Date(purchase.purchased_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </Card>
              )) : (
                <Placeholder>У вас пока нет покупок</Placeholder>
              )}
            </CardGrid>
          )}
        </Group>
      )}

      {modal}
      {snackbar}
    </Panel>
  );
};
