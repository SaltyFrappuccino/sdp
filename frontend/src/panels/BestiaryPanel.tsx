import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  Cell,
  Avatar,
  Tabs,
  TabsItem,
  Search,
  CustomSelect,
  CustomSelectOption,
  Div,
  Title,
  Text,
  Spacing,
  Card,
  CardGrid,
  Spinner,
  InfoRow,
  Chip
} from '@vkontakte/vkui';
import { FC, useEffect, useState } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface BestiarySpecies {
  id: number;
  family_id: number;
  name: string;
  name_latin: string;
  mutation_class: string;
  danger_rank: string;
  habitat_type: string;
  description: string;
  appearance: string;
  behavior: string;
  abilities: string;
  size_category: string;
  weight_min: number;
  weight_max: number;
  tags: string;
  image_url: string;
  islands: string;
  strength_tag: string;
  speed_tag: string;
  defense_tag: string;
  special_tag: string;
  credit_value_min: number;
  credit_value_max: number;
}

const BestiaryPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [species, setSpecies] = useState<BestiarySpecies[]>([]);
  const [filteredSpecies, setFilteredSpecies] = useState<BestiarySpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIsland, setSelectedIsland] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    fetchSpecies();
  }, []);

  useEffect(() => {
    filterSpecies();
  }, [species, searchQuery, selectedIsland, selectedClass, selectedType, activeTab]);

  const fetchSpecies = async () => {
    try {
      const response = await fetch(`${API_URL}/bestiary/species`);
      const data = await response.json();
      setSpecies(data);
      setFilteredSpecies(data);
    } catch (error) {
      console.error('Ошибка при загрузке бестиария:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSpecies = () => {
    let filtered = [...species];

    // Фильтр по вкладке (тип среды)
    if (activeTab !== 'all') {
      filtered = filtered.filter(s => s.habitat_type === activeTab);
    }

    // Поиск
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name_latin.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фильтр по острову
    if (selectedIsland) {
      filtered = filtered.filter(s => s.islands?.includes(selectedIsland));
    }

    // Фильтр по классу мутации
    if (selectedClass) {
      filtered = filtered.filter(s => s.mutation_class === selectedClass);
    }

    // Фильтр по типу среды (для детального фильтра)
    if (selectedType) {
      filtered = filtered.filter(s => s.habitat_type === selectedType);
    }

    setFilteredSpecies(filtered);
  };

  const getDangerColor = (rank: string) => {
    const colors: Record<string, string> = {
      'F': '#A0A0A0',
      'E': '#90EE90',
      'D': '#87CEEB',
      'C': '#FFD700',
      'B': '#FFA500',
      'A': '#FF6347',
      'S': '#FF1493',
      'SS': '#8B00FF',
      'SSS': '#FF0000'
    };
    return colors[rank] || '#A0A0A0';
  };

  const getMutationClassColor = (mutationClass: string) => {
    const colors: Record<string, string> = {
      'Затронутые': '#90EE90',
      'Искажённые': '#FFA500',
      'Бестии': '#FF4500'
    };
    return colors[mutationClass] || '#A0A0A0';
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Бестиарий
      </PanelHeader>

      <Group>
        <Search value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по названию..." />
      </Group>

      <Group>
        <Tabs>
          <TabsItem selected={activeTab === 'all'} onClick={() => setActiveTab('all')}>
            Все
          </TabsItem>
          <TabsItem selected={activeTab === 'Наземные'} onClick={() => setActiveTab('Наземные')}>
            🌲 Наземные
          </TabsItem>
          <TabsItem selected={activeTab === 'Водные'} onClick={() => setActiveTab('Водные')}>
            🌊 Водные
          </TabsItem>
          <TabsItem selected={activeTab === 'Воздушные'} onClick={() => setActiveTab('Воздушные')}>
            ☁️ Воздушные
          </TabsItem>
        </Tabs>
      </Group>

      <Group header={<Header>Фильтры</Header>}>
        <Div>
          <CustomSelect
            placeholder="Остров"
            value={selectedIsland}
            onChange={(e) => setSelectedIsland(e.target.value)}
            options={[
              { label: 'Все острова', value: '' },
              { label: 'Кага', value: 'Кага' },
              { label: 'Хоши', value: 'Хоши' },
              { label: 'Ичи', value: 'Ичи' },
              { label: 'Куро', value: 'Куро' },
              { label: 'Мидзу', value: 'Мидзу' },
              { label: 'Сора', value: 'Сора' }
            ]}
          />
          <Spacing size={12} />
          <CustomSelect
            placeholder="Класс мутации"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            options={[
              { label: 'Все классы', value: '' },
              { label: 'Затронутые', value: 'Затронутые' },
              { label: 'Искажённые', value: 'Искажённые' },
              { label: 'Бестии', value: 'Бестии' }
            ]}
          />
        </Div>
      </Group>

      <Group header={<Header>Существа ({filteredSpecies.length})</Header>}>
        {loading ? (
          <Div style={{ textAlign: 'center', padding: '20px' }}>
            <Spinner size="l" />
          </Div>
        ) : filteredSpecies.length === 0 ? (
          <Div>
            <Text style={{ textAlign: 'center', color: 'var(--vkui--color_text_secondary)' }}>
              Существа не найдены
            </Text>
          </Div>
        ) : (
          <CardGrid size="l">
            {filteredSpecies.map((creature) => (
              <Card key={creature.id} mode="shadow">
                <Div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <Title level="3" weight="2" style={{ marginBottom: '4px' }}>
                        {creature.name}
                      </Title>
                      <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: '14px', fontStyle: 'italic' }}>
                        {creature.name_latin}
                      </Text>
                    </div>
                    <Chip
                      style={{
                        backgroundColor: getDangerColor(creature.danger_rank),
                        color: '#fff',
                        fontWeight: 'bold'
                      }}
                    >
                      Ранг {creature.danger_rank}
                    </Chip>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <Chip style={{ backgroundColor: getMutationClassColor(creature.mutation_class), color: '#fff', marginRight: '8px' }}>
                      {creature.mutation_class}
                    </Chip>
                    <Chip>{creature.habitat_type}</Chip>
                    {creature.size_category && <Chip>{creature.size_category}</Chip>}
                  </div>

                  <Text style={{ marginBottom: '12px' }}>{creature.description}</Text>

                  <InfoRow header="Внешность">
                    <Text style={{ fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                      {creature.appearance}
                    </Text>
                  </InfoRow>

                  {creature.abilities && (
                    <InfoRow header="Способности">
                      <Text style={{ fontSize: '14px', color: 'var(--vkui--color_accent)' }}>
                        {creature.abilities}
                      </Text>
                    </InfoRow>
                  )}

                  {creature.islands && (
                    <InfoRow header="Места обитания">
                      <Text style={{ fontSize: '14px' }}>🗺️ {creature.islands}</Text>
                    </InfoRow>
                  )}

                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {creature.strength_tag && (
                      <Chip style={{ fontSize: '12px' }}>💪 Сила: {creature.strength_tag}</Chip>
                    )}
                    {creature.speed_tag && (
                      <Chip style={{ fontSize: '12px' }}>⚡ Скорость: {creature.speed_tag}</Chip>
                    )}
                    {creature.defense_tag && (
                      <Chip style={{ fontSize: '12px' }}>🛡️ Защита: {creature.defense_tag}</Chip>
                    )}
                  </div>

                  {creature.credit_value_min && (
                    <div style={{ marginTop: '12px', padding: '8px', backgroundColor: 'var(--vkui--color_background_secondary)', borderRadius: '8px' }}>
                      <Text weight="2">💰 Ценность: {creature.credit_value_min.toLocaleString()} - {creature.credit_value_max.toLocaleString()} ₭</Text>
                    </div>
                  )}
                </Div>
              </Card>
            ))}
          </CardGrid>
        )}
      </Group>
    </Panel>
  );
};

export default BestiaryPanel;

