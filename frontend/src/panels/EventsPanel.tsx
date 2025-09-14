import React, { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Button, Card, Div, Text, Input, Select, Snackbar, ModalCard, ModalPageContent } from '@vkontakte/vkui';
import { API_URL } from '../api';
import { Icon28CalendarOutline, Icon28UsersOutline } from '@vkontakte/icons';

interface NavIdProps {
  id: string;
}

interface Character {
  id: number;
  character_name: string;
  nickname: string;
  rank: string;
  faction: string;
  vk_id: number;
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


interface EventsPanelProps extends NavIdProps {
  fetchedUser?: any;
}

export const EventsPanel: FC<EventsPanelProps> = ({ id, fetchedUser }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [applicationData, setApplicationData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchCharacters();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/events?status=open`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${API_URL}/characters/by-vk/${fetchedUser?.id}`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
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

  const applyToEvent = async () => {
    if (!selectedEvent || !selectedCharacter || !applicationData.trim()) return;

    setLoading(true);
    try {
      const character = characters.find(c => c.id === selectedCharacter);
      if (!character) return;

      const response = await fetch(`${API_URL}/events/${selectedEvent.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          vk_id: fetchedUser?.id,
          character_name: character.character_name,
          character_rank: character.rank,
          faction: character.faction,
          application_data: { details: applicationData }
        })
      });

      if (response.ok) {
        showResultSnackbar('Заявка подана успешно!', true);
        setShowApplicationModal(false);
        setApplicationData('');
        setSelectedCharacter(null);
      } else {
        const error = await response.json();
        showResultSnackbar(error.error || 'Ошибка подачи заявки', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const openApplicationModal = (event: Event) => {
    setSelectedEvent(event);
    setShowApplicationModal(true);
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
      <PanelHeader>📅 Ивенты</PanelHeader>
      
      <Div>
        {events.length === 0 ? (
          <Card>
            <Div>
              <Text style={{ textAlign: 'center', color: '#666' }}>
                Нет доступных ивентов
              </Text>
            </Div>
          </Card>
        ) : (
          events.map(event => (
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
                        color: getDifficultyColor(event.difficulty),
                        fontWeight: 'bold',
                        fontSize: 14
                      }}
                    >
                      {event.difficulty}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      {event.recommended_rank}
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

                {event.is_deadly && (
                  <Text style={{ color: '#f44336', fontSize: 14, marginBottom: 8 }}>
                    ⚠️ Смертельный ивент
                  </Text>
                )}

                {event.is_open_world && (
                  <Text style={{ color: '#2196F3', fontSize: 14, marginBottom: 8 }}>
                    🌍 Открытый мир
                  </Text>
                )}

                {event.additional_info && (
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                    {event.additional_info}
                  </Text>
                )}

                <Button
                  size="l"
                  onClick={() => openApplicationModal(event)}
                  disabled={!characters.length}
                >
                  Подать заявку
                </Button>
              </Div>
            </Card>
          ))
        )}
      </Div>

      {showApplicationModal && selectedEvent && (
        <ModalCard
          id="application-modal"
          onClose={() => setShowApplicationModal(false)}
        >
          <ModalPageContent>
            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>
                Ивент: {selectedEvent.title}
              </Text>
              <Text style={{ color: '#666', fontSize: 14 }}>
                {selectedEvent.description}
              </Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>
                Выберите персонажа
              </Text>
              <Select
                placeholder="Выберите персонажа"
                value={selectedCharacter?.toString() || ''}
                onChange={(e) => setSelectedCharacter(parseInt(e.target.value))}
                options={characters.map(char => ({
                  label: `${char.character_name} (${char.rank}, ${char.faction})`,
                  value: char.id.toString()
                }))}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text weight="2" style={{ marginBottom: 8 }}>
                Детали заявки
              </Text>
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                Опишите, почему ваш персонаж подходит для этого ивента, его мотивацию и планы участия.
              </Text>
              <Input
                type="textarea"
                placeholder="Введите детали заявки..."
                value={applicationData}
                onChange={(e) => setApplicationData(e.target.value)}
              />
            </div>
          </ModalPageContent>
          
          <Div>
            <Button
              size="l"
              mode="secondary"
              onClick={() => setShowApplicationModal(false)}
            >
              Отмена
            </Button>
            <Button
              size="l"
              onClick={applyToEvent}
              disabled={!selectedCharacter || !applicationData.trim()}
              loading={loading}
            >
              Подать заявку
            </Button>
          </Div>
        </ModalCard>
      )}

      {snackbar}
    </Panel>
  );
};
