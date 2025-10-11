import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Div, Button, Spinner, Group, Header, SimpleCell, Tabs, TabsItem, Progress, Badge } from '@vkontakte/vkui';

interface EncounteredCreature {
  species_id: number;
  name: string;
  mutation_class: string;
  danger_rank: string;
  habitat_type: string;
  times_encountered: number;
  times_caught: number;
  best_quality: number;
  total_materials: number;
  first_encounter: string;
  last_encounter: string;
}

interface HuntingStats {
  totalAttempts: number;
  successfulHunts: number;
  failedHunts: number;
  successRate: number;
  totalMaterialsCollected: number;
  totalValueEarned: number;
  favoriteLocation: string;
  rarest_catch: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
  progress: number;
  maxProgress: number;
}

interface HunterJournalProps {
  characterId: number;
  onClose?: () => void;
}

const HunterJournal: React.FC<HunterJournalProps> = ({ characterId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'creatures' | 'stats' | 'achievements'>('creatures');
  const [creatures, setCreatures] = useState<EncounteredCreature[]>([]);
  const [stats, setStats] = useState<HuntingStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJournalData();
  }, [characterId]);

  const fetchJournalData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEncounteredCreatures(),
        fetchHuntingStats(),
        fetchAchievements()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEncounteredCreatures = async () => {
    try {
      // Симулируем данные из BestiaryResearchNotes + статистика
      const response = await fetch(`https://sdp-back-production.up.railway.app/api/bestiary/encountered/${characterId}`);
      const data = await response.json();
      setCreatures(data || []);
    } catch (error) {
      console.error('Error fetching creatures:', error);
      // Fallback данные для демонстрации
      setCreatures([
        {
          species_id: 1,
          name: 'Каменный Кабан',
          mutation_class: 'Затронутые',
          danger_rank: 'E',
          habitat_type: 'Наземные',
          times_encountered: 15,
          times_caught: 12,
          best_quality: 87,
          total_materials: 48,
          first_encounter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          last_encounter: new Date().toISOString()
        }
      ]);
    }
  };

  const fetchHuntingStats = async () => {
    try {
      const response = await fetch(`https://sdp-back-production.up.railway.app/api/hunting/stats/${characterId}`);
      const data = await response.json();
      setStats(data || {
        totalAttempts: 25,
        successfulHunts: 18,
        failedHunts: 7,
        successRate: 72,
        totalMaterialsCollected: 156,
        totalValueEarned: 12500000,
        favoriteLocation: 'Леса Мидзу',
        rarest_catch: 'Кристальный Волк (Бестия)'
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAchievements = async () => {
    // Генерируем список достижений
    const allAchievements: Achievement[] = [
      {
        id: 'first_catch',
        name: 'Первая добыча',
        description: 'Успешно завершите первую охоту',
        icon: '🎯',
        completed: true,
        progress: 1,
        maxProgress: 1
      },
      {
        id: 'hunter_10',
        name: 'Начинающий охотник',
        description: 'Совершите 10 успешных охот',
        icon: '🏹',
        completed: true,
        progress: 10,
        maxProgress: 10
      },
      {
        id: 'hunter_50',
        name: 'Опытный охотник',
        description: 'Совершите 50 успешных охот',
        icon: '🦌',
        completed: false,
        progress: 18,
        maxProgress: 50
      },
      {
        id: 'beast_slayer',
        name: 'Укротитель Бестий',
        description: 'Победите Бестию',
        icon: '⚔️',
        completed: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'perfect_hunter',
        name: 'Идеальный охотник',
        description: 'Достигните 95%+ качества добычи',
        icon: '💎',
        completed: false,
        progress: 87,
        maxProgress: 95
      },
      {
        id: 'echo_explorer',
        name: 'Исследователь Эхо-Зон',
        description: 'Охотьтесь в 5 разных Эхо-Зонах',
        icon: '⚡',
        completed: false,
        progress: 2,
        maxProgress: 5
      },
      {
        id: 'material_collector',
        name: 'Коллекционер материалов',
        description: 'Соберите 100 уникальных материалов',
        icon: '📦',
        completed: true,
        progress: 156,
        maxProgress: 100
      },
      {
        id: 'crafter',
        name: 'Мастер-ремесленник',
        description: 'Создайте 10 Синки',
        icon: '⚒️',
        completed: false,
        progress: 3,
        maxProgress: 10
      }
    ];
    
    setAchievements(allAchievements);
  };

  const getMutationClassColor = (mutationClass: string) => {
    switch (mutationClass) {
      case 'Затронутые':
        return '#4CAF50';
      case 'Искажённые':
        return '#FF9800';
      case 'Бестии':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
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
        <Title level="2">📖 Журнал охотника</Title>
      </Card>

      <Tabs>
        <TabsItem
          selected={activeTab === 'creatures'}
          onClick={() => setActiveTab('creatures')}
        >
          Существа
        </TabsItem>
        <TabsItem
          selected={activeTab === 'stats'}
          onClick={() => setActiveTab('stats')}
        >
          Статистика
        </TabsItem>
        <TabsItem
          selected={activeTab === 'achievements'}
          onClick={() => setActiveTab('achievements')}
        >
          Достижения
        </TabsItem>
      </Tabs>

      {/* Вкладка: Существа */}
      {activeTab === 'creatures' && (
        <div style={{ marginTop: 16 }}>
          {creatures.length === 0 && (
            <Card mode="shadow" style={{ padding: 24, textAlign: 'center' }}>
              <Text style={{ color: 'var(--text_secondary)' }}>
                Вы ещё не встречали существ.<br/>
                Отправляйтесь на охоту!
              </Text>
            </Card>
          )}

          <Group header={<Header>Встреченные существа ({creatures.length})</Header>}>
            {creatures.map(creature => (
              <Card
                key={creature.species_id}
                mode="shadow"
                style={{ marginBottom: 12, padding: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <Title level="3">{creature.name}</Title>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <Badge
                        mode="prominent"
                        style={{
                          background: getMutationClassColor(creature.mutation_class),
                          color: 'white',
                          fontSize: 11
                        }}
                      >
                        {creature.mutation_class}
                      </Badge>
                      <Badge
                        mode="prominent"
                        style={{
                          background: getRankColor(creature.danger_rank),
                          color: 'white',
                          fontSize: 11
                        }}
                      >
                        {creature.danger_rank}
                      </Badge>
                      <Badge mode="prominent" style={{ fontSize: 11 }}>
                        {creature.habitat_type}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div>
                    <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Встречено</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{creature.times_encountered}</Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Поймано</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }}>{creature.times_caught}</Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Лучшее качество</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{creature.best_quality}%</Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>Материалов</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{creature.total_materials}</Text>
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--separator_common)' }}>
                  <Text style={{ fontSize: 12, color: 'var(--text_secondary)' }}>
                    Успешность: {creature.times_encountered > 0 
                      ? Math.round((creature.times_caught / creature.times_encountered) * 100) 
                      : 0}%
                  </Text>
                  <Progress 
                    value={creature.times_encountered > 0 
                      ? (creature.times_caught / creature.times_encountered) * 100 
                      : 0} 
                    style={{ marginTop: 4 }}
                  />
                </div>
              </Card>
            ))}
          </Group>
        </div>
      )}

      {/* Вкладка: Статистика */}
      {activeTab === 'stats' && stats && (
        <div style={{ marginTop: 16 }}>
          <Card mode="shadow" style={{ marginBottom: 16, padding: 16 }}>
            <Title level="3" style={{ marginBottom: 16 }}>Общая статистика</Title>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', display: 'block' }}>
                  {stats.totalAttempts}
                </Text>
                <Text style={{ fontSize: 14, color: 'var(--text_secondary)' }}>
                  Всего попыток
                </Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 32, fontWeight: 'bold', display: 'block', color: '#4CAF50' }}>
                  {stats.successfulHunts}
                </Text>
                <Text style={{ fontSize: 14, color: 'var(--text_secondary)' }}>
                  Успешных охот
                </Text>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text style={{ marginBottom: 4 }}>Успешность: {stats.successRate.toFixed(1)}%</Text>
              <Progress value={stats.successRate} />
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--separator_common)'
            }}>
              <div>
                <Text style={{ fontSize: 12, color: 'var(--text_secondary)', marginBottom: 4 }}>
                  Материалов собрано
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                  {stats.totalMaterialsCollected}
                </Text>
              </div>
              <div>
                <Text style={{ fontSize: 12, color: 'var(--text_secondary)', marginBottom: 4 }}>
                  Заработано
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFC107' }}>
                  {(stats.totalValueEarned / 1000000).toFixed(1)}М₭
                </Text>
              </div>
            </div>
          </Card>

          <Card mode="shadow" style={{ padding: 16 }}>
            <Title level="3" style={{ marginBottom: 12 }}>Рекорды</Title>
            
            <SimpleCell
              before={<div style={{ fontSize: 24 }}>🏆</div>}
              subtitle="Любимая локация"
            >
              {stats.favoriteLocation}
            </SimpleCell>
            
            <SimpleCell
              before={<div style={{ fontSize: 24 }}>⭐</div>}
              subtitle="Редчайшая добыча"
            >
              {stats.rarest_catch}
            </SimpleCell>
          </Card>
        </div>
      )}

      {/* Вкладка: Достижения */}
      {activeTab === 'achievements' && (
        <div style={{ marginTop: 16 }}>
          <Group header={
            <Header>
              Достижения ({achievements.filter(a => a.completed).length}/{achievements.length})
            </Header>
          }>
            {achievements.map(achievement => (
              <Card
                key={achievement.id}
                mode="shadow"
                style={{
                  marginBottom: 12,
                  padding: 16,
                  opacity: achievement.completed ? 1 : 0.7
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    fontSize: 40,
                    filter: achievement.completed ? 'none' : 'grayscale(100%)'
                  }}>
                    {achievement.icon}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Title level="3">{achievement.name}</Title>
                      {achievement.completed && (
                        <Badge mode="prominent" style={{ background: '#4CAF50', color: 'white' }}>
                          ✓
                        </Badge>
                      )}
                    </div>
                    
                    <Text style={{ fontSize: 14, color: 'var(--text_secondary)', marginBottom: 8 }}>
                      {achievement.description}
                    </Text>
                    
                    {!achievement.completed && (
                      <div>
                        <Text style={{ fontSize: 12, marginBottom: 4 }}>
                          {achievement.progress}/{achievement.maxProgress}
                        </Text>
                        <Progress value={(achievement.progress / achievement.maxProgress) * 100} />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </Group>
        </div>
      )}

      {onClose && (
        <Button size="l" mode="secondary" onClick={onClose} stretched style={{ marginTop: 16 }}>
          Закрыть
        </Button>
      )}
    </Div>
  );
};

export default HunterJournal;

