import React, { FC, useState, useEffect } from 'react';
import {
  Panel, PanelHeader, Div, Card, Text, Button, Textarea, Snackbar,
  ModalRoot, ModalPage, ModalPageHeader, FormItem
} from '@vkontakte/vkui';
import { Icon28CalendarOutline, Icon28UsersOutline } from '@vkontakte/icons';
import { API_URL } from '../api';

interface NavIdProps {
  id: string;
}

interface EventsPanelProps extends NavIdProps {
  fetchedUser?: any;
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
  participants?: EventParticipant[];
}

interface EventParticipant {
  id: number;
  character_id: number;
  character_name: string;
  character_rank: string;
  faction: string;
  registration_text: string;
  status: string;
  registered_at: string;
}

interface Character {
  id: number;
  character_name: string;
  rank: string;
  faction: string;
}

export const EventsPanel: FC<EventsPanelProps> = ({ id, fetchedUser }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [registrationText, setRegistrationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchCharacters();
  }, [fetchedUser]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events?status=open`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      showResultSnackbar('Ошибка загрузки событий', false);
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
      showResultSnackbar('Ошибка загрузки деталей события', false);
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

  const openRegistrationModal = (event: Event) => {
    if (!characters.length) {
      showResultSnackbar('У вас нет персонажей для регистрации', false);
      return;
    }
    setSelectedEvent(event);
    setSelectedCharacter(null);
    setRegistrationText('');
    setShowRegistrationModal(true);
  };

  const openParticipantsModal = async (event: Event) => {
    await fetchEventDetails(event.id);
    setShowParticipantsModal(true);
  };

  const registerForEvent = async () => {
    if (!selectedEvent || !selectedCharacter || !registrationText.trim()) {
      showResultSnackbar('Заполните все поля', false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/events/${selectedEvent.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          vk_id: fetchedUser?.id,
          registration_text: registrationText
        })
      });

      if (response.ok) {
        showResultSnackbar('Регистрация прошла успешно!', true);
        setShowRegistrationModal(false);
        fetchEvents();
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка регистрации', false);
      }
    } catch (error) {
      console.error('Failed to register for event:', error);
      showResultSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const withdrawFromEvent = async (eventId: number, characterId: number) => {
    try {
      const response = await fetch(`${API_URL}/events/${eventId}/register`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId })
      });

      if (response.ok) {
        showResultSnackbar('Регистрация отменена', true);
        fetchEvents();
        if (selectedEvent) {
          await fetchEventDetails(selectedEvent.id);
        }
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка отмены регистрации', false);
      }
    } catch (error) {
      console.error('Failed to withdraw from event:', error);
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const isCharacterRegistered = (event: Event, characterId: number) => {
    if (!event.participants) return false;
    return event.participants.some(p => p.character_id === characterId && p.status === 'registered');
  };

  const canRegister = (event: Event) => {
    if (event.status !== 'open') return false;
    if (event.registration_deadline && new Date() > new Date(event.registration_deadline)) return false;
    if (event.max_participants && event.participant_count >= event.max_participants) return false;
    return true;
  };

  const getRankText = (minRank: string, maxRank: string) => {
    if (!minRank && !maxRank) return 'Любой ранг';
    if (minRank && maxRank) return `Ранг: ${minRank}-${maxRank}`;
    if (minRank) return `Ранг: ${minRank}+`;
    if (maxRank) return `Ранг: до ${maxRank}`;
    return '';
  };

  return (
    <Panel id={id}>
      <PanelHeader>📅 События</PanelHeader>
      
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
                    <Text weight="2" style={{ fontSize: 16, marginBottom: 4 }}>
                      {event.title}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                      Организатор: {event.organizer_name}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="s"
                        mode="secondary"
                        onClick={() => openParticipantsModal(event)}
                      >
                        Участники
                      </Button>
                      {canRegister(event) && (
                        <Button
                          size="s"
                          onClick={() => openRegistrationModal(event)}
                        >
                          Зарегистрироваться
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

                  {(event.min_rank || event.max_rank) && (
                    <Text style={{ fontSize: 14, color: '#666' }}>
                      {getRankText(event.min_rank, event.max_rank)}
                    </Text>
                  )}
                </div>

                {event.registration_deadline && (
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                    Регистрация до: {formatDate(event.registration_deadline)}
                  </Text>
                )}

                {!canRegister(event) && (
                  <Text style={{ fontSize: 14, color: '#f44336', marginBottom: 8 }}>
                    {event.status !== 'open' ? 'Регистрация закрыта' :
                     event.registration_deadline && new Date() > new Date(event.registration_deadline) ? 'Срок регистрации истек' :
                     event.max_participants && event.participant_count >= event.max_participants ? 'Места закончились' :
                     'Регистрация недоступна'}
                  </Text>
                )}

                {/* Показываем зарегистрированных персонажей */}
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
                        onClick={() => withdrawFromEvent(event.id, character.id)}
                      >
                        Отменить
                      </Button>
                    </div>
                  );
                })}
              </Div>
            </Card>
          ))
        )}
      </Div>

      {/* Модальное окно регистрации */}
      <ModalRoot activeModal={showRegistrationModal ? 'register-event' : null}>
        <ModalPage
          id="register-event"
          onClose={() => setShowRegistrationModal(false)}
          header={
            <ModalPageHeader>
              Регистрация на событие
            </ModalPageHeader>
          }
        >
          <Div>
            {selectedEvent && (
              <div>
                <FormItem top="Событие">
                  <Text weight="2">{selectedEvent.title}</Text>
                </FormItem>

                <FormItem top="Выберите персонажа *">
                  <select
                    value={selectedCharacter || ''}
                    onChange={(e) => setSelectedCharacter(parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">Выберите персонажа</option>
                    {characters.map(character => (
                      <option key={character.id} value={character.id}>
                        {character.character_name} ({character.rank}) - {character.faction}
                      </option>
                    ))}
                  </select>
                </FormItem>

                <FormItem top="Инструкции для регистрации">
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {selectedEvent.registration_instructions}
                  </Text>
                </FormItem>

                <FormItem top="Ваш ответ *">
                  <Textarea
                    value={registrationText}
                    onChange={(e) => setRegistrationText(e.target.value)}
                    placeholder="Введите ваш ответ согласно инструкциям выше"
                    rows={4}
                  />
                </FormItem>

                <FormItem>
                  <Button
                    size="l"
                    onClick={registerForEvent}
                    disabled={loading || !selectedCharacter || !registrationText.trim()}
                    style={{ width: '100%' }}
                  >
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                  </Button>
                </FormItem>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <Text weight="2" style={{ fontSize: 16 }}>
                              {participant.character_name}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#666' }}>
                              {participant.character_rank} - {participant.faction}
                            </Text>
                          </div>
                          <Text style={{ fontSize: 12, color: '#666' }}>
                            {formatDate(participant.registered_at)}
                          </Text>
                        </div>
                        
                        <div style={{ marginTop: 8 }}>
                          <Text weight="2" style={{ fontSize: 14, marginBottom: 4 }}>
                            Ответ:
                          </Text>
                          <Text style={{ fontSize: 14, color: '#666' }}>
                            {participant.registration_text}
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

      {snackbar}
    </Panel>
  );
};