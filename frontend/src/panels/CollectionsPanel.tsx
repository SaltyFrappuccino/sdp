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

interface Collection {
  id: number;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image_url: string;
  created_at: string;
}

interface CharacterCollection {
  id: number;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image_url: string;
  quantity: number;
  obtained_at: string;
  obtained_method: string;
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

const RARITY_PRICES = {
  common: 100,
  uncommon: 500,
  rare: 2000,
  epic: 10000,
  legendary: 50000
};

export const CollectionsPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [characterCollections, setCharacterCollections] = useState<CharacterCollection[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState({ collections: true, characterCollections: true, characters: true });
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'owned'>('available');

  const fetchCollections = async () => {
    try {
      const response = await fetch(`${API_URL}/collections`);
      const data = await response.json();
      setCollections(data);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      showResultSnackbar('Не удалось загрузить коллекции', false);
    } finally {
      setLoading(prev => ({ ...prev, collections: false }));
    }
  };

  const fetchCharacterCollections = async () => {
    if (!selectedCharacter) return;
    
    try {
      const response = await fetch(`${API_URL}/collections/character/${selectedCharacter.id}`);
      const data = await response.json();
      setCharacterCollections(data);
    } catch (error) {
      console.error('Failed to fetch character collections:', error);
      showResultSnackbar('Не удалось загрузить коллекции персонажа', false);
    } finally {
      setLoading(prev => ({ ...prev, characterCollections: false }));
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

  const openPurchaseModal = (collection: Collection) => {
    setSelectedCollection(collection);
    setActiveModal(MODAL_PAGE_PURCHASE);
  };

  const handlePurchase = async () => {
    if (!selectedCollection || !selectedCharacter) return;

    const price = RARITY_PRICES[selectedCollection.rarity];
    
    if (selectedCharacter.currency < price) {
      showResultSnackbar('Недостаточно средств', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/collections/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          collection_id: selectedCollection.id,
          price: price
        })
      });

      if (response.ok) {
        showResultSnackbar('Коллекция приобретена!', true);
        setActiveModal(null);
        fetchCharacterCollections();
        fetchCharacters(); // Обновляем баланс
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при покупке', false);
      }
    } catch (error) {
      console.error('Failed to purchase collection:', error);
      showResultSnackbar('Не удалось приобрести коллекцию', false);
    }
  };

  const filteredCollections = (collections || []).filter(collection => {
    const matchesSearch = collection.name.toLowerCase().includes(collectionSearch.toLowerCase()) ||
      (collection.description && collection.description.toLowerCase().includes(collectionSearch.toLowerCase()));
    const matchesCategory = !categoryFilter || collection.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set((collections || []).map(c => c.category)));

  useEffect(() => {
    fetchCollections();
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (selectedCharacter) {
      fetchCharacterCollections();
    }
  }, [selectedCharacter]);

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage id={MODAL_PAGE_PURCHASE} onClose={() => setActiveModal(null)}>
        <ModalPageHeader>
          Покупка коллекции
        </ModalPageHeader>
        <FormLayoutGroup>
          {selectedCollection && (
            <>
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {selectedCollection.name}
                </div>
                <div style={{ color: RARITY_COLORS[selectedCollection.rarity], marginBottom: '8px' }}>
                  {RARITY_NAMES[selectedCollection.rarity] || 'Неизвестно'}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                  {RARITY_PRICES[selectedCollection.rarity].toLocaleString('ru-RU')} ₭
                </div>
                {selectedCollection.description && (
                  <div style={{ marginTop: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                    {selectedCollection.description}
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
                  disabled={!selectedCharacter || selectedCharacter.currency < RARITY_PRICES[selectedCollection.rarity]}
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
        Коллекции
      </PanelHeader>

      <Group>
        <Tabs>
          <TabsItem
            selected={activeTab === 'available'}
            onClick={() => setActiveTab('available')}
          >
            Доступные
          </TabsItem>
          <TabsItem
            selected={activeTab === 'owned'}
            onClick={() => setActiveTab('owned')}
          >
            Мои коллекции
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'available' && (
        <>
          <Group>
            <Search
              value={collectionSearch}
              onChange={(e) => setCollectionSearch(e.target.value)}
              placeholder="Поиск коллекций..."
            />
          </Group>

          <Group>
            <FormItem top="Фильтр по категории">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Все категории"
                options={[
                  { label: 'Все категории', value: '' },
                  ...(categories && categories.length > 0 ? categories.map(category => ({
                    label: category,
                    value: category
                  })) : [])
                ]}
              />
            </FormItem>
          </Group>

          <Group>
            <Header>Доступные коллекции</Header>

            {loading.collections ? (
              <Div>
                <Placeholder>
                  Загрузка...
                </Placeholder>
              </Div>
            ) : (
              <CardGrid size="l">
                {filteredCollections && filteredCollections.length > 0 ? filteredCollections.map((collection) => (
                  <Card key={collection.id} mode="outline">
                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: RARITY_COLORS[collection.rarity],
                            borderRadius: '50%',
                            marginRight: '8px'
                          }}
                        />
                        <strong>{collection.name}</strong>
                      </div>
                      
                      <div style={{ marginBottom: '8px', fontSize: '12px', color: RARITY_COLORS[collection.rarity] }}>
                        {RARITY_NAMES[collection.rarity] || 'Неизвестно'}
                      </div>
                      
                      <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                        {collection.category}
                      </div>
                      
                      <div style={{ marginBottom: '8px', fontSize: '16px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                        {RARITY_PRICES[collection.rarity].toLocaleString('ru-RU')} ₭
                      </div>
                      
                      {collection.description && (
                        <div style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                          {collection.description}
                        </div>
                      )}
                      
                      <Button
                        size="s"
                        onClick={() => openPurchaseModal(collection)}
                        mode="primary"
                      >
                        Купить
                      </Button>
                    </div>
                  </Card>
                )) : (
                  <Placeholder>Нет доступных коллекций</Placeholder>
                )}
              </CardGrid>
            )}
          </Group>
        </>
      )}

      {activeTab === 'owned' && (
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

          <Header>Мои коллекции</Header>

          {loading.characterCollections ? (
            <Div>
              <Placeholder>
                Загрузка...
              </Placeholder>
            </Div>
            ) : (
              <CardGrid size="l">
                {characterCollections && characterCollections.length > 0 ? characterCollections.map((collection) => (
                <Card key={collection.id} mode="outline">
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: RARITY_COLORS[collection.rarity],
                          borderRadius: '50%',
                          marginRight: '8px'
                        }}
                      />
                      <strong>{collection.name}</strong>
                      {collection.quantity > 1 && (
                        <div style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                          x{collection.quantity}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: RARITY_COLORS[collection.rarity] }}>
                      {RARITY_NAMES[collection.rarity] || 'Неизвестно'}
                    </div>
                    
                    <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                      {collection.category}
                    </div>
                    
                    {collection.description && (
                      <div style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                        {collection.description}
                      </div>
                    )}
                    
                    <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                      Получено: {new Date(collection.obtained_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </Card>
              )) : (
                <Placeholder>У вас пока нет коллекций</Placeholder>
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
