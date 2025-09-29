import React, { FC, useState, useEffect } from 'react';
import {
  Panel, PanelHeader, Div, Card, Text, Button, Snackbar, Select, ModalRoot, ModalPage, ModalPageHeader, Input, FormItem, PanelHeaderBack
} from '@vkontakte/vkui';
import { Icon28CalendarOutline, Icon28UsersOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface NewEventsPanelProps extends NavIdProps {
  fetchedUser?: any;
}

interface Event {
  id: number;
  title: string;
  estimated_start_date: string;
  registration_end_date: string | null;
  min_rank: string | null;
  max_rank: string | null;
  status?: string;
  created_at: string;
  participant_count: number;
  participants?: EventParticipant[];
}

interface EventParticipant {
  id: number;
  character_id: number;
  character_name: string;
  rank: string;
  faction: string;
  joined_at: string;
  branch_name?: string;
}

interface Character {
  id: number;
  character_name: string;
  rank: string;
  faction: string;
  currency: number;
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

interface EventBranch {
  id: number;
  event_id: number;
  branch_name: string;
  description: string | null;
  min_rank: string | null;
  max_rank: string | null;
  max_participants: number | null;
  rewards: any;
  participant_count: number;
  created_at: string;
}

export const NewEventsPanel: FC<NewEventsPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [events, setEvents] = useState<Event[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showBetsModal, setShowBetsModal] = useState(false);
  const [showPlaceBetModal, setShowPlaceBetModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [eventBets, setEventBets] = useState<EventBet[]>([]);
  const [selectedBet, setSelectedBet] = useState<EventBet | null>(null);
  const [betType, setBetType] = useState<'believer' | 'unbeliever'>('believer');
  const [betAmount, setBetAmount] = useState<string>('');
  const [eventBranches, setEventBranches] = useState<EventBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);

  useEffect(() => {
    fetchEvents();
    fetchCharacters();
  }, [fetchedUser]);

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

  const fetchCharacters = async () => {
    if (!fetchedUser) return;
    try {
      const response = await fetch(`${API_URL}/characters/by-vk/${fetchedUser.id}`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  };

  const fetchEventDetails = async (eventId: number) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}`);
      const data = await response.json();
      setSelectedEvent(data);
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      showSnackbar('Ошибка загрузки деталей события', false);
    }
  };

  const showSnackbar = (message: string, isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon28CalendarOutline />}
      >
        {message}
      </Snackbar>
    );
  };

  const fetchEventBranches = async (eventId: number) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}/branches`);
      const data = await response.json();
      setEventBranches(data || []);
    } catch (error) {
      console.error('Failed to fetch event branches:', error);
      setEventBranches([]);
    }
  };

  const openJoinModal = async (event: Event) => {
    if (!characters.length) {
      showSnackbar('У вас нет персонажей для регистрации', false);
      return;
    }
    setSelectedEvent(event);
    setSelectedCharacter(null);
    setSelectedBranch(null);
    await fetchEventBranches(event.id);
    setShowJoinModal(true);
  };

  const openParticipantsModal = async (event: Event) => {
    await fetchEventDetails(event.id);
    setShowParticipantsModal(true);
  };

  const joinEvent = async () => {
    if (!selectedEvent || !selectedCharacter) {
      showSnackbar('Выберите персонажа', false);
      return;
    }

    try {
      setLoading(true);
      
      // Выбираем правильный эндпоинт в зависимости от того, выбрана ли ветка
      const endpoint = selectedBranch 
        ? `${API_URL}/events/${selectedEvent.id}/join-branch`
        : `${API_URL}/events/${selectedEvent.id}/join`;

      const body: any = {
        character_id: selectedCharacter,
        vk_id: fetchedUser?.id
      };

      // Добавляем ID ветки если она выбрана
      if (selectedBranch) {
        body.branch_id = selectedBranch;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showSnackbar('Успешно присоединились к событию!', true);
        setShowJoinModal(false);
        fetchEvents();
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка присоединения', false);
      }
    } catch (error) {
      console.error('Failed to join event:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const leaveEvent = async (eventId: number, characterId: number) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId })
      });

      if (response.ok) {
        showSnackbar('Покинули событие', true);
        fetchEvents();
        if (selectedEvent) {
          await fetchEventDetails(selectedEvent.id);
        }
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка выхода из события', false);
      }
    } catch (error) {
      console.error('Failed to leave event:', error);
      showSnackbar('Ошибка соединения', false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const isCharacterRegistered = (event: Event, characterId: number) => {
    if (!event.participants) return false;
    return event.participants.some(p => p.character_id === characterId);
  };


  const canLeaveEvent = (event: Event) => {
    if (!selectedCharacter) return false;
    if (!isCharacterRegistered(event, selectedCharacter)) return false;
    return event.status === 'active' || event.status === 'upcoming';
  };

  const openLeaveModal = (event: Event) => {
    setSelectedEvent(event);
    setShowLeaveModal(true);
  };

  const leaveEventWithCharacter = async () => {
    if (!selectedEvent || !selectedCharacter) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events/${selectedEvent.id}/leave`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: selectedCharacter })
      });

      if (response.ok) {
        showSnackbar('Покинули событие', true);
        setShowLeaveModal(false);
        fetchEvents();
        if (selectedEvent) {
          await fetchEventDetails(selectedEvent.id);
        }
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка выхода из события', false);
      }
    } catch (error) {
      console.error('Failed to leave event:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const canJoinEvent = (event: Event) => {
    if (event.registration_end_date && new Date() > new Date(event.registration_end_date)) {
      return false;
    }
    return true;
  };

  const fetchEventBets = async (eventId: number) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}/bets`);
      const data = await response.json();
      setEventBets(data);
    } catch (error) {
      console.error('Failed to fetch event bets:', error);
      showSnackbar('Ошибка загрузки ставок', false);
    }
  };

  const openBetsModal = async (event: Event) => {
    setSelectedEvent(event);
    await fetchEventBets(event.id);
    setShowBetsModal(true);
  };

  const openPlaceBetModal = (bet: EventBet) => {
    setSelectedBet(bet);
    setBetType('believer');
    setBetAmount('');
    setSelectedCharacter(null);
    setShowPlaceBetModal(true);
  };

  const placeBet = async () => {
    if (!selectedBet || !selectedCharacter || !betAmount || parseFloat(betAmount) <= 0) {
      showSnackbar('Заполните все поля корректно', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/bets/${selectedBet.id}/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          vk_id: fetchedUser?.id,
          bet_type: betType,
          amount: parseFloat(betAmount)
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSnackbar(`Ставка размещена! Коэффициент: ${result.odds}, возможный выигрыш: ${Math.round(result.potential_payout)} 💰`, true);
        setShowPlaceBetModal(false);
        fetchCharacters(); // Обновляем валюту
        if (showBetsModal && selectedEvent) {
          await fetchEventBets(selectedEvent.id); // Обновляем ставки
        }
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Ошибка размещения ставки', false);
      }
    } catch (error) {
      console.error('Failed to place bet:', error);
      showSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
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
    if (minRank && maxRank) return `Ранг: ${minRank}-${maxRank}`;
    if (minRank) return `Ранг: ${minRank}+`;
    if (maxRank) return `Ранг: до ${maxRank}`;
    return '';
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        📅 События
      </PanelHeader>
      
      <Div>
        {characters.length > 0 && (
          <Select
            placeholder="Выберите персонажа"
            value={selectedCharacter}
            onChange={(e) => setSelectedCharacter(Number(e.target.value))}
            options={characters && characters.length > 0 ? characters.map(char => ({
              label: `${char.character_name || 'Неизвестно'} (${char.rank || 'Нет ранга'}) - ${char.faction || 'Нет фракции'}`,
              value: char.id
            })) : []}
            style={{ marginBottom: '16px' }}
          />
        )}
      </Div>
      
      <Div>
        {loading ? (
          <Card>
            <Div>
              <Text>Загрузка...</Text>
            </Div>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <Div>
              <Text>Нет доступных событий</Text>
            </Div>
          </Card>
        ) : (
          events.map(event => (
            <Card key={event.id} style={{ marginBottom: 16 }}>
              <Div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <Text weight="2" style={{ fontSize: 18, marginBottom: 8 }}>
                      {event.title}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>
                      Создано: {formatDate(event.created_at)}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Button
                        size="s"
                        mode="secondary"
                        onClick={() => openParticipantsModal(event)}
                      >
                        Участники
                      </Button>
                      
                      <Button
                        size="s"
                        mode="secondary"
                        onClick={() => openBetsModal(event)}
                        style={{ backgroundColor: '#ffd700', color: '#333' }}
                      >
                        🎲 Ставки
                      </Button>
                      
                      {canJoinEvent(event) && (
                        <Button
                          size="s"
                          onClick={() => openJoinModal(event)}
                        >
                          Присоединиться
                        </Button>
                      )}
                      
                      {canLeaveEvent(event) && (
                        <Button
                          size="s"
                          mode="secondary"
                          onClick={() => openLeaveModal(event)}
                          style={{ backgroundColor: '#ffebee', color: '#d32f2f' }}
                        >
                          Покинуть
                        </Button>
                      )}
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
                      {formatDate(event.estimated_start_date)}
                    </Text>
                  </div>

                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {getRankText(event.min_rank, event.max_rank)}
                  </Text>
                </div>

                {event.registration_end_date && (
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                    Регистрация до: {formatDate(event.registration_end_date)}
                  </Text>
                )}

                {!canJoinEvent(event) && (
                  <Text style={{ fontSize: 14, color: '#f44336', marginBottom: 8 }}>
                    Регистрация закрыта
                  </Text>
                )}

                {/* Показываем зарегистрированных персонажей пользователя */}
                {characters.map(character => {
                  const isRegistered = isCharacterRegistered(event, character.id);
                  if (!isRegistered) return null;
                  
                  return (
                    <div key={character.id} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '8px',
                      marginBottom: 8
                    }}>
                      <div>
                        <Text weight="2" style={{ fontSize: 14 }}>
                          {character.character_name} ({character.rank})
                        </Text>
                        <Text style={{ fontSize: 12, color: '#666' }}>
                          {character.faction}
                        </Text>
                      </div>
                      <Button
                        size="s"
                        mode="secondary"
                        onClick={() => leaveEvent(event.id, character.id)}
                      >
                        Покинуть
                      </Button>
                    </div>
                  );
                })}
              </Div>
            </Card>
          ))
        )}
      </Div>

      {/* Модальное окно присоединения */}
      <ModalRoot activeModal={showJoinModal ? 'join-event' : null}>
        <ModalPage
          id="join-event"
          onClose={() => setShowJoinModal(false)}
          header={
            <ModalPageHeader>
              Присоединиться к событию
            </ModalPageHeader>
          }
        >
          <Div>
            {selectedEvent && (
              <div>
                <Text weight="2" style={{ fontSize: 18, marginBottom: 16 }}>
                  {selectedEvent.title}
                </Text>
                
                <FormItem top="Выберите персонажа:">
                  <Select
                    value={selectedCharacter?.toString() || ''}
                    onChange={(e) => setSelectedCharacter(parseInt(e.target.value))}
                    options={characters && characters.length > 0 ? characters.map(char => ({
                      label: `${char.character_name || 'Неизвестно'} (${char.rank || 'Нет ранга'}) - ${char.faction || 'Нет фракции'}`,
                      value: char.id.toString()
                    })) : []}
                  />
                </FormItem>

                {eventBranches.length > 0 && (
                  <FormItem top="Выберите путь (ветку):">
                    <Select
                      value={selectedBranch?.toString() || ''}
                      onChange={(e) => setSelectedBranch(e.target.value ? parseInt(e.target.value) : null)}
                      options={[
                        { label: '🏰 Основной путь (без веток)', value: '' },
                        ...eventBranches.map(branch => ({
                          label: `🌿 ${branch.branch_name} (${branch.participant_count}/${branch.max_participants || '∞'} участников)`,
                          value: branch.id.toString()
                        }))
                      ]}
                    />
                  </FormItem>
                )}

                {selectedBranch && (
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 8, 
                    marginBottom: 16 
                  }}>
                    {(() => {
                      const branch = eventBranches.find(b => b.id === selectedBranch);
                      if (!branch) return null;
                      return (
                        <div>
                          <Text weight="2" style={{ fontSize: 16, marginBottom: 8 }}>
                            🌿 {branch.branch_name}
                          </Text>
                          {branch.description && (
                            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                              {branch.description}
                            </Text>
                          )}
                          <div style={{ fontSize: 14, color: '#666' }}>
                            {branch.min_rank || branch.max_rank ? (
                              <div>🏆 Требования: {getRankText(branch.min_rank, branch.max_rank)}</div>
                            ) : null}
                            <div>👥 Участников: {branch.participant_count}{branch.max_participants ? `/${branch.max_participants}` : ''}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <Button
                    size="l"
                    onClick={joinEvent}
                    disabled={loading || !selectedCharacter}
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Присоединяемся...' : 'Присоединиться'}
                  </Button>
                </div>
              </div>
            )}
          </Div>
        </ModalPage>
      </ModalRoot>

      {/* Модальное окно участников */}
      <ModalRoot activeModal={showParticipantsModal ? 'event-participants' : null}>
        <ModalPage
          id="event-participants"
          onClose={() => setShowParticipantsModal(false)}
          header={
            <ModalPageHeader>
              Участники события
            </ModalPageHeader>
          }
        >
          <Div>
            {selectedEvent && (
              <div>
                <Text weight="2" style={{ fontSize: 18, marginBottom: 16 }}>
                  {selectedEvent.title}
                </Text>
                
                {selectedEvent.participants && selectedEvent.participants.length > 0 ? (
                  selectedEvent.participants.map(participant => (
                    <Card key={participant.id} style={{ marginBottom: 12 }}>
                      <Div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <Text weight="2" style={{ fontSize: 16 }}>
                              {participant.character_name}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#666' }}>
                              {participant.rank} - {participant.faction}
                            </Text>
                            {participant.branch_name && (
                              <Text style={{ fontSize: 14, color: '#2196F3' }}>
                                🌿 {participant.branch_name}
                              </Text>
                            )}
                          </div>
                          <Text style={{ fontSize: 12, color: '#666' }}>
                            {formatDate(participant.joined_at)}
                          </Text>
                        </div>
                      </Div>
                    </Card>
                  ))
                ) : (
                  <Text>Участников пока нет</Text>
                )}
              </div>
            )}
          </Div>
        </ModalPage>
      </ModalRoot>

      {/* Модальное окно ставок события */}
      <ModalRoot activeModal={showBetsModal ? 'event-bets' : null}>
        <ModalPage
          id="event-bets"
          onClose={() => setShowBetsModal(false)}
          header={
            <ModalPageHeader>
              Ставки на событие
            </ModalPageHeader>
          }
        >
          <Div>
            {selectedEvent && (
              <div>
                <Text weight="2" style={{ fontSize: 18, marginBottom: 16 }}>
                  {selectedEvent.title}
                </Text>
                
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
                              Результат: {bet.result === 'believers_win' ? '✅ Беливеры выиграли' : '❌ Анбеливеры выиграли'}
                            </Text>
                          )}
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                            <div style={{ padding: 12, backgroundColor: '#e8f5e8', borderRadius: 8, textAlign: 'center' }}>
                              <Text weight="2" style={{ fontSize: 14, color: '#2e7d32' }}>✅ Беливеры</Text>
                              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2e7d32' }}>{bet.believerOdds}</Text>
                              <Text style={{ fontSize: 12 }}>Ставок: {bet.believer_count}</Text>
                              <Text style={{ fontSize: 12 }}>Пул: {Math.round(bet.believers_total_pool)} 💰</Text>
                            </div>
                            
                            <div style={{ padding: 12, backgroundColor: '#ffebee', borderRadius: 8, textAlign: 'center' }}>
                              <Text weight="2" style={{ fontSize: 14, color: '#d32f2f' }}>❌ Анбеливеры</Text>
                              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#d32f2f' }}>{bet.unbelieverOdds}</Text>
                              <Text style={{ fontSize: 12 }}>Ставок: {bet.unbeliever_count}</Text>
                              <Text style={{ fontSize: 12 }}>Пул: {Math.round(bet.unbelievers_total_pool)} 💰</Text>
                            </div>
                          </div>
                          
                          {bet.status === 'open' && (
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <Button 
                                size="s"
                                onClick={() => openPlaceBetModal(bet)}
                                style={{ backgroundColor: '#4caf50', color: 'white', flex: 1 }}
                              >
                                Поставить на Беливеров ({bet.believerOdds})
                              </Button>
                              <Button 
                                size="s"
                                onClick={() => { 
                                  setBetType('unbeliever');
                                  openPlaceBetModal(bet);
                                }}
                                style={{ backgroundColor: '#f44336', color: 'white', flex: 1 }}
                              >
                                Поставить на Анбеливеров ({bet.unbelieverOdds})
                              </Button>
                            </div>
                          )}
                          
                          <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
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

      {/* Модальное окно размещения ставки */}
      <ModalRoot activeModal={showPlaceBetModal ? 'place-bet' : null}>
        <ModalPage
          id="place-bet"
          onClose={() => setShowPlaceBetModal(false)}
          header={
            <ModalPageHeader>
              Разместить ставку
            </ModalPageHeader>
          }
        >
          <Div>
            {selectedBet && (
              <div>
                <Text weight="2" style={{ fontSize: 18, marginBottom: 16 }}>
                  {selectedBet.bet_text}
                </Text>
                
                <div style={{ 
                  padding: 16, 
                  backgroundColor: betType === 'believer' ? '#e8f5e8' : '#ffebee', 
                  borderRadius: 8, 
                  marginBottom: 16,
                  textAlign: 'center'
                }}>
                  <Text weight="2" style={{ 
                    fontSize: 16, 
                    color: betType === 'believer' ? '#2e7d32' : '#d32f2f' 
                  }}>
                    {betType === 'believer' ? '✅ Верю (Беливеры)' : '❌ Не верю (Анбеливеры)'}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 8 }}>
                    Коэффициент: {betType === 'believer' ? selectedBet.believerOdds : selectedBet.unbelieverOdds}
                  </Text>
                </div>

                <FormItem top="Выберите персонажа">
                  <Select
                    value={selectedCharacter?.toString() || ''}
                    onChange={(e) => setSelectedCharacter(parseInt(e.target.value))}
                    options={characters && characters.length > 0 ? characters.map(char => ({
                      label: `${char.character_name || 'Неизвестно'} - ${char.currency || 0} 💰`,
                      value: char.id.toString()
                    })) : []}
                  />
                </FormItem>

                <FormItem top="Размер ставки">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Введите сумму"
                    min="1"
                  />
                </FormItem>

                {selectedCharacter && betAmount && parseFloat(betAmount) > 0 && (
                  <div style={{ 
                    padding: 12, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 8, 
                    marginBottom: 16 
                  }}>
                    <Text style={{ fontSize: 14 }}>
                      Ставка: {betAmount} 💰
                    </Text>
                    <Text style={{ fontSize: 14 }}>
                      Возможный выигрыш: {Math.round(parseFloat(betAmount) * (betType === 'believer' ? selectedBet.believerOdds : selectedBet.unbelieverOdds))} 💰
                    </Text>
                  </div>
                )}

                <FormItem>
                  <Button
                    size="l"
                    onClick={placeBet}
                    disabled={loading || !selectedCharacter || !betAmount || parseFloat(betAmount) <= 0}
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Размещение...' : 'Разместить ставку'}
                  </Button>
                </FormItem>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <Button
                    size="s"
                    mode={betType === 'believer' ? 'primary' : 'secondary'}
                    onClick={() => setBetType('believer')}
                    style={{ flex: 1 }}
                  >
                    ✅ Верю ({selectedBet.believerOdds})
                  </Button>
                  <Button
                    size="s"
                    mode={betType === 'unbeliever' ? 'primary' : 'secondary'}
                    onClick={() => setBetType('unbeliever')}
                    style={{ flex: 1 }}
                  >
                    ❌ Не верю ({selectedBet.unbelieverOdds})
                  </Button>
                </div>
              </div>
            )}
          </Div>
        </ModalPage>
      </ModalRoot>

      {/* Модальное окно покидания события */}
      <ModalRoot activeModal={showLeaveModal ? 'leave' : null}>
        <ModalPage id="leave">
          <ModalPageHeader>Покинуть событие</ModalPageHeader>
          <div style={{ padding: '16px' }}>
            {selectedEvent && (
              <>
                <Text style={{ marginBottom: '16px' }}>
                  Вы уверены, что хотите покинуть событие "{selectedEvent.title}"?
                </Text>
                {selectedCharacter && (
                  <Text style={{ marginBottom: '16px', color: '#666' }}>
                    Персонаж: {characters.find(c => c.id === selectedCharacter)?.character_name}
                  </Text>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <Button
                    size="m"
                    mode="tertiary"
                    onClick={() => setShowLeaveModal(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    size="m"
                    onClick={leaveEventWithCharacter}
                    loading={loading}
                    style={{ backgroundColor: '#d32f2f', color: 'white' }}
                  >
                    Покинуть
                  </Button>
                </div>
              </>
            )}
          </div>
        </ModalPage>
      </ModalRoot>

      {snackbar}
    </Panel>
  );
};
