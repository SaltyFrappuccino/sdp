import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  Header,
  Cell,
  Button,
  ButtonGroup,
  Tabs,
  TabsItem,
  Search,
  Div,
  Title,
  Text,
  Spacing,
  Card,
  CardGrid,
  Spinner,
  FormItem,
  Input,
  Textarea,
  NativeSelect,
  Checkbox,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  PanelHeaderClose,
  FormLayoutGroup,
  Snackbar
} from '@vkontakte/vkui';
import { FC, useEffect, useState } from 'react';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { Icon24DismissSubstract, Icon28CheckCircleFill } from '@vkontakte/icons';

interface NavIdProps {
  id: string;
}

interface BestiaryTaxonomy {
  id: number;
  parent_id: number | null;
  level: string;
  name: string;
  name_latin: string;
  description: string;
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
  is_hostile: boolean;
  is_active: boolean;
}

const AdminBestiaryPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [taxonomy, setTaxonomy] = useState<BestiaryTaxonomy[]>([]);
  const [species, setSpecies] = useState<BestiarySpecies[]>([]);
  const [filteredSpecies, setFilteredSpecies] = useState<BestiarySpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('species');
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<any>(null);

  // Форма для вида
  const [speciesForm, setSpeciesForm] = useState<Partial<BestiarySpecies>>({
    family_id: 0,
    name: '',
    name_latin: '',
    mutation_class: 'Затронутые',
    danger_rank: 'F',
    habitat_type: 'Наземные',
    description: '',
    appearance: '',
    behavior: '',
    abilities: '',
    size_category: 'Средние',
    weight_min: 0,
    weight_max: 0,
    tags: '[]',
    image_url: '',
    is_hostile: true,
    is_active: true
  });

  // Форма для таксона
  const [taxonomyForm, setTaxonomyForm] = useState<Partial<BestiaryTaxonomy>>({
    parent_id: null,
    level: 'family',
    name: '',
    name_latin: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterSpecies();
  }, [species, searchQuery]);

  const fetchData = async () => {
    try {
      const [taxonomyRes, speciesRes] = await Promise.all([
        fetch(`${API_URL}/bestiary/taxonomy`),
        fetch(`${API_URL}/bestiary/species`)
      ]);

      const taxonomyData = await taxonomyRes.json();
      const speciesData = await speciesRes.json();

      setTaxonomy(taxonomyData);
      setSpecies(speciesData);
      setFilteredSpecies(speciesData);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSpecies = () => {
    if (!searchQuery) {
      setFilteredSpecies(species);
      return;
    }

    const filtered = species.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name_latin.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSpecies(filtered);
  };

  const handleCreateSpecies = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/bestiary/species`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(speciesForm)
      });

      if (response.ok) {
        setSnackbar(
          <Snackbar
            onClose={() => setSnackbar(null)}
            before={<Icon28CheckCircleFill fill="var(--vkui--color_icon_positive)" />}
          >
            Вид успешно создан
          </Snackbar>
        );
        setActiveModal(null);
        fetchData();
        resetSpeciesForm();
      }
    } catch (error) {
      console.error('Ошибка при создании вида:', error);
    }
  };

  const handleUpdateSpecies = async () => {
    if (!speciesForm.id) return;

    try {
      const response = await fetch(`${API_URL}/admin/bestiary/species/${speciesForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(speciesForm)
      });

      if (response.ok) {
        setSnackbar(
          <Snackbar
            onClose={() => setSnackbar(null)}
            before={<Icon28CheckCircleFill fill="var(--vkui--color_icon_positive)" />}
          >
            Вид успешно обновлён
          </Snackbar>
        );
        setActiveModal(null);
        fetchData();
        resetSpeciesForm();
      }
    } catch (error) {
      console.error('Ошибка при обновлении вида:', error);
    }
  };

  const handleDeleteSpecies = async (speciesId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот вид?')) return;

    try {
      const response = await fetch(`${API_URL}/admin/bestiary/species/${speciesId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSnackbar(
          <Snackbar
            onClose={() => setSnackbar(null)}
            before={<Icon24DismissSubstract fill="var(--vkui--color_icon_negative)" />}
          >
            Вид успешно удалён
          </Snackbar>
        );
        fetchData();
      }
    } catch (error) {
      console.error('Ошибка при удалении вида:', error);
    }
  };

  const resetSpeciesForm = () => {
    setSpeciesForm({
      family_id: 0,
      name: '',
      name_latin: '',
      mutation_class: 'Затронутые',
      danger_rank: 'F',
      habitat_type: 'Наземные',
      description: '',
      appearance: '',
      behavior: '',
      abilities: '',
      size_category: 'Средние',
      weight_min: 0,
      weight_max: 0,
      tags: '[]',
      image_url: '',
      is_hostile: true,
      is_active: true
    });
  };

  const handleEditSpecies = (creature: BestiarySpecies) => {
    setSpeciesForm(creature);
    setActiveModal('edit-species');
  };

  const getFamilies = () => {
    return taxonomy.filter(t => t.level === 'family');
  };

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id="create-species"
        header={
          <ModalPageHeader before={<PanelHeaderClose onClick={() => setActiveModal(null)} />}>
            Создать новый вид
          </ModalPageHeader>
        }
      >
        <FormLayoutGroup>
          <FormItem top="Семейство">
            <NativeSelect
              value={speciesForm.family_id || ''}
              onChange={(e) => setSpeciesForm({ ...speciesForm, family_id: Number(e.target.value) })}
            >
              <option value="">Выберите семейство</option>
              {getFamilies().map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.name_latin})</option>
              ))}
            </NativeSelect>
          </FormItem>

          <FormItem top="Название">
            <Input
              value={speciesForm.name}
              onChange={(e) => setSpeciesForm({ ...speciesForm, name: e.target.value })}
            />
          </FormItem>

          <FormItem top="Латинское название">
            <Input
              value={speciesForm.name_latin}
              onChange={(e) => setSpeciesForm({ ...speciesForm, name_latin: e.target.value })}
            />
          </FormItem>

          <FormItem top="Класс мутации">
            <NativeSelect
              value={speciesForm.mutation_class}
              onChange={(e) => setSpeciesForm({ ...speciesForm, mutation_class: e.target.value })}
            >
              <option value="Затронутые">Затронутые</option>
              <option value="Искажённые">Искажённые</option>
              <option value="Бестии">Бестии</option>
            </NativeSelect>
          </FormItem>

          <FormItem top="Ранг опасности">
            <NativeSelect
              value={speciesForm.danger_rank}
              onChange={(e) => setSpeciesForm({ ...speciesForm, danger_rank: e.target.value })}
            >
              {['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].map(rank => (
                <option key={rank} value={rank}>Ранг {rank}</option>
              ))}
            </NativeSelect>
          </FormItem>

          <FormItem top="Тип среды обитания">
            <NativeSelect
              value={speciesForm.habitat_type}
              onChange={(e) => setSpeciesForm({ ...speciesForm, habitat_type: e.target.value })}
            >
              <option value="Наземные">Наземные</option>
              <option value="Водные">Водные</option>
              <option value="Воздушные">Воздушные</option>
              <option value="Подземные">Подземные</option>
              <option value="Амфибии">Амфибии</option>
            </NativeSelect>
          </FormItem>

          <FormItem top="Описание">
            <Textarea
              value={speciesForm.description}
              onChange={(e) => setSpeciesForm({ ...speciesForm, description: e.target.value })}
            />
          </FormItem>

          <FormItem top="Внешность">
            <Textarea
              value={speciesForm.appearance}
              onChange={(e) => setSpeciesForm({ ...speciesForm, appearance: e.target.value })}
            />
          </FormItem>

          <FormItem top="Поведение">
            <Textarea
              value={speciesForm.behavior}
              onChange={(e) => setSpeciesForm({ ...speciesForm, behavior: e.target.value })}
            />
          </FormItem>

          <FormItem top="Способности">
            <Textarea
              value={speciesForm.abilities}
              onChange={(e) => setSpeciesForm({ ...speciesForm, abilities: e.target.value })}
            />
          </FormItem>

          <FormItem top="Категория размера">
            <NativeSelect
              value={speciesForm.size_category}
              onChange={(e) => setSpeciesForm({ ...speciesForm, size_category: e.target.value })}
            >
              <option value="Мелкие">Мелкие</option>
              <option value="Средние">Средние</option>
              <option value="Крупные">Крупные</option>
              <option value="Гигантские">Гигантские</option>
            </NativeSelect>
          </FormItem>

          <FormItem top="Вес (мин, кг)">
            <Input
              type="number"
              value={speciesForm.weight_min}
              onChange={(e) => setSpeciesForm({ ...speciesForm, weight_min: Number(e.target.value) })}
            />
          </FormItem>

          <FormItem top="Вес (макс, кг)">
            <Input
              type="number"
              value={speciesForm.weight_max}
              onChange={(e) => setSpeciesForm({ ...speciesForm, weight_max: Number(e.target.value) })}
            />
          </FormItem>

          <FormItem>
            <Checkbox
              checked={speciesForm.is_hostile}
              onChange={(e) => setSpeciesForm({ ...speciesForm, is_hostile: e.target.checked })}
            >
              Враждебный
            </Checkbox>
          </FormItem>

          <FormItem>
            <Checkbox
              checked={speciesForm.is_active}
              onChange={(e) => setSpeciesForm({ ...speciesForm, is_active: e.target.checked })}
            >
              Активен
            </Checkbox>
          </FormItem>

          <FormItem>
            <Button size="l" stretched onClick={handleCreateSpecies}>
              Создать вид
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>

      <ModalPage
        id="edit-species"
        header={
          <ModalPageHeader before={<PanelHeaderClose onClick={() => setActiveModal(null)} />}>
            Редактировать вид
          </ModalPageHeader>
        }
      >
        <FormLayoutGroup>
          <FormItem top="Семейство">
            <NativeSelect
              value={speciesForm.family_id || ''}
              onChange={(e) => setSpeciesForm({ ...speciesForm, family_id: Number(e.target.value) })}
            >
              {getFamilies().map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </NativeSelect>
          </FormItem>

          <FormItem top="Название">
            <Input
              value={speciesForm.name}
              onChange={(e) => setSpeciesForm({ ...speciesForm, name: e.target.value })}
            />
          </FormItem>

          <FormItem top="Латинское название">
            <Input
              value={speciesForm.name_latin}
              onChange={(e) => setSpeciesForm({ ...speciesForm, name_latin: e.target.value })}
            />
          </FormItem>

          <FormItem top="Класс мутации">
            <NativeSelect
              value={speciesForm.mutation_class}
              onChange={(e) => setSpeciesForm({ ...speciesForm, mutation_class: e.target.value })}
            >
              <option value="Затронутые">Затронутые</option>
              <option value="Искажённые">Искажённые</option>
              <option value="Бестии">Бестии</option>
            </NativeSelect>
          </FormItem>

          <FormItem top="Ранг опасности">
            <NativeSelect
              value={speciesForm.danger_rank}
              onChange={(e) => setSpeciesForm({ ...speciesForm, danger_rank: e.target.value })}
            >
              {['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].map(rank => (
                <option key={rank} value={rank}>Ранг {rank}</option>
              ))}
            </NativeSelect>
          </FormItem>

          <FormItem top="Описание">
            <Textarea
              value={speciesForm.description}
              onChange={(e) => setSpeciesForm({ ...speciesForm, description: e.target.value })}
            />
          </FormItem>

          <FormItem top="Внешность">
            <Textarea
              value={speciesForm.appearance}
              onChange={(e) => setSpeciesForm({ ...speciesForm, appearance: e.target.value })}
            />
          </FormItem>

          <FormItem top="Поведение">
            <Textarea
              value={speciesForm.behavior}
              onChange={(e) => setSpeciesForm({ ...speciesForm, behavior: e.target.value })}
            />
          </FormItem>

          <FormItem top="Способности">
            <Textarea
              value={speciesForm.abilities}
              onChange={(e) => setSpeciesForm({ ...speciesForm, abilities: e.target.value })}
            />
          </FormItem>

          <FormItem>
            <Checkbox
              checked={speciesForm.is_hostile}
              onChange={(e) => setSpeciesForm({ ...speciesForm, is_hostile: e.target.checked })}
            >
              Враждебный
            </Checkbox>
          </FormItem>

          <FormItem>
            <Checkbox
              checked={speciesForm.is_active}
              onChange={(e) => setSpeciesForm({ ...speciesForm, is_active: e.target.checked })}
            >
              Активен
            </Checkbox>
          </FormItem>

          <FormItem>
            <Button size="l" stretched onClick={handleUpdateSpecies}>
              Сохранить изменения
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Управление Бестиарием
      </PanelHeader>

      <Group>
        <Tabs>
          <TabsItem selected={activeTab === 'species'} onClick={() => setActiveTab('species')}>
            Виды
          </TabsItem>
          <TabsItem selected={activeTab === 'taxonomy'} onClick={() => setActiveTab('taxonomy')}>
            Таксономия
          </TabsItem>
        </Tabs>
      </Group>

      {activeTab === 'species' && (
        <>
          <Group>
            <Div>
              <Button size="l" stretched onClick={() => setActiveModal('create-species')}>
                ➕ Создать новый вид
              </Button>
            </Div>
          </Group>

          <Group>
            <Search value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск..." />
          </Group>

          <Group header={<Header>Виды ({filteredSpecies.length})</Header>}>
            {loading ? (
              <Div style={{ textAlign: 'center', padding: '20px' }}>
                <Spinner size="l" />
              </Div>
            ) : (
              filteredSpecies.map((creature) => (
                <Cell
                  key={creature.id}
                  multiline
                  subtitle={
                    <div>
                      <Text style={{ fontSize: '14px', color: 'var(--vkui--color_text_secondary)' }}>
                        {creature.name_latin} | {creature.mutation_class} | Ранг {creature.danger_rank}
                      </Text>
                      <Text style={{ fontSize: '13px', marginTop: '4px' }}>{creature.description}</Text>
                    </div>
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text weight="2">{creature.name}</Text>
                    <ButtonGroup mode="horizontal" gap="s">
                      <Button size="s" onClick={() => handleEditSpecies(creature)}>Изменить</Button>
                      <Button size="s" appearance="negative" onClick={() => handleDeleteSpecies(creature.id)}>Удалить</Button>
                    </ButtonGroup>
                  </div>
                </Cell>
              ))
            )}
          </Group>
        </>
      )}

      {activeTab === 'taxonomy' && (
        <Group header={<Header>Таксономия</Header>}>
          {taxonomy.map((taxon) => (
            <Cell
              key={taxon.id}
              multiline
              subtitle={`${taxon.level} | ${taxon.name_latin || ''}`}
            >
              {taxon.name}
            </Cell>
          ))}
        </Group>
      )}

      {modal}
      {snackbar}
    </Panel>
  );
};

export default AdminBestiaryPanel;

