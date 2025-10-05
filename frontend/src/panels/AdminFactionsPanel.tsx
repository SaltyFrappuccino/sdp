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
  Placeholder,
  Alert,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormLayoutGroup,
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
import { Icon24CheckCircleOutline, Icon24ErrorCircle, Icon24Add, Icon24Delete } from '@vkontakte/icons';

interface Faction {
  id: number;
  name: string;
  description: string;
  leader_character_id: number | null;
  leader_name: string | null;
  hierarchy: string;
  rules: string;
  color: string;
  icon_url: string;
  created_at: string;
  updated_at: string;
}

interface Character {
  id: number;
  character_name: string;
  rank: string;
  faction: string;
}

const MODAL_PAGE_FACTION = 'faction';

export const AdminFactionsPanel: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [factions, setFactions] = useState<Faction[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState({ factions: true, characters: true });
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [editingFaction, setEditingFaction] = useState<Partial<Faction> | null>(null);
  const [factionSearch, setFactionSearch] = useState('');

  const fetchFactions = async () => {
    try {
      const response = await fetch(`${API_URL}/factions`);
      const data = await response.json();
      setFactions(data);
    } catch (error) {
      console.error('Failed to fetch factions:', error);
      showResultSnackbar('Не удалось загрузить фракции', false);
    } finally {
      setLoading(prev => ({ ...prev, factions: false }));
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/characters?status=Принято`);
      const data = await response.json();
      setCharacters(data);
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

  const openFactionModal = (faction: Partial<Faction> | null) => {
    setEditingFaction(faction);
    setActiveModal(MODAL_PAGE_FACTION);
  };

  const handleSaveFaction = async () => {
    if (!editingFaction?.name) {
      showResultSnackbar('Название фракции обязательно', false);
      return;
    }

    try {
      const url = editingFaction.id ? `${API_URL}/factions/${editingFaction.id}` : `${API_URL}/factions`;
      const method = editingFaction.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFaction)
      });

      if (response.ok) {
        showResultSnackbar(editingFaction.id ? 'Фракция обновлена' : 'Фракция создана', true);
        setActiveModal(null);
        setEditingFaction(null);
        fetchFactions();
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка при сохранении', false);
      }
    } catch (error) {
      console.error('Failed to save faction:', error);
      showResultSnackbar('Не удалось сохранить фракцию', false);
    }
  };

  const handleDeleteFaction = async (factionId: number) => {
    setPopout(
      <Alert
        actions={[
          {
            title: 'Отмена',
            mode: 'cancel',
          },
          {
            title: 'Удалить',
            mode: 'destructive',
            action: async () => {
              try {
                const response = await fetch(`${API_URL}/factions/${factionId}`, {
                  method: 'DELETE',
                });
                if (response.ok) {
                  showResultSnackbar('Фракция успешно удалена', true);
                  fetchFactions();
                } else {
                  const error = await response.json();
                  showResultSnackbar(error.error || 'Ошибка удаления фракции', false);
                }
              } catch (error) {
                console.error('Failed to delete faction:', error);
                showResultSnackbar('Сетевая ошибка', false);
              }
            },
          },
        ]}
        onClose={() => setPopout(null)}
        title="Подтверждение удаления"
        description="Вы уверены, что хотите удалить эту фракцию?"
      />
    );
  };

  const filteredFactions = factions.filter(faction =>
    faction.name.toLowerCase().includes(factionSearch.toLowerCase()) ||
    (faction.description && faction.description.toLowerCase().includes(factionSearch.toLowerCase()))
  );

  useEffect(() => {
    fetchFactions();
    fetchCharacters();
  }, []);

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage
        id={MODAL_PAGE_FACTION}
        header={
          <ModalPageHeader>
            {editingFaction?.id ? 'Редактировать фракцию' : 'Создать фракцию'}
          </ModalPageHeader>
        }
      >
        <FormLayoutGroup>
          <FormItem top="Название фракции" status={!editingFaction?.name ? 'error' : 'default'}>
            <Input
              value={editingFaction?.name || ''}
              onChange={(e) => setEditingFaction(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название фракции"
            />
          </FormItem>
          
          <FormItem top="Описание">
            <Textarea
              value={editingFaction?.description || ''}
              onChange={(e) => setEditingFaction(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание фракции"
            />
          </FormItem>

          <FormItem top="Лидер фракции">
            <Select
              value={editingFaction?.leader_character_id || ''}
              onChange={(e) => setEditingFaction(prev => ({ ...prev, leader_character_id: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Выберите лидера"
              options={[
                { label: 'Без лидера', value: '' },
                ...(characters && characters.length > 0 ? characters.map(char => ({
                  label: `${char.character_name} (${char.rank})`,
                  value: char.id.toString()
                })) : [])
              ]}
            />
          </FormItem>

          <FormItem top="Цвет фракции">
            <Input
              type="color"
              value={editingFaction?.color || '#0077FF'}
              onChange={(e) => setEditingFaction(prev => ({ ...prev, color: e.target.value }))}
            />
          </FormItem>

          <FormItem top="URL иконки">
            <Input
              value={editingFaction?.icon_url || ''}
              onChange={(e) => setEditingFaction(prev => ({ ...prev, icon_url: e.target.value }))}
              placeholder="https://example.com/icon.png"
            />
          </FormItem>

          <FormItem top="Иерархия (JSON)">
            <Textarea
              value={editingFaction?.hierarchy || '{}'}
              onChange={(e) => setEditingFaction(prev => ({ ...prev, hierarchy: e.target.value }))}
              placeholder='{"rank1": "Описание", "rank2": "Описание"}'
            />
          </FormItem>

          <FormItem top="Правила (JSON)">
            <Textarea
              value={editingFaction?.rules || '{}'}
              onChange={(e) => setEditingFaction(prev => ({ ...prev, rules: e.target.value }))}
              placeholder='{"rule1": "Описание", "rule2": "Описание"}'
            />
          </FormItem>

          <ButtonGroup mode="horizontal" gap="m" stretched>
            <Button onClick={() => setActiveModal(null)}>Отмена</Button>
            <Button onClick={handleSaveFaction} mode="primary">
              {editingFaction?.id ? 'Обновить' : 'Создать'}
            </Button>
          </ButtonGroup>
        </FormLayoutGroup>
      </ModalPage>
    </ModalRoot>
  );

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Админ - Фракции
      </PanelHeader>

      <Group>
        <Header
          after={
            <Button
              size="s"
              onClick={() => openFactionModal({})}
            >
              ➕ Создать
            </Button>
          }
        >
          Статистика фракций
        </Header>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {factions.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                Кастомных фракций
              </div>
            </div>
          </Card>
          <Card mode="outline">
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--vkui--color_text_accent)' }}>
                {factions.filter(f => f.leader_character_id).length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_secondary)' }}>
                С лидерами
              </div>
            </div>
          </Card>
        </div>
      </Group>

      <Group>
        <Search
          value={factionSearch}
          onChange={(e) => setFactionSearch(e.target.value)}
          placeholder="Поиск фракций..."
        />
      </Group>

      <Group>
        <Header
          after={
            <Button
              size="s"
              onClick={() => openFactionModal(null)}
            >
              Создать фракцию
            </Button>
          }
        >
          Кастомные фракции
        </Header>

        {loading.factions ? (
          <Div>
            <Placeholder>Загрузка...</Placeholder>
          </Div>
        ) : (
          <CardGrid size="l">
            {filteredFactions && filteredFactions.length > 0 ? filteredFactions.map((faction) => (
              <Card key={faction.id} mode="outline">
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: faction.color,
                        borderRadius: '50%',
                        marginRight: '8px'
                      }}
                    />
                    <strong>{faction.name}</strong>
                  </div>
                  
                  {faction.description && (
                    <div style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                      {faction.description}
                    </div>
                  )}
                  
                  {faction.leader_name && (
                    <div style={{ marginBottom: '8px', fontSize: '14px' }}>
                      Лидер: {faction.leader_name}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '12px', color: 'var(--vkui--color_text_tertiary)' }}>
                    Создана: {new Date(faction.created_at).toLocaleDateString('ru-RU')}
                  </div>
                  
                  <ButtonGroup mode="horizontal" gap="s" style={{ marginTop: '12px' }}>
                    <Button
                      size="s"
                      onClick={() => openFactionModal(faction)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      size="s"
                      appearance="negative"
                      onClick={() => handleDeleteFaction(faction.id)}
                    >
                      <Icon24Delete />
                    </Button>
                  </ButtonGroup>
                </div>
              </Card>
            )) : (
              <Placeholder>Нет фракций</Placeholder>
            )}
          </CardGrid>
        )}
      </Group>

      {modal}
      {popout}
      {snackbar}
    </Panel>
  );
};
