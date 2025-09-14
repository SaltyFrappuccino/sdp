import React, { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Button, Card, Div, Text, Input, Select, Snackbar, ModalCard, ModalPageContent } from '@vkontakte/vkui';
import { API_URL } from '../api';
import { Icon28CalendarOutline, Icon28UsersOutline, Icon28AddOutline, Icon28DeleteOutline } from '@vkontakte/icons';

interface NavIdProps {
  id: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  event_type: string;
  status: string;
  difficulty: string;
  recommended_rank: string;
  max_participants: number;
  min_participants: number;
  is_deadly: boolean;
  is_open_world: boolean;
  rewards: any;
  requirements: any;
  location: string;
  location_description: string;
  start_date: string;
  end_date: string;
  application_deadline: string;
  organizer_name: string;
  additional_info: string;
  participant_count: number;
}

interface EventParticipant {
  id: number;
  character_name: string;
  nickname: string;
  character_rank: string;
  faction: string;
  status: string;
  application_data: any;
  joined_at: string;
}

export const AdminEventsPanel: FC<NavIdProps> = ({ id }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'quest',
    difficulty: 'D',
    recommended_rank: 'D',
    max_participants: 10,
    min_participants: 1,
    is_deadly: false,
    is_open_world: false,
    location: '',
    location_description: '',
    start_date: '',
    end_date: '',
    application_deadline: '',
    organizer_name: '',
    additional_info: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/events`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchEventParticipants = async (eventId: number) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}`);
      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  };

  const showResultSnackbar = (message: string, _isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon28CalendarOutline />}
      >
        {message}
      </Snackbar>
    );
  };

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.description) {
      showResultSnackbar('Заполните обязательные поля', false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({
          ...newEvent,
          organizer_vk_id: 1,
          rewards: {},
          requirements: {},
          event_data: {}
        })
      });

      if (response.ok) {
        showResultSnackbar('Ивент создан успешно!', true);
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          event_type: 'quest',
          difficulty: 'D',
          recommended_rank: 'D',
          max_participants: 10,
          min_participants: 1,
          is_deadly: false,
          is_open_world: false,
          location: '',
          location_description: '',
          start_date: '',
          end_date: '',
          application_deadline: '',
          organizer_name: '',
          additional_info: ''
        });
        fetchEvents();
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка создания ивента', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: number, status: string) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        showResultSnackbar('Статус ивента обновлен', true);
        fetchEvents();
      } else {
        showResultSnackbar('Ошибка обновления статуса', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const updateParticipantStatus = async (eventId: number, participantId: number, status: string) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}/participants/${participantId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        showResultSnackbar('Статус участника обновлен', true);
        fetchEventParticipants(eventId);
      } else {
        showResultSnackbar('Ошибка обновления статуса участника', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот ивент?')) return;

    try {
      const response = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'x-admin-id': '1' }
      });

      if (response.ok) {
        showResultSnackbar('Ивент удален', true);
        fetchEvents();
      } else {
        showResultSnackbar('Ошибка удаления ивента', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'quest': return '⚔️';
      case 'gate': return '🚪';
      case 'pvp': return '⚡';
      case 'pve': return '👹';
      case 'social': return '🎭';
      case 'auction': return '💰';
      case 'raid': return '🏰';
      case 'special': return '⭐';
      default: return '📅';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'draft': '#666',
      'open': '#4CAF50',
      'in_progress': '#FF9800',
      'completed': '#2196F3',
      'cancelled': '#f44336'
    };
    return colors[status] || '#666';
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: { [key: string]: string } = {
      'F': '#4CAF50',
      'E': '#8BC34A',
      'D': '#FFC107',
      'C': '#FF9800',
      'B': '#FF5722',
      'A': '#F44336',
      'S': '#9C27B0',
      'SS': '#673AB7',
      'SSS': '#3F51B5'
    };
    return colors[difficulty] || '#666';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <Panel id={id}>
      <PanelHeader>📅 Управление Ивентами</PanelHeader>
      
      <Div>
        <Card>
          <Div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text weight="2">Ивенты</Text>
              <Button
                before={<Icon28AddOutline />}
                onClick={() => setShowCreateModal(true)}
              >
                Создать ивент
              </Button>
            </div>
          </Div>
        </Card>

        {events.map(event => (
          <Card key={event.id} style={{ marginBottom: 16 }}>
            <Div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 24 }}>{getEventTypeIcon(event.event_type)}</Text>
                  <div>
                    <Text weight="2" style={{ fontSize: 16 }}>
                      {event.title}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 14 }}>
                      {event.organizer_name}
                    </Text>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text 
                    style={{ 
                      color: getStatusColor(event.status),
                      fontWeight: 'bold',
                      fontSize: 14
                    }}
                  >
                    {event.status}
                  </Text>
                  <Text 
                    style={{ 
                      color: getDifficultyColor(event.difficulty),
                      fontWeight: 'bold',
                      fontSize: 14
                    }}
                  >
                    {event.difficulty}
                  </Text>
                </div>
              </div>

              <Text style={{ marginBottom: 12 }}>
                {event.description}
              </Text>

              <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon28UsersOutline width={16} height={16} />
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {event.participant_count || 0}/{event.max_participants || '∞'}
                  </Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon28CalendarOutline width={16} height={16} />
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {formatDate(event.start_date)}
                  </Text>
                </div>

                {event.location && (
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    📍 {event.location}
                  </Text>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  size="s"
                  onClick={() => {
                    setSelectedEvent(event);
                    fetchEventParticipants(event.id);
                    setShowParticipantsModal(true);
                  }}
                >
                  Участники
                </Button>
                
                <Select
                  value={event.status}
                  onChange={(e) => updateEventStatus(event.id, e.target.value)}
                  options={[
                    { label: 'Черновик', value: 'draft' },
                    { label: 'Открыт', value: 'open' },
                    { label: 'В процессе', value: 'in_progress' },
                    { label: 'Завершен', value: 'completed' },
                    { label: 'Отменен', value: 'cancelled' }
                  ]}
                  style={{ minWidth: 120 }}
                />
                
                <Button
                  size="s"
                  mode="secondary"
                  before={<Icon28DeleteOutline />}
                  onClick={() => deleteEvent(event.id)}
                >
                  Удалить
                </Button>
              </div>
            </Div>
          </Card>
        ))}
      </Div>

      {showCreateModal && (
        <ModalCard
          id="create-event-modal"
          onClose={() => setShowCreateModal(false)}
        >
          <ModalPageContent>
            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>Название *</Text>
              <Input
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Введите название ивента"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>Описание *</Text>
              <Input
                type="textarea"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Введите описание ивента"
              />
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <Text weight="2" style={{ marginBottom: 8 }}>Тип</Text>
                <Select
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value})}
                  options={[
                    { label: 'Квест', value: 'quest' },
                    { label: 'Врата', value: 'gate' },
                    { label: 'PvP', value: 'pvp' },
                    { label: 'PvE', value: 'pve' },
                    { label: 'Социальный', value: 'social' },
                    { label: 'Аукцион', value: 'auction' },
                    { label: 'Рейд', value: 'raid' },
                    { label: 'Особый', value: 'special' }
                  ]}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text weight="2" style={{ marginBottom: 8 }}>Сложность</Text>
                <Select
                  value={newEvent.difficulty}
                  onChange={(e) => setNewEvent({...newEvent, difficulty: e.target.value})}
                  options={[
                    { label: 'F', value: 'F' },
                    { label: 'E', value: 'E' },
                    { label: 'D', value: 'D' },
                    { label: 'C', value: 'C' },
                    { label: 'B', value: 'B' },
                    { label: 'A', value: 'A' },
                    { label: 'S', value: 'S' },
                    { label: 'SS', value: 'SS' },
                    { label: 'SSS', value: 'SSS' }
                  ]}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <Text weight="2" style={{ marginBottom: 8 }}>Макс. участников</Text>
                <Input
                  type="number"
                  value={newEvent.max_participants}
                  onChange={(e) => setNewEvent({...newEvent, max_participants: parseInt(e.target.value)})}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text weight="2" style={{ marginBottom: 8 }}>Мин. участников</Text>
                <Input
                  type="number"
                  value={newEvent.min_participants}
                  onChange={(e) => setNewEvent({...newEvent, min_participants: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>Местоположение</Text>
              <Input
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                placeholder="Введите местоположение"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>Организатор</Text>
              <Input
                value={newEvent.organizer_name}
                onChange={(e) => setNewEvent({...newEvent, organizer_name: e.target.value})}
                placeholder="Введите имя организатора"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>Дата начала</Text>
              <Input
                type="datetime-local"
                value={newEvent.start_date}
                onChange={(e) => setNewEvent({...newEvent, start_date: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>Дата окончания</Text>
              <Input
                type="datetime-local"
                value={newEvent.end_date}
                onChange={(e) => setNewEvent({...newEvent, end_date: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>Дополнительная информация</Text>
              <Input
                type="textarea"
                value={newEvent.additional_info}
                onChange={(e) => setNewEvent({...newEvent, additional_info: e.target.value})}
                placeholder="Дополнительная информация об ивенте"
              />
            </div>
          </ModalPageContent>
          
          <Div>
            <Button
              size="l"
              mode="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Отмена
            </Button>
            <Button
              size="l"
              onClick={createEvent}
              disabled={!newEvent.title || !newEvent.description}
              loading={loading}
            >
              Создать
            </Button>
          </Div>
        </ModalCard>
      )}

      {showParticipantsModal && selectedEvent && (
        <ModalCard
          id="participants-modal"
          onClose={() => setShowParticipantsModal(false)}
        >
          <ModalPageContent>
            {participants.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#666' }}>
                Нет участников
              </Text>
            ) : (
              participants.map(participant => (
                <Card key={participant.id} style={{ marginBottom: 12 }}>
                  <Div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <Text weight="2">{participant.character_name}</Text>
                        <Text style={{ color: '#666', fontSize: 14 }}>
                          {participant.nickname} • {participant.character_rank} • {participant.faction}
                        </Text>
                      </div>
                      <Select
                        value={participant.status}
                        onChange={(e) => updateParticipantStatus(selectedEvent.id, participant.id, e.target.value)}
                        options={[
                          { label: 'Ожидает', value: 'pending' },
                          { label: 'Одобрен', value: 'approved' },
                          { label: 'Отклонен', value: 'rejected' },
                          { label: 'Отозван', value: 'withdrawn' }
                        ]}
                        style={{ minWidth: 120 }}
                      />
                    </div>
                    
                    {participant.application_data?.details && (
                      <Text style={{ fontSize: 14, color: '#666' }}>
                        {participant.application_data.details}
                      </Text>
                    )}
                    
                    <Text style={{ fontSize: 12, color: '#999' }}>
                      Подал заявку: {formatDate(participant.joined_at)}
                    </Text>
                  </Div>
                </Card>
              ))
            )}
          </ModalPageContent>
          
          <Div>
            <Button
              size="l"
              onClick={() => setShowParticipantsModal(false)}
            >
              Закрыть
            </Button>
          </Div>
        </ModalCard>
      )}

      {snackbar}
    </Panel>
  );
};
