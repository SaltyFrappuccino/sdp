import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Div, Button, Spinner, Group, Header, SimpleCell, Badge, Chip } from '@vkontakte/vkui';

interface Location {
  id: number;
  name: string;
  island: string;
  region: string;
  water_type?: string;
  min_rank: string;
  description: string;
  image_url?: string;
}

interface EchoZone {
  intensity: number;
  residual_aura: number;
}

interface ActiveEvent {
  id: number;
  event_type: string;
  description: string;
  rewards_multiplier: number;
  active_until: string;
}

interface LocationSelectorProps {
  activityType: 'fishing' | 'hunting_ground' | 'hunting_aerial';
  characterRank: string;
  onSelectLocation: (locationId: number, location: Location) => void;
  onCancel?: () => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  activityType,
  characterRank,
  onSelectLocation,
  onCancel
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [echoZones, setEchoZones] = useState<Map<number, EchoZone>>(new Map());
  const [events, setEvents] = useState<Map<number, ActiveEvent[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterIsland, setFilterIsland] = useState<string>('all');

  useEffect(() => {
    fetchLocations();
    fetchEchoZones();
    fetchActiveEvents();
  }, [activityType]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const endpoint = activityType === 'fishing' ? 'fishing-locations' : 'hunting-locations';
      const response = await fetch(`https://sdp-back-production.up.railway.app/api/${endpoint}`);
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEchoZones = async () => {
    try {
      const response = await fetch(`https://sdp-back-production.up.railway.app/api/echo-zones/${activityType}`);
      const data = await response.json();
      
      const zonesMap = new Map<number, EchoZone>();
      data.forEach((zone: any) => {
        zonesMap.set(zone.location_id, {
          intensity: zone.intensity,
          residual_aura: zone.residual_aura_level
        });
      });
      setEchoZones(zonesMap);
    } catch (error) {
      console.error('Error fetching echo zones:', error);
    }
  };

  const fetchActiveEvents = async () => {
    try {
      const response = await fetch('https://sdp-back-production.up.railway.app/api/events/active');
      const data = await response.json();
      
      const eventsMap = new Map<number, ActiveEvent[]>();
      data.forEach((event: any) => {
        if (event.activity_type === activityType) {
          const locationEvents = eventsMap.get(event.location_id) || [];
          locationEvents.push(event);
          eventsMap.set(event.location_id, locationEvents);
        }
      });
      setEvents(eventsMap);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const canAccessLocation = (location: Location): boolean => {
    const rankOrder = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    const characterRankIndex = rankOrder.indexOf(characterRank);
    const locationRankIndex = rankOrder.indexOf(location.min_rank);
    return characterRankIndex >= locationRankIndex;
  };

  const getRankColor = (rank: string) => {
    const colors: any = {
      F: '#9E9E9E',
      E: '#795548',
      D: '#4CAF50',
      C: '#2196F3',
      B: '#9C27B0',
      A: '#FF9800',
      S: '#F44336',
      SS: '#E91E63',
      SSS: '#FFD700'
    };
    return colors[rank] || '#9E9E9E';
  };

  const getActivityIcon = () => {
    switch (activityType) {
      case 'fishing':
        return '🎣';
      case 'hunting_ground':
        return '🏹';
      case 'hunting_aerial':
        return '🦅';
      default:
        return '📍';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'migration':
        return '🦌';
      case 'anomaly':
        return '⚡';
      case 'rare_spawn':
        return '⭐';
      case 'weather':
        return '🌧️';
      case 'season':
        return '🍂';
      default:
        return '🎯';
    }
  };

  const islands = ['all', 'Кага', 'Хоши', 'Ичи', 'Куро', 'Мидзу', 'Сора'];

  const filteredLocations = locations.filter(loc => 
    filterIsland === 'all' || loc.island === filterIsland
  );

  if (loading) {
    return (
      <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="l" />
      </Div>
    );
  }

  return (
    <Div>
      <Card mode="shadow" style={{ marginBottom: 16, padding: 16 }}>
        <Title level="2">{getActivityIcon()} Выбор локации</Title>
        <Text style={{ marginTop: 8, color: 'var(--text_secondary)' }}>
          Ваш ранг: <span style={{ color: getRankColor(characterRank), fontWeight: 'bold' }}>{characterRank}</span>
        </Text>
      </Card>

      {/* Фильтр по островам */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        overflowX: 'auto', 
        padding: '8px 16px',
        marginBottom: 16 
      }}>
        {islands.map(island => (
          <Chip
            key={island}
            value={island}
            onClick={() => setFilterIsland(island)}
            style={{
              backgroundColor: filterIsland === island ? 'var(--vkui--color_background_accent)' : 'transparent',
              color: filterIsland === island ? 'var(--vkui--color_text_contrast)' : 'var(--vkui--color_text_primary)',
              border: filterIsland === island ? 'none' : '1px solid var(--vkui--color_separator_primary)'
            }}
          >
            {island === 'all' ? 'Все острова' : island}
          </Chip>
        ))}
      </div>

      {filteredLocations.length === 0 && (
        <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
          <Text style={{ color: 'var(--text_secondary)' }}>
            Нет доступных локаций
          </Text>
        </Card>
      )}

      {/* Список локаций */}
      {filteredLocations.map(location => {
        const isAccessible = canAccessLocation(location);
        const echoZone = echoZones.get(location.id);
        const locationEvents = events.get(location.id) || [];
        const hasActiveEvent = locationEvents.length > 0;

        return (
          <Card
            key={location.id}
            mode="shadow"
            style={{
              marginBottom: 16,
              padding: 16,
              opacity: isAccessible ? 1 : 0.6,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Эхо-Зона фон */}
            {echoZone && (
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '50%',
                height: '100%',
                background: `linear-gradient(to left, rgba(255, 51, 71, ${echoZone.intensity * 0.1}), transparent)`,
                pointerEvents: 'none'
              }} />
            )}

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <Title level="3">{location.name}</Title>
                  <Text style={{ fontSize: 14, color: 'var(--text_secondary)' }}>
                    {location.island} • {location.region || location.water_type}
                  </Text>
                </div>
                
                <Badge
                  mode="prominent"
                  style={{
                    background: getRankColor(location.min_rank),
                    color: 'white'
                  }}
                >
                  {location.min_rank}
                </Badge>
              </div>

              <Text style={{ fontSize: 14, marginBottom: 12 }}>
                {location.description}
              </Text>

              {/* Эхо-Зона */}
              {echoZone && (
                <div style={{
                  padding: 8,
                  background: 'rgba(255, 51, 71, 0.1)',
                  borderRadius: 8,
                  marginBottom: 8,
                  border: '1px solid rgba(255, 51, 71, 0.3)'
                }}>
                  <Text weight="2" style={{ fontSize: 14, marginBottom: 4 }}>
                    ⚠️ Эхо-Зона активна
                  </Text>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <Text>
                      Интенсивность: <span style={{ fontWeight: 'bold' }}>{'█'.repeat(echoZone.intensity)}</span>
                    </Text>
                    <Text>
                      Аура: <span style={{ fontWeight: 'bold' }}>{Math.round(echoZone.residual_aura * 100)}%</span>
                    </Text>
                  </div>
                </div>
              )}

              {/* События */}
              {hasActiveEvent && locationEvents.map(event => (
                <div
                  key={event.id}
                  style={{
                    padding: 8,
                    background: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 8,
                    marginBottom: 8,
                    border: '1px solid rgba(76, 175, 80, 0.3)'
                  }}
                >
                  <Text weight="2" style={{ fontSize: 14, marginBottom: 4 }}>
                    {getEventIcon(event.event_type)} {event.description}
                  </Text>
                  <Text style={{ fontSize: 12 }}>
                    Множитель наград: <span style={{ fontWeight: 'bold', color: '#4CAF50' }}>×{event.rewards_multiplier}</span>
                  </Text>
                </div>
              ))}

              {/* Доступные классы мутаций */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Badge mode="prominent" style={{ background: '#4CAF50', color: 'white' }}>
                  Затронутые
                </Badge>
                {(isAccessible && (echoZone?.intensity || 0) >= 2) && (
                  <Badge mode="prominent" style={{ background: '#FF9800', color: 'white' }}>
                    Искажённые
                  </Badge>
                )}
                {(isAccessible && (echoZone?.intensity || 0) >= 4) && (
                  <Badge mode="prominent" style={{ background: '#F44336', color: 'white' }}>
                    Бестии
                  </Badge>
                )}
              </div>

              <Button
                size="l"
                mode={isAccessible ? 'primary' : 'secondary'}
                onClick={() => isAccessible && onSelectLocation(location.id, location)}
                disabled={!isAccessible}
                stretched
              >
                {isAccessible ? 'Выбрать локацию' : `Требуется ранг ${location.min_rank}`}
              </Button>
            </div>
          </Card>
        );
      })}

      {onCancel && (
        <Button size="l" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 16 }}>
          Отмена
        </Button>
      )}
    </Div>
  );
};

export default LocationSelector;

