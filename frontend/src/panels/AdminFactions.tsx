import React, { useState, useEffect, useCallback } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  ScreenSpinner,
  Tabs,
  TabsItem,
  CardGrid,
  Card,
  Header,
  Text,
  Button,
  ButtonGroup,
  Input,
  Textarea,
  Snackbar,
  NavIdProps
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface Faction {
  id: number;
  name: string;
  description: string;
  creator_vk_id: number;
  status: 'pending' | 'approved' | 'rejected';
}

export const AdminFactions: React.FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);

  const fetchFactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/factions?status=${activeTab}`, {
        headers: { 'x-admin-id': localStorage.getItem('adminId') || '' }
      });
      const data = await response.json();
      setFactions(data);
    } catch (error) {
      console.error('Error fetching factions for admin:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFactions();
  }, [fetchFactions]);

  const handleStatusChange = async (factionId: number, status: 'approved' | 'rejected') => {
    try {
      await fetch(`${API_URL}/admin/factions/${factionId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': localStorage.getItem('adminId') || ''
        },
        body: JSON.stringify({ status })
      });
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Статус фракции обновлен.</Snackbar>);
      fetchFactions();
    } catch (error) {
      console.error('Error updating faction status:', error);
    }
  };

  const handleDelete = async (factionId: number) => {
    try {
      await fetch(`${API_URL}/admin/factions/${factionId}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': localStorage.getItem('adminId') || '' }
      });
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Фракция удалена.</Snackbar>);
      fetchFactions();
    } catch (error) {
      console.error('Error deleting faction:', error);
    }
  };
  
  const handleSaveEdit = async () => {
    if (!editingFaction) return;
    try {
      await fetch(`${API_URL}/admin/factions/${editingFaction.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': localStorage.getItem('adminId') || ''
        },
        body: JSON.stringify({ 
          name: editingFaction.name, 
          description: editingFaction.description 
        })
      });
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Фракция сохранена.</Snackbar>);
      setEditingFaction(null);
      fetchFactions();
    } catch (error) {
      console.error('Error saving faction:', error);
    }
  };

  if (editingFaction) {
    return (
      <Panel id={`${id}_edit`}>
        <PanelHeader before={<Button onClick={() => setEditingFaction(null)}>Назад</Button>}>
          Редактирование
        </PanelHeader>
        <Group>
          <Input 
            value={editingFaction.name} 
            onChange={(e) => setEditingFaction({ ...editingFaction, name: e.target.value })}
            placeholder="Название"
          />
          <Textarea 
            value={editingFaction.description}
            onChange={(e) => setEditingFaction({ ...editingFaction, description: e.target.value })}
            placeholder="Описание"
          />
          <ButtonGroup stretched>
            <Button size="l" onClick={handleSaveEdit}>Сохранить</Button>
          </ButtonGroup>
        </Group>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Управление фракциями
      </PanelHeader>

      {loading && <ScreenSpinner />}

      <Tabs>
        <TabsItem selected={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
          На рассмотрении
        </TabsItem>
        <TabsItem selected={activeTab === 'approved'} onClick={() => setActiveTab('approved')}>
          Одобренные
        </TabsItem>
        <TabsItem selected={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')}>
          Отклоненные
        </TabsItem>
      </Tabs>
      
      <Group>
        <CardGrid size="l">
          {factions.map(faction => (
            <Card key={faction.id}>
              <Header>{faction.name}</Header>
              <Text>{faction.description}</Text>
              <Text>Автор VK ID: {faction.creator_vk_id}</Text>
              <ButtonGroup stretched>
                {activeTab === 'pending' && (
                  <>
                    <Button mode="primary" onClick={() => handleStatusChange(faction.id, 'approved')}>Одобрить</Button>
                    <Button appearance="negative" onClick={() => handleStatusChange(faction.id, 'rejected')}>Отклонить</Button>
                  </>
                )}
                 <Button mode="secondary" onClick={() => setEditingFaction(faction)}>Редактировать</Button>
                 <Button appearance="negative" onClick={() => handleDelete(faction.id)}>Удалить</Button>
              </ButtonGroup>
            </Card>
          ))}
        </CardGrid>
      </Group>
      {snackbar}
    </Panel>
  );
};
