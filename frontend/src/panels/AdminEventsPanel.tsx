import React, { FC, useState, useEffect } from 'react';
import {
  Panel, PanelHeader, Div, Card, Text, Button, Input, Textarea, Snackbar,
  ModalRoot, ModalPage, ModalPageHeader, FormItem
} from '@vkontakte/vkui';
import { Icon28AddOutline, Icon28CalendarOutline, Icon28UsersOutline } from '@vkontakte/icons';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  registration_instructions: string;
  status: string;
  min_rank: string;
  max_rank: string;
  max_participants: number;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  organizer_name: string;
  participant_count: number;
}

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export const AdminEventsPanel: FC<NavIdProps> = ({ id }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    registration_instructions: '',
    min_rank: '',
    max_rank: '',
    max_participants: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    organizer_name: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      showResultSnackbar('Ошибка загрузки событий', false);
    } finally {
      setLoading(false);
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
    if (!newEvent.title || !newEvent.description || !newEvent.registration_instructions) {
      showResultSnackbar('Заполните все обязательные поля', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          max_participants: newEvent.max_participants ? parseInt(newEvent.max_participants) : null,
          organizer_vk_id: 1, // Временно, нужно получать из контекста
          organizer_name: newEvent.organizer_name || 'Администратор'
        })
      });

      if (response.ok) {
        showResultSnackbar('Событие создано успешно', true);
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          description: '',
          registration_instructions: '',
          min_rank: '',
          max_rank: '',
          max_participants: '',
          start_date: '',
          end_date: '',
          registration_deadline: '',
          organizer_name: ''
        });
        fetchEvents();
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка создания события', false);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      showResultSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: number, status: string) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        showResultSnackbar('Статус события обновлен', true);
        fetchEvents();
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка обновления статуса', false);
      }
    } catch (error) {
      console.error('Failed to update event status:', error);
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#666';
      case 'open': return '#4CAF50';
      case 'closed': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик';
      case 'open': return 'Открыто';
      case 'closed': return 'Закрыто';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader>📅 Управление Событиями</PanelHeader>
      
      <Div>
        <Card>
          <Div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text weight="2">События</Text>
              <Button
                before={<Icon28AddOutline />}
                onClick={() => setShowCreateModal(true)}
              >
                Создать событие
              </Button>
            </div>
          </Div>
        </Card>

        {loading ? (
          <Card>
            <Div>
              <Text>Загрузка...</Text>
            </Div>
          </Card>
        ) : (
          events.map(event => (
            <Card key={event.id} style={{ marginBottom: 16 }}>
              <Div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <Text weight="2" style={{ fontSize: 16, marginBottom: 4 }}>
                      {event.title}
                    </Text>
                    <Text style={{ color: getStatusColor(event.status), fontSize: 14, marginBottom: 8 }}>
                      {getStatusText(event.status)}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 14 }}>
                      Организатор: {event.organizer_name}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {event.status === 'draft' && (
                        <Button
                          size="s"
                          mode="secondary"
                          onClick={() => updateEventStatus(event.id, 'open')}
                        >
                          Открыть
                        </Button>
                      )}
                      {event.status === 'open' && (
                        <Button
                          size="s"
                          mode="secondary"
                          onClick={() => updateEventStatus(event.id, 'closed')}
                        >
                          Закрыть
                        </Button>
                      )}
                      {event.status === 'closed' && (
                        <Button
                          size="s"
                          mode="secondary"
                          onClick={() => updateEventStatus(event.id, 'completed')}
                        >
                          Завершить
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Text style={{ marginBottom: 12 }}>
                  {event.description}
                </Text>

                <div style={{ marginBottom: 12 }}>
                  <Text weight="2" style={{ fontSize: 14, marginBottom: 4 }}>
                    Инструкции для регистрации:
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {event.registration_instructions}
                  </Text>
                </div>

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

                  {event.min_rank && (
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      Ранг: {event.min_rank}{event.max_rank ? `-${event.max_rank}` : '+'}
                    </Text>
                  )}
                </div>

                {event.registration_deadline && (
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                    Регистрация до: {formatDate(event.registration_deadline)}
                  </Text>
                )}
              </Div>
            </Card>
          ))
        )}
      </Div>

      <ModalRoot activeModal={showCreateModal ? 'create-event' : null}>
        <ModalPage
          id="create-event"
          onClose={() => setShowCreateModal(false)}
          header={
            <ModalPageHeader>
              Создать событие
            </ModalPageHeader>
          }
        >
          <Div>
            <div>
              <FormItem top="Название события *">
                <Input
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Введите название события"
                />
              </FormItem>

              <FormItem top="Описание события *">
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Опишите событие"
                  rows={3}
                />
              </FormItem>

              <FormItem top="Инструкции для регистрации *">
                <Textarea
                  value={newEvent.registration_instructions}
                  onChange={(e) => setNewEvent({ ...newEvent, registration_instructions: e.target.value })}
                  placeholder="Что нужно указать при регистрации (например: 'Укажите ваш опыт в бою', 'Напишите о ваших способностях')"
                  rows={3}
                />
              </FormItem>

              <FormItem top="Минимальный ранг">
                <select
                  value={newEvent.min_rank}
                  onChange={(e) => setNewEvent({ ...newEvent, min_rank: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Без ограничений</option>
                  {RANKS.map(rank => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </FormItem>

              <FormItem top="Максимальный ранг">
                <select
                  value={newEvent.max_rank}
                  onChange={(e) => setNewEvent({ ...newEvent, max_rank: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Без ограничений</option>
                  {RANKS.map(rank => (
                    <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </FormItem>

              <FormItem top="Максимальное количество участников">
                <Input
                  type="number"
                  value={newEvent.max_participants}
                  onChange={(e) => setNewEvent({ ...newEvent, max_participants: e.target.value })}
                  placeholder="Оставьте пустым для неограниченного количества"
                />
              </FormItem>

              <FormItem top="Дата начала">
                <Input
                  type="datetime-local"
                  value={newEvent.start_date}
                  onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                />
              </FormItem>

              <FormItem top="Дата окончания">
                <Input
                  type="datetime-local"
                  value={newEvent.end_date}
                  onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                />
              </FormItem>

              <FormItem top="Срок регистрации">
                <Input
                  type="datetime-local"
                  value={newEvent.registration_deadline}
                  onChange={(e) => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                />
              </FormItem>

              <FormItem top="Имя организатора">
                <Input
                  value={newEvent.organizer_name}
                  onChange={(e) => setNewEvent({ ...newEvent, organizer_name: e.target.value })}
                  placeholder="Имя организатора"
                />
              </FormItem>

              <FormItem>
                <Button
                  size="l"
                  onClick={createEvent}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Создание...' : 'Создать событие'}
                </Button>
              </FormItem>
            </div>
          </Div>
        </ModalPage>
      </ModalRoot>

      {snackbar}
    </Panel>
  );
};