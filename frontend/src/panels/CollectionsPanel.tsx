import { FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  Card,
  Div,
  Text,
  Button,
  FormItem,
  Select,
  Spinner,
  Snackbar,
  SimpleCell,
  CardGrid,
  Tabs,
  TabsItem,
  Progress,
  Counter,
  Avatar,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { Icon28DoneOutline, Icon28ErrorCircleOutline, Icon28FavoriteOutline } from '@vkontakte/icons';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface CollectionsPanelProps extends NavIdProps {
  fetchedUser?: any;
}

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface Series {
  id: number;
  name: string;
  description: string;
  total_items: number;
  season: string | null;
  active: boolean;
}

interface CollectionItem {
  id: number;
  series_id: number;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  image_url: string | null;
  lore_text: string | null;
  drop_rate: number;
  properties: string;
}

interface Pack {
  id: number;
  name: string;
  description: string;
  price: number;
  guaranteed_rarity: string | null;
  items_count: number;
  series_id: number | null;
  active: boolean;
}

interface CollectionEntry {
  id: number;
  item_id: number;
  name: string;
  description: string;
  rarity: string;
  image_url: string | null;
  series_name: string;
  quantity: number;
  obtained_at: string;
}

interface LeaderboardEntry {
  character_id: number;
  character_name: string;
  total_items: number;
  unique_items: number;
  mythic_count: number;
  legendary_count: number;
}

const rarityColors = {
  common: '#888888',
  rare: '#4A90E2',
  epic: '#9B59B6',
  legendary: '#F39C12',
  mythic: '#E74C3C',
};

const rarityLabels = {
  common: 'Обычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
  mythic: 'Мифический',
};

export const CollectionsPanel: FC<CollectionsPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();

  const [activeTab, setActiveTab] = useState<'packs' | 'collection' | 'leaderboard'>('packs');
  const [series, setSeries] = useState<Series[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [seriesItems, setSeriesItems] = useState<CollectionItem[]>([]);
  const [openingPack, setOpeningPack] = useState(false);
  const [openedItems, setOpenedItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    fetchSeries();
    fetchPacks();
    fetchLeaderboard();
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (selectedCharacter && activeTab === 'collection') {
      fetchCollection(selectedCharacter.id);
    }
  }, [selectedCharacter, activeTab]);

  const fetchSeries = async () => {
    try {
      const response = await fetch(`${API_URL}/collections/series`);
      const data = await response.json();
      setSeries(data.filter((s: Series) => s.active));
    } catch (error) {
      showSnackbar('Ошибка загрузки серий', false);
    }
  };

  const fetchPacks = async () => {
    try {
      const response = await fetch(`${API_URL}/collections/packs`);
      const data = await response.json();
      setPacks(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки паков', false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/collections/leaderboard`);
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки рейтинга', false);
    }
  };

  const fetchCharacters = async () => {
    if (!fetchedUser) return;
    try {
      const response = await fetch(`${API_URL}/my-anketas/${fetchedUser.id}`);
      const data = await response.json();
      const acceptedChars = data.filter((char: any) => char.status === 'Принято' && (char.life_status === 'Жив' || char.life_status === 'Жива'));
      setCharacters(acceptedChars);
      if (acceptedChars.length > 0) {
        setSelectedCharacter(acceptedChars[0]);
      }
    } catch (error) {
      showSnackbar('Ошибка загрузки персонажей', false);
    }
  };

  const fetchCollection = async (characterId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/collections/my/${characterId}`);
      const data = await response.json();
      setCollection(data);
    } catch (error) {
      showSnackbar('Ошибка загрузки коллекции', false);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesDetails = async (seriesId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/collections/series/${seriesId}`);
      const data = await response.json();
      setSeriesItems(data.items || []);
    } catch (error) {
      showSnackbar('Ошибка загрузки серии', false);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPack = async (pack: Pack) => {
    if (!selectedCharacter) {
      showSnackbar('Выберите персонажа', false);
      return;
    }

    if (selectedCharacter.currency < pack.price) {
      showSnackbar('Недостаточно средств', false);
      return;
    }

    try {
      setOpeningPack(true);
      const response = await fetch(`${API_URL}/collections/buy-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          pack_id: pack.id,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Buy pack result:', result);
        
        // Проверяем наличие purchase_id
        if (!result.purchase_id) {
          showSnackbar('Ошибка: не получен ID покупки', false);
          return;
        }
        
        // Открываем пак
        const openResponse = await fetch(`${API_URL}/collections/open-pack/${result.purchase_id}`, {
          method: 'POST',
        });

        if (openResponse.ok) {
          const items = await openResponse.json();
          setOpenedItems(items);
          showSnackbar(`Получено предметов: ${items.length}!`, true);
          fetchCharacters();
          if (selectedCharacter) {
            fetchCollection(selectedCharacter.id);
          }
        } else {
          const openError = await openResponse.json();
          showSnackbar(openError.error || 'Ошибка открытия пака', false);
        }
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Ошибка покупки пака', false);
      }
    } catch (error) {
      showSnackbar('Ошибка покупки пака', false);
    } finally {
      setOpeningPack(false);
    }
  };

  const showSnackbar = (message: string, success: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={success ? <Icon28DoneOutline fill="var(--vkui--color_icon_positive)" /> : <Icon28ErrorCircleOutline fill="var(--vkui--color_icon_negative)" />}
      >
        {message}
      </Snackbar>
    );
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU') + ' ₭';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getCollectionProgress = (seriesId: number) => {
    const seriesObj = series.find(s => s.id === seriesId);
    if (!seriesObj) return { collected: 0, total: 0, percentage: 0 };

    const uniqueItems = new Set(
      collection
        .filter(c => c.series_name === seriesObj.name)
        .map(c => c.item_id)
    );

    const collected = uniqueItems.size;
    const total = seriesObj.total_items;
    const percentage = total > 0 ? Math.round((collected / total) * 100) : 0;

    return { collected, total, percentage };
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Коллекции
      </PanelHeader>

      {/* Выбор персонажа */}
      {characters.length > 0 && (
        <Group>
          <FormItem top="Персонаж">
            <Select
              value={selectedCharacter?.id.toString() || ''}
              onChange={(e) => {
                const char = characters.find(c => c.id === parseInt(e.target.value));
                if (char) setSelectedCharacter(char);
              }}
              options={characters.map(char => ({
                label: `${char.character_name} - ${formatPrice(char.currency)}`,
                value: char.id.toString()
              }))}
            />
          </FormItem>
        </Group>
      )}

      {/* Вкладки */}
      <Group>
        <Tabs>
          <TabsItem
            selected={activeTab === 'packs'}
            onClick={() => setActiveTab('packs')}
          >
            Паки
          </TabsItem>
          <TabsItem
            selected={activeTab === 'collection'}
            onClick={() => setActiveTab('collection')}
          >
            Моя коллекция
          </TabsItem>
          <TabsItem
            selected={activeTab === 'leaderboard'}
            onClick={() => setActiveTab('leaderboard')}
          >
            Рейтинг
          </TabsItem>
        </Tabs>
      </Group>

      {/* Вкладка "Паки" */}
      {activeTab === 'packs' && (
        <>
          {/* Серии */}
          <Group header={<Header>Серии коллекций</Header>}>
            {series.map((s) => {
              const progress = getCollectionProgress(s.id);
              return (
                <Card key={s.id} mode="outline" style={{ marginBottom: 8 }}>
                  <Div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Text weight="2" style={{ fontSize: 18 }}>
                          {s.name}
                        </Text>
                        {s.season && (
                          <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)' }}>
                            Сезон {s.season}
                          </Text>
                        )}
                      </div>
                      <Counter mode="primary">{progress.collected}/{progress.total}</Counter>
                    </div>
                    <Text style={{ fontSize: 14, marginBottom: 12 }}>
                      {s.description}
                    </Text>
                    {selectedCharacter && (
                      <>
                        <Progress value={progress.percentage} />
                        <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)', marginTop: 4 }}>
                          Собрано: {progress.percentage}%
                        </Text>
                      </>
                    )}
                    <Button
                      size="m"
                      mode="secondary"
                      stretched
                      style={{ marginTop: 8 }}
                      onClick={() => {
                        setSelectedSeries(s);
                        fetchSeriesDetails(s.id);
                        setActiveModal('series');
                      }}
                    >
                      Просмотреть предметы
                    </Button>
                  </Div>
                </Card>
              );
            })}
          </Group>

          {/* Доступные паки */}
          <Group header={<Header>Доступные паки</Header>}>
            <CardGrid size="l">
              {packs.map((pack) => (
                <Card key={pack.id} mode="shadow">
                  <Div>
                    <Text weight="2" style={{ fontSize: 18, marginBottom: 4 }}>
                      {pack.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)', marginBottom: 8 }}>
                      {pack.description}
                    </Text>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 14 }}>
                        Предметов в паке: <span style={{ fontWeight: 'bold' }}>{pack.items_count}</span>
                      </Text>
                      {pack.guaranteed_rarity && (
                        <Text style={{ fontSize: 14 }}>
                          Гарантия: <span style={{
                            fontWeight: 'bold',
                            color: rarityColors[pack.guaranteed_rarity as keyof typeof rarityColors]
                          }}>
                            {rarityLabels[pack.guaranteed_rarity as keyof typeof rarityLabels]}
                          </span>
                        </Text>
                      )}
                    </div>
                    <Text weight="2" style={{ fontSize: 20, color: 'var(--vkui--color_text_accent)', marginBottom: 12 }}>
                      {formatPrice(pack.price)}
                    </Text>
                    <Button
                      size="l"
                      mode="primary"
                      stretched
                      onClick={() => handleBuyPack(pack)}
                      disabled={openingPack || !selectedCharacter || (selectedCharacter.currency < pack.price)}
                      loading={openingPack}
                    >
                      Купить пак
                    </Button>
                  </Div>
                </Card>
              ))}
            </CardGrid>
          </Group>

          {/* Открытые предметы */}
          {openedItems.length > 0 && (
            <Group header={<Header>🎉 Вы получили:</Header>}>
              {openedItems.map((item, index) => (
                <Card key={index} mode="shadow" style={{ marginBottom: 8 }}>
                  <Div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        backgroundColor: rarityColors[item.rarity],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 32
                      }}>
                        ✨
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text weight="2" style={{ fontSize: 16 }}>
                          {item.name}
                        </Text>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: rarityColors[item.rarity],
                          color: 'white'
                        }}>
                          {rarityLabels[item.rarity]}
                        </span>
                      </div>
                    </div>
                  </Div>
                </Card>
              ))}
              <Div>
                <Button
                  size="l"
                  mode="secondary"
                  stretched
                  onClick={() => setOpenedItems([])}
                >
                  Закрыть
                </Button>
              </Div>
            </Group>
          )}
        </>
      )}

      {/* Вкладка "Моя коллекция" */}
      {activeTab === 'collection' && (
        <>
          {selectedCharacter && collection.length > 0 ? (
            <>
              {/* Статистика */}
              <Group header={<Header>Статистика коллекции</Header>}>
                <Div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{collection.length}</Text>
                      <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)' }}>Всего предметов</Text>
                    </div>
                    <div>
                      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
                        {new Set(collection.map(c => c.item_id)).size}
                      </Text>
                      <Text style={{ fontSize: 14, color: 'var(--vkui--color_text_secondary)' }}>Уникальных</Text>
                    </div>
                  </div>
                </Div>
                <Div>
                  <Text weight="2" style={{ marginBottom: 8 }}>По редкости:</Text>
                  {Object.entries(rarityLabels).map(([key, label]) => {
                    const count = collection.filter(c => c.rarity === key).length;
                    return count > 0 ? (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: rarityColors[key as keyof typeof rarityColors],
                          color: 'white'
                        }}>
                          {label}
                        </span>
                        <Text>{count}</Text>
                      </div>
                    ) : null;
                  })}
                </Div>
              </Group>

              {/* Предметы по сериям */}
              {series.map((s) => {
                const seriesCollection = collection.filter(c => c.series_name === s.name);
                if (seriesCollection.length === 0) return null;

                return (
                  <Group key={s.id} header={<Header>{s.name}</Header>}>
                    {seriesCollection.map((item) => (
                      <SimpleCell
                        key={item.id}
                        before={
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            backgroundColor: rarityColors[item.rarity as keyof typeof rarityColors],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 24
                          }}>
                            ✨
                          </div>
                        }
                        subtitle={`${rarityLabels[item.rarity as keyof typeof rarityLabels]} • ${formatDate(item.obtained_at)}`}
                        after={<Counter mode="primary">×{item.quantity}</Counter>}
                      >
                        {item.name}
                      </SimpleCell>
                    ))}
                  </Group>
                );
              })}
            </>
          ) : (
            <Group>
              <Div>
                <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                  {selectedCharacter ? 'Ваша коллекция пуста. Купите паки!' : 'Выберите персонажа'}
                </Text>
              </Div>
            </Group>
          )}
        </>
      )}

      {/* Вкладка "Рейтинг" */}
      {activeTab === 'leaderboard' && (
        <Group header={<Header>Топ коллекционеров</Header>}>
          {leaderboard.map((entry, index) => (
            <SimpleCell
              key={entry.character_id}
              before={
                <Avatar
                  size={48}
                  style={{
                    backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--vkui--color_background_secondary)'
                  }}
                >
                  {index + 1}
                </Avatar>
              }
              subtitle={`Всего: ${entry.total_items} | Уникальных: ${entry.unique_items}`}
              after={
                <div style={{ display: 'flex', gap: 4 }}>
                  {entry.mythic_count > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      backgroundColor: rarityColors.mythic,
                      color: 'white'
                    }}>
                      {entry.mythic_count}
                    </span>
                  )}
                  {entry.legendary_count > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: 11,
                      backgroundColor: rarityColors.legendary,
                      color: 'white'
                    }}>
                      {entry.legendary_count}
                    </span>
                  )}
                </div>
              }
            >
              {entry.character_name}
            </SimpleCell>
          ))}
          {leaderboard.length === 0 && (
            <Div>
              <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
                Рейтинг пуст
              </Text>
            </Div>
          )}
        </Group>
      )}

      {/* Модальное окно деталей серии */}
      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage
          id="series"
          onClose={() => {
            setActiveModal(null);
            setSelectedSeries(null);
          }}
          header={
            <ModalPageHeader>
              {selectedSeries?.name || 'Предметы коллекции'}
            </ModalPageHeader>
          }
        >
          {selectedSeries && (
            <Group>
              {loading && <Spinner size="m" style={{ margin: '20px auto' }} />}

              {!loading && seriesItems.length > 0 && (
                <>
                  <Div>
                    <Text style={{ marginBottom: 16, color: 'var(--vkui--color_text_secondary)' }}>
                      {selectedSeries.description}
                    </Text>
                  </Div>
                  {seriesItems.map((item) => {
                    const owned = collection.find(c => c.item_id === item.id);
                    return (
                      <Card key={item.id} mode="outline" style={{ marginBottom: 8, opacity: owned ? 1 : 0.6 }}>
                        <Div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 50,
                              height: 50,
                              borderRadius: 8,
                              backgroundColor: rarityColors[item.rarity],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 24
                            }}>
                              {owned ? '✓' : '?'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <Text weight="2" style={{ fontSize: 16 }}>
                                {owned ? item.name : '???'}
                              </Text>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 12,
                                  backgroundColor: rarityColors[item.rarity],
                                  color: 'white'
                                }}>
                                  {rarityLabels[item.rarity]}
                                </span>
                                <Text style={{ fontSize: 12, color: 'var(--vkui--color_text_secondary)' }}>
                                  Шанс: {item.drop_rate}%
                                </Text>
                                {owned && (
                                  <Counter mode="primary">×{owned.quantity}</Counter>
                                )}
                              </div>
                            </div>
                          </div>
                          {owned && item.description && (
                            <Text style={{ fontSize: 14, marginTop: 8, color: 'var(--vkui--color_text_secondary)' }}>
                              {item.description}
                            </Text>
                          )}
                        </Div>
                      </Card>
                    );
                  })}
                </>
              )}
            </Group>
          )}
        </ModalPage>
      </ModalRoot>

      {snackbar}
    </Panel>
  );
};

