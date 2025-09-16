import { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, PanelHeaderBack, Group, Header, Card, Div, Text, Button, Spinner } from '@vkontakte/vkui';
import { API_URL } from '../api';

interface HorseStatsProps {
  id: string;
  goBack: () => void;
}

interface Horse {
  id: number;
  name: string;
  emoji: string;
  personality: string;
  speed: number;
  stamina: number;
  luck: number;
  total_races: number;
  wins: number;
  second_places: number;
  third_places: number;
  total_winnings: number;
  win_rate: number;
}

export const HorseStatsPanel: FC<HorseStatsProps> = ({ id, goBack }) => {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHorseStats();
  }, []);

  const fetchHorseStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/casino/horseracing/stats`);
      const data = await response.json();
      
      if (response.ok) {
        setHorses(data.horses || []);
      } else {
        setError(data.error || 'Ошибка загрузки');
      }
    } catch (error) {
      console.error('Failed to fetch horse stats:', error);
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const getRankDisplay = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}.`;
    }
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 30) return '#4caf50';
    if (rate >= 20) return '#ff9800';
    if (rate >= 10) return '#f44336';
    return '#999';
  };

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={goBack} />}>
          Статистика лошадей
        </PanelHeader>
        <Div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Spinner size="l" />
          <Text style={{ marginTop: 16, color: '#666' }}>
            Загрузка статистики...
          </Text>
        </Div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={goBack} />}>
          Статистика лошадей
        </PanelHeader>
        <Div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Text style={{ color: '#f44336', marginBottom: 16 }}>
            {error}
          </Text>
          <Button onClick={fetchHorseStats}>
            Попробовать снова
          </Button>
        </Div>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={goBack} />}>
        🐎 Статистика лошадей
      </PanelHeader>
      
      <Group header={<Header>Рейтинг по победам</Header>}>
        {horses.length === 0 ? (
          <Div style={{ textAlign: 'center', padding: '20px' }}>
            <Text style={{ color: '#666' }}>
              Статистика пока пуста. Сыграйте несколько раз в скачки!
            </Text>
          </Div>
        ) : (
          horses.map((horse, index) => (
            <Card key={horse.id} style={{ margin: '8px 12px', background: '#2a2a2a', border: '1px solid #444' }}>
              <Div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ 
                    fontSize: 24, 
                    marginRight: 12,
                    minWidth: 40,
                    textAlign: 'center'
                  }}>
                    {getRankDisplay(index)}
                  </div>
                  <div style={{ 
                    fontSize: 28, 
                    marginRight: 12 
                  }}>
                    {horse.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text weight="2" style={{ fontSize: 16, color: '#fff', marginBottom: 4 }}>
                      {horse.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#999', lineHeight: 1.4 }}>
                      {horse.personality}
                    </Text>
                  </div>
                </div>

                {/* Характеристики */}
                <div style={{ 
                  display: 'flex', 
                  gap: 16, 
                  marginBottom: 12,
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: 8
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#ffd700', display: 'block' }}>🏃</Text>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>{horse.speed}</Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#00bcd4', display: 'block' }}>💪</Text>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>{horse.stamina}</Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#4caf50', display: 'block' }}>🍀</Text>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>{horse.luck}</Text>
                  </div>
                </div>

                {/* Статистика */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr 1fr', 
                  gap: 8,
                  marginBottom: 8
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#666', display: 'block' }}>Гонки</Text>
                    <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>
                      {horse.total_races}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#666', display: 'block' }}>Победы</Text>
                    <Text style={{ fontSize: 14, color: '#4caf50', fontWeight: 'bold' }}>
                      {horse.wins}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#666', display: 'block' }}>Призы</Text>
                    <Text style={{ fontSize: 14, color: '#ff9800', fontWeight: 'bold' }}>
                      {horse.second_places + horse.third_places}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#666', display: 'block' }}>% побед</Text>
                    <Text style={{ 
                      fontSize: 14, 
                      color: getWinRateColor(horse.win_rate || 0), 
                      fontWeight: 'bold' 
                    }}>
                      {horse.win_rate || 0}%
                    </Text>
                  </div>
                </div>

                {/* Заработок */}
                {horse.total_winnings > 0 && (
                  <div style={{ 
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 6,
                    border: '1px solid rgba(76, 175, 80, 0.3)'
                  }}>
                    <Text style={{ fontSize: 12, color: '#4caf50' }}>
                      💰 Общий заработок: {horse.total_winnings.toLocaleString('ru-RU')}
                    </Text>
                  </div>
                )}
              </Div>
            </Card>
          ))
        )}
      </Group>

      <Group>
        <Div style={{ paddingBottom: 20 }}>
          <Button stretched onClick={fetchHorseStats} mode="secondary">
            🔄 Обновить статистику
          </Button>
        </Div>
      </Group>
    </Panel>
  );
};
