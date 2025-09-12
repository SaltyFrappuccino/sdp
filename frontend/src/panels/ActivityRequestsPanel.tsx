import { FC, useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  Header,
  Button,
  Card,
  Text,
  Div,
  ScreenSpinner,
  Snackbar,
  IconButton,
  ModalRoot,
  ModalPage,
  ModalPageHeader,
  FormItem,
  Textarea,
  Select,
  PanelHeaderBack
} from '@vkontakte/vkui';
import { Icon24Add, Icon24Delete, Icon24Settings } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { UserInfo } from '@vkontakte/vk-bridge';
import { ActivityRequestForm } from '../components/ActivityRequestForm';
import { API_URL } from '../api';

interface ActivityRequest {
  id: number;
  character_id: number;
  character_name: string;
  nickname: string;
  request_type: 'quest' | 'gate';
  quest_rank?: string;
  gate_rank?: string;
  character_rank: string;
  faction: string;
  team_members: string;
  rank_promotion?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reward?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

interface Character {
  id: number;
  character_name: string;
  nickname: string;
}

interface ActivityRequestsPanelProps extends NavIdProps {
  fetchedUser?: UserInfo;
  isAdmin?: boolean;
}

export const ActivityRequestsPanel: FC<ActivityRequestsPanelProps> = ({ id, fetchedUser, isAdmin = false }) => {
  const routeNavigator = useRouteNavigator();
  const [requests, setRequests] = useState<ActivityRequest[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ActivityRequest | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editReward, setEditReward] = useState('');
  const [editAdminNotes, setEditAdminNotes] = useState('');

  useEffect(() => {
    fetchRequests();
    fetchAllCharacters();
  }, [fetchedUser?.id]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      if (!isAdmin && !fetchedUser?.id) {
        console.error('User ID is not available');
        setRequests([]);
        return;
      }
      
      const url = isAdmin 
        ? `${API_URL}/activity-requests`
        : `${API_URL}/activity-requests`;
      
      const response = await fetch(url, {
        headers: isAdmin ? {
          'x-admin-id': localStorage.getItem('adminId') || ''
        } : {}
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        console.error('Failed to fetch requests');
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/characters?status=Принято&rank=&faction=&home_island=`);
      if (response.ok) {
        const data = await response.json();
        setAllCharacters(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch all characters:', error);
    }
  };

  const handleDeleteRequest = async (requestId: number) => {
    if (!isAdmin) return;
    
    if (!window.confirm('Вы уверены, что хотите удалить эту заявку?')) return;

    try {
      const response = await fetch(`${API_URL}/activity-requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-id': localStorage.getItem('adminId') || ''
        }
      });

      if (response.ok) {
        setRequests(prev => prev.filter(req => req.id !== requestId));
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            Заявка удалена
          </Snackbar>
        );
      } else {
        const error = await response.json();
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            Ошибка: {error.error}
          </Snackbar>
        );
      }
    } catch (error) {
      console.error('Failed to delete request:', error);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при удалении заявки
        </Snackbar>
      );
    }
  };

  const handleUpdateRequest = async () => {
    if (!editingRequest || !isAdmin) return;

    try {
      const response = await fetch(`${API_URL}/activity-requests/${editingRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': localStorage.getItem('adminId') || ''
        },
        body: JSON.stringify({
          status: editStatus,
          reward: editReward,
          admin_notes: editAdminNotes
        })
      });

      if (response.ok) {
        setRequests(prev => prev.map(req => 
          req.id === editingRequest.id 
            ? { ...req, status: editStatus as any, reward: editReward, admin_notes: editAdminNotes }
            : req
        ));
        setEditingRequest(null);
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            Заявка обновлена
          </Snackbar>
        );
      } else {
        const error = await response.json();
        setSnackbar(
          <Snackbar onClose={() => setSnackbar(null)}>
            Ошибка: {error.error}
          </Snackbar>
        );
      }
    } catch (error) {
      console.error('Failed to update request:', error);
      setSnackbar(
        <Snackbar onClose={() => setSnackbar(null)}>
          Ошибка при обновлении заявки
        </Snackbar>
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'var(--vkui--color_text_secondary)';
      case 'completed': return 'var(--vkui--color_text_positive)';
      case 'failed': return 'var(--vkui--color_text_negative)';
      case 'cancelled': return 'var(--vkui--color_text_secondary)';
      default: return 'var(--vkui--color_text_primary)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'В ожидании';
      case 'completed': return 'Выполнено';
      case 'failed': return 'Провалено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <ScreenSpinner />;
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        {isAdmin ? 'Управление заявками' : 'Все Заявки в РП'}
      </PanelHeader>

      {!isAdmin && (
        <Group>
          <Button 
            size="l" 
            stretched 
            before={<Icon24Add />}
            onClick={() => setShowCreateForm(true)}
          >
            Создать заявку
          </Button>
        </Group>
      )}

      <Group header={<Header>Заявки на активности</Header>}>
        {requests.length === 0 ? (
          <Div>
            <Text>Заявок пока нет</Text>
          </Div>
        ) : (
          requests.map(request => (
            <Card key={request.id} style={{ marginBottom: '12px' }}>
              <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <Text weight="2">{request.character_name}{request.nickname ? ` (${request.nickname})` : ''}</Text>
                    <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                      {request.request_type === 'quest' ? 'Квест' : 'Врата'} • 
                      Ранг: {request.request_type === 'quest' ? request.quest_rank : request.gate_rank} • 
                      Персонаж: {request.character_rank} {request.faction}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text style={{ color: getStatusColor(request.status) }}>
                      {getStatusText(request.status)}
                    </Text>
                    {isAdmin && (
                      <>
                        <IconButton 
                          onClick={() => {
                            setEditingRequest(request);
                            setEditStatus(request.status);
                            setEditReward(request.reward || '');
                            setEditAdminNotes(request.admin_notes || '');
                          }}
                        >
                          <Icon24Settings />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleDeleteRequest(request.id)}
                        >
                          <Icon24Delete />
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
                
                {request.rank_promotion && (
                  <Text style={{ color: 'var(--vkui--color_text_accent)', marginBottom: '8px' }}>
                    🎯 {request.rank_promotion}
                  </Text>
                )}

                {request.team_members && JSON.parse(request.team_members).length > 0 && (
                  <Text style={{ marginBottom: '8px' }}>
                    <strong>Команда:</strong> {JSON.parse(request.team_members).map((id: number) => {
                      const char = allCharacters.find(c => c.id === id);
                      return char ? `${char.character_name}${char.nickname ? ` (${char.nickname})` : ''}` : `ID: ${id}`;
                    }).join(', ')}
                  </Text>
                )}

                {request.reward && (
                  <Text style={{ color: 'var(--vkui--color_text_positive)', marginBottom: '8px' }}>
                    <strong>Награда:</strong> {request.reward}
                  </Text>
                )}

                {request.admin_notes && (
                  <Text style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: '8px' }}>
                    <strong>Заметки админа:</strong> {request.admin_notes}
                  </Text>
                )}

                <Text style={{ color: 'var(--vkui--color_text_secondary)', fontSize: '12px' }}>
                  Создано: {formatDate(request.created_at)}
                </Text>
              </div>
            </Card>
          ))
        )}
      </Group>

      {showCreateForm && (
        <ModalRoot activeModal="create-request">
          <ModalPage
            id="create-request"
            onClose={() => setShowCreateForm(false)}
            header={<ModalPageHeader>Создать заявку</ModalPageHeader>}
          >
            <ActivityRequestForm
              vkId={fetchedUser?.id}
              onRequestCreated={() => {
                setShowCreateForm(false);
                fetchRequests();
                setSnackbar(
                  <Snackbar onClose={() => setSnackbar(null)}>
                    Заявка создана
                  </Snackbar>
                );
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </ModalPage>
        </ModalRoot>
      )}

      {editingRequest && (
        <ModalRoot activeModal="edit-request">
          <ModalPage
            id="edit-request"
            onClose={() => setEditingRequest(null)}
            header={<ModalPageHeader>Редактировать заявку</ModalPageHeader>}
          >
            <Group>
              <FormItem top="Статус">
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  options={[
                    { label: 'В ожидании', value: 'pending' },
                    { label: 'Выполнено', value: 'completed' },
                    { label: 'Провалено', value: 'failed' },
                    { label: 'Отменено', value: 'cancelled' }
                  ]}
                />
              </FormItem>

              <FormItem top="Награда">
                <Textarea
                  placeholder="Опишите награду для участников"
                  value={editReward}
                  onChange={(e) => setEditReward(e.target.value)}
                />
              </FormItem>

              <FormItem top="Заметки админа">
                <Textarea
                  placeholder="Дополнительные заметки"
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                />
              </FormItem>

              <Div>
                <Button size="l" stretched onClick={handleUpdateRequest}>
                  Сохранить изменения
                </Button>
                <Button 
                  size="l" 
                  mode="secondary" 
                  stretched 
                  onClick={() => setEditingRequest(null)}
                  style={{ marginTop: '8px' }}
                >
                  Отмена
                </Button>
              </Div>
            </Group>
          </ModalPage>
        </ModalRoot>
      )}

      {snackbar}
    </Panel>
  );
};
