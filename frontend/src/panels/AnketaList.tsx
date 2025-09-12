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
  PanelHeaderBack,
  Link,
  Search,
  FormLayoutGroup,
  Select,
  FormItem
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, useEffect } from 'react';
import { API_URL } from '../api';

interface Character {
  id: number;
  character_name: string;
  vk_id: number;
  status: string;
  rank: string;
  faction: string;
}

export const AnketaList: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    rank: '',
    faction: '',
    home_island: ''
  });

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const query = new URLSearchParams({
          status: 'Принято',
          ...filters
        }).toString();
        const response = await fetch(`${API_URL}/characters?${query}`);
        const data = await response.json();
        setCharacters(data);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        Реестр анкет
      </PanelHeader>
      {loading ? (
        <Spinner size="l" style={{ margin: '20px 0' }} />
      ) : (
        <Group>
          <Search value={search} onChange={(e) => setSearch(e.target.value)} />
          <FormLayoutGroup mode="horizontal">
            <FormItem top="Ранг">
              <Select
                name="rank"
                value={filters.rank}
                onChange={handleFilterChange}
                placeholder="Любой"
                options={[
                  { label: 'Любой', value: '' },
                  { label: 'F', value: 'F' }, { label: 'E', value: 'E' }, { label: 'D', value: 'D' },
                  { label: 'C', value: 'C' }, { label: 'B', value: 'B' }, { label: 'A', value: 'A' },
                  { label: 'S', value: 'S' }, { label: 'SS', value: 'SS' }, { label: 'SSS', value: 'SSS' },
                ]}
              />
            </FormItem>
            <FormItem top="Фракция">
              <Select
                name="faction"
                value={filters.faction}
                onChange={handleFilterChange}
                placeholder="Любая"
                options={[
                  { label: 'Любая', value: '' },
                  { label: 'Отражённый Свет Солнца', value: 'Отражённый Свет Солнца' },
                  { label: 'Чёрная Лилия', value: 'Чёрная Лилия' },
                  { label: 'Порядок', value: 'Порядок' },
                  { label: 'Нейтрал', value: 'Нейтрал' },
                ]}
              />
            </FormItem>
            <FormItem top="Родной остров">
              <Select
                name="home_island"
                value={filters.home_island}
                onChange={handleFilterChange}
                placeholder="Любой"
                options={[
                  { label: 'Любой', value: '' },
                  { label: 'Кага', value: 'Кага' }, { label: 'Хоши', value: 'Хоши' },
                  { label: 'Ичи', value: 'Ичи' }, { label: 'Куро', value: 'Куро' },
                  { label: 'Мидзу', value: 'Мидзу' }, { label: 'Сора', value: 'Сора' },
                ]}
              />
            </FormItem>
          </FormLayoutGroup>
          <CardGrid size="l">
            {characters.filter(c => c.character_name.toLowerCase().includes(search.toLowerCase())).map((char) => (
              <Card key={char.id} onClick={() => routeNavigator.push(`/anketa_detail/${char.id}`)}>
                <Header>{char.character_name}</Header>
                <Div>
                  <p><b>Ранг:</b> {char.rank}</p>
                  <p><b>Фракция:</b> {char.faction}</p>
                  <p><b>Автор:</b> <Link href={`https://vk.com/id${char.vk_id}`} target="_blank">{`ID: ${char.vk_id}`}</Link></p>
                </Div>
              </Card>
            ))}
          </CardGrid>
        </Group>
      )}
    </Panel>
  );
};