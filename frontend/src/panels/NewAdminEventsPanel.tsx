import React, { FC, useState, useEffect } from 'react';
import {
  Panel, PanelHeader, Div, Card, Text, Button, Input, Snackbar,
  ModalRoot, ModalPage, ModalPageHeader, FormItem, Textarea
} from '@vkontakte/vkui';
import { Icon28AddOutline, Icon28CalendarOutline, Icon28UsersOutline } from '@vkontakte/icons';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface Event {
  id: number;
  title: string;
  estimated_start_date: string;
  registration_end_date: string | null;
  min_rank: string | null;
  max_rank: string | null;
  created_at: string;
  participant_count: number;
}

interface EventBet {
  id: number;
  event_id: number;
  bet_text: string;
  status: 'open' | 'closed' | 'settled';
  result: 'believers_win' | 'unbelievers_win' | null;
  believers_total_pool: number;
  unbelievers_total_pool: number;
  believerOdds: number;
  unbelieverOdds: number;
  believer_count: number;
  unbeliever_count: number;
  created_at: string;
}

const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export const NewAdminEventsPanel: FC<NavIdProps> = ({ id }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBetsModal, setShowBetsModal] = useState(false);
  const [showCreateBetModal, setShowCreateBetModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventBets, setEventBets] = useState<EventBet[]>([]);
  const [newBetText, setNewBetText] = useState('');
  const [newEvent, setNewEvent] = useState({
    title: '',
    estimated_start_date: '',
    registration_end_date: '',
    min_rank: '',
    max_rank: ''
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
      showSnackbar('Ошибка загрузки событий', false);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, _isSuccess: boolean) => {
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
    if (!newEvent.title || !newEvent.estimated_start_date) {
      showSnackbar('Заполните название и ориентировочную дату начала', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1' // Временно захардкодим
        },
        body: JSON.stringify({
          ...newEvent,
          min_rank: newEvent.min_rank || null,
          max_rank: newEvent.max_rank || null,
          registration_end_date: newEvent.registration_end_date || null
        })
      });

      if (response.ok) {
        showSnackbar('Событие создано успешно', true);
        setShowCreateModal(false);
        setNewEvent({
          title: '',
          estimated_start_date: '',
          registration_end_date: '',
          min_rank: '',
          max_rank: ''
        });
        fetchEvents();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка создания события', false);
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!confirm('Вы уверены, что хотите удалить это событие?')) return;

    try {
      const response = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-id': '1' // Временно захардкодим
        }
      });

      if (response.ok) {
        showSnackbar('Событие удалено', true);
        fetchEvents();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка удаления события', false);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      showSnackbar('Ошибка соединения', false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const fetchEventBets = async (eventId: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events/${eventId}/bets`);
      const data = await response.json();
      setEventBets(data);
    } catch (error) {
      console.error('Failed to fetch event bets:', error);
      showSnackbar('Ошибка загрузки ставок', false);
    } finally {
      setLoading(false);
    }
  };

  const openBetsModal = async (event: Event) => {
    setSelectedEvent(event);
    await fetchEventBets(event.id);
    setShowBetsModal(true);
  };

  const openCreateBetModal = (event: Event) => {
    setSelectedEvent(event);
    setNewBetText('');
    setShowCreateBetModal(true);
  };

  const createBet = async () => {
    if (!selectedEvent || !newBetText.trim()) {
      showSnackbar('Заполните текст ставки', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events/${selectedEvent.id}/bets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({ bet_text: newBetText.trim() })
      });

      if (response.ok) {
        showSnackbar('Ставка создана успешно', true);
        setShowCreateBetModal(false);
        setNewBetText('');
        if (showBetsModal) {
          await fetchEventBets(selectedEvent.id);
        }
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка создания ставки', false);
      }
    } catch (error) {
      console.error('Failed to create bet:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const closeBet = async (betId: number) => {
    if (!confirm('Вы уверены, что хотите закрыть эту ставку?')) return;

    try {
      const response = await fetch(`${API_URL}/bets/${betId}/close`, {
        method: 'PUT',
        headers: {
          'x-admin-id': '1'
        }
      });

      if (response.ok) {
        showSnackbar('Ставка закрыта', true);
        if (selectedEvent) {
          await fetchEventBets(selectedEvent.id);
        }
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка закрытия ставки', false);
      }
    } catch (error) {
      console.error('Failed to close bet:', error);
      showSnackbar('Ошибка соединения', false);
    }
  };

  const settleBet = async (betId: number, result: 'believers_win' | 'unbelievers_win') => {
    const resultText = result === 'believers_win' ? 'Беливеры' : 'Анбеливеры';
    if (!confirm(`Завершить ставку в пользу: ${resultText}?`)) return;

    try {
      const response = await fetch(`${API_URL}/bets/${betId}/settle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': '1'
        },
        body: JSON.stringify({ result })
      });

      if (response.ok) {
        showSnackbar('Ставка завершена, выплаты произведены', true);
        if (selectedEvent) {
          await fetchEventBets(selectedEvent.id);
        }
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка завершения ставки', false);
      }
    } catch (error) {
      console.error('Failed to settle bet:', error);
      showSnackbar('Ошибка соединения', false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#4CAF50';
      case 'closed': return '#FF9800';
      case 'settled': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Открыта';
      case 'closed': return 'Закрыта';
      case 'settled': return 'Завершена';
      default: return status;
    }
  };

  const getRankText = (minRank: string | null, maxRank: string | null) => {
    if (!minRank && !maxRank) return 'Любой ранг';
    if (minRank && maxRank) return `${minRank}-${maxRank}`;
    if (minRank) return `${minRank}+`;
    if (maxRank) return `до ${maxRank}`;
    return '';
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
                    <Text weight="2" style={{ fontSize: 18, marginBottom: 4 }}>
                      {event.title}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 14 }}>
                      Создано: {formatDate(event.created_at)}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="s"
                        mode="secondary"
                        onClick={() => openBetsModal(event)}
                      >
                        Ставки
                      </Button>
                      <Button
                        size="s"
                        onClick={() => openCreateBetModal(event)}
                      >
                        + Ставка
                      </Button>
                      <Button
                        size="s"
                        mode="secondary"
                        onClick={() => deleteEvent(event.id)}
                        style={{ color: '#f44336' }}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon28UsersOutline width={16} height={16} />
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      {event.participant_count || 0} участников
                    </Text>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon28CalendarOutline width={16} height={16} />
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      Начало: {formatDate(event.estimated_start_date)}
                    </Text>
                  </div>

                  <Text style={{ fontSize: 14, color: '#666' }}>
                    Ранг: {getRankText(event.min_rank, event.max_rank)}
                  </Text>
                </div>

                {event.registration_end_date && (
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                    Регистрация до: {formatDate(event.registration_end_date)}
                  </Text>
                )}
              </Div>
            </Card>
          ))
        )}
      </Div>

      <ModalRoot activeModal={
        showCreateModal ? 'create-event' : 
        showCreateBetModal ? 'create-bet' :
        showBetsModal ? 'manage-bets' : null
      }>
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

              <FormItem top="Ориентировочная дата начала *">
                <Input
                  type="datetime-local"
                  value={newEvent.estimated_start_date}
                  onChange={(e) => setNewEvent({ ...newEvent, estimated_start_date: e.target.value })}
                />
              </FormItem>

              <FormItem top="Дата окончания регистрации">
                <Input
                  type="datetime-local"
                  value={newEvent.registration_end_date}
                  onChange={(e) => setNewEvent({ ...newEvent, registration_end_date: e.target.value })}
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

        {/* Модальное окно создания ставки */}
        <ModalPage
          id="create-bet"
          onClose={() => setShowCreateBetModal(false)}
          header={
            <ModalPageHeader>
              Создать ставку
            </ModalPageHeader>
          }
        >
          <Div>
            {selectedEvent && (
              <div>
                <Text weight="2" style={{ fontSize: 18, marginBottom: 16 }}>
                  {selectedEvent.title}
                </Text>
                
                <FormItem top="Текст ставки *">
                  <Textarea
                    value={newBetText}
                    onChange={(e) => setNewBetText(e.target.value)}
                    placeholder="Например: 'Герой победит финального босса' или 'В ивенте погибнет больше 3 персонажей'"
                    rows={4}
                  />
                </FormItem>
                
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                  Игроки смогут ставить на "Беливеры" (верят в исход) или "Анбеливеры" (не верят)
                </Text>

                <FormItem>
                  <Button
                    size="l"
                    onClick={createBet}
                    disabled={loading || !newBetText.trim()}
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Создание...' : 'Создать ставку'}
                  </Button>
                </FormItem>
              </div>
            )}
          </Div>
        </ModalPage>

        {/* Модальное окно управления ставками */}
        <ModalPage
          id="manage-bets"
          onClose={() => setShowBetsModal(false)}
          header={
            <ModalPageHeader>
              Управление ставками
            </ModalPageHeader>
          }
        >
          <Div>
            {selectedEvent && (
              <div>
                <Text weight="2" style={{ fontSize: 18, marginBottom: 16 }}>
                  {selectedEvent.title}
                </Text>
                
                <div style={{ marginBottom: 16 }}>
                  <Button
                    onClick={() => openCreateBetModal(selectedEvent)}
                    before={<Icon28AddOutline />}
                  >
                    Создать ставку
                  </Button>
                </div>

                {eventBets.length === 0 ? (
                  <Text style={{ color: '#666' }}>Ставок пока нет</Text>
                ) : (
                  eventBets.map(bet => (
                    <Card key={bet.id} style={{ marginBottom: 16 }}>
                      <Div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <Text weight="2" style={{ fontSize: 16 }}>
                              {bet.bet_text}
                            </Text>
                            <Text style={{ 
                              color: getStatusColor(bet.status), 
                              fontSize: 14,
                              fontWeight: 'bold'
                            }}>
                              {getStatusText(bet.status)}
                            </Text>
                          </div>
                          
                          {bet.result && (
                            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                              Результат: {bet.result === 'believers_win' ? 'Беливеры выиграли' : 'Анбеливеры выиграли'}
                            </Text>
                          )}
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                            <div style={{ padding: 12, backgroundColor: '#e8f5e8', borderRadius: 8 }}>
                              <Text weight="2" style={{ fontSize: 14, color: '#2e7d32' }}>Беливеры</Text>
                              <Text style={{ fontSize: 12 }}>Коэффициент: {bet.believerOdds}</Text>
                              <Text style={{ fontSize: 12 }}>Ставок: {bet.believer_count}</Text>
                              <Text style={{ fontSize: 12 }}>Пул: {Math.round(bet.believers_total_pool)} 💰</Text>
                            </div>
                            
                            <div style={{ padding: 12, backgroundColor: '#ffebee', borderRadius: 8 }}>
                              <Text weight="2" style={{ fontSize: 14, color: '#d32f2f' }}>Анбеливеры</Text>
                              <Text style={{ fontSize: 12 }}>Коэффициент: {bet.unbelieverOdds}</Text>
                              <Text style={{ fontSize: 12 }}>Ставок: {bet.unbeliever_count}</Text>
                              <Text style={{ fontSize: 12 }}>Пул: {Math.round(bet.unbelievers_total_pool)} 💰</Text>
                            </div>
                          </div>
                          
                          {bet.status === 'open' && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <Button 
                                size="s" 
                                mode="secondary"
                                onClick={() => closeBet(bet.id)}
                              >
                                Закрыть ставку
                              </Button>
                              <Button 
                                size="s"
                                onClick={() => settleBet(bet.id, 'believers_win')}
                                style={{ backgroundColor: '#4caf50', color: 'white' }}
                              >
                                Беливеры выиграли
                              </Button>
                              <Button 
                                size="s"
                                onClick={() => settleBet(bet.id, 'unbelievers_win')}
                                style={{ backgroundColor: '#f44336', color: 'white' }}
                              >
                                Анбеливеры выиграли
                              </Button>
                            </div>
                          )}
                          
                          {bet.status === 'closed' && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <Button 
                                size="s"
                                onClick={() => settleBet(bet.id, 'believers_win')}
                                style={{ backgroundColor: '#4caf50', color: 'white' }}
                              >
                                Беливеры выиграли
                              </Button>
                              <Button 
                                size="s"
                                onClick={() => settleBet(bet.id, 'unbelievers_win')}
                                style={{ backgroundColor: '#f44336', color: 'white' }}
                              >
                                Анбеливеры выиграли
                              </Button>
                            </div>
                          )}
                          
                          <Text style={{ fontSize: 12, color: '#999' }}>
                            Создано: {formatDate(bet.created_at)}
                          </Text>
                        </div>
                      </Div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </Div>
        </ModalPage>
      </ModalRoot>

      {snackbar}
    </Panel>
  );
};
