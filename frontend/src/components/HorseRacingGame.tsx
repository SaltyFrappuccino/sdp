import { FC, useState, useEffect } from 'react';
import { Card, Div, Text, Button, Spinner } from '@vkontakte/vkui';
import { Icon28GameOutline } from '@vkontakte/icons';
import { API_URL } from '../api';

interface HorseRacingGameProps {
  characterId: number;
  betAmount: number;
  onGameStart: () => void;
  onGameEnd: (result: any) => void;
  onClose: () => void;
}

interface Horse {
  id: number;
  name: string;
  emoji: string;
  personality: string;
  speed: number;
  stamina: number;
  luck: number;
  odds: number;
  color: string;
  position: number;
  raceSpeed: number;
}

interface Bet {
  horseId: number;
  amount: number;
  type: 'win' | 'place' | 'show';
}

const HORSE_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'
];

export const HorseRacingGame: FC<HorseRacingGameProps> = ({ betAmount, onGameStart, onGameEnd, onClose }) => {
  const [horses, setHorses] = useState<Horse[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isRacing, setIsRacing] = useState(false);
  const [raceProgress, setRaceProgress] = useState<number[]>([]);
  const [result, setResult] = useState<{ 
    winner: Horse; 
    winAmount: number; 
    message: string; 
    finalPositions: Horse[] 
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<number | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<'win' | 'place' | 'show'>('win');
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing'>('waiting');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeHorses();
  }, []);

  const initializeHorses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/casino/horseracing/horses`);
      const data = await response.json();
      
      if (response.ok && data.horses) {
        const initializedHorses = data.horses.map((horse: any, index: number) => ({
          ...horse,
          position: 0,
          raceSpeed: Math.random() * 0.02 + 0.01, // Случайная скорость для анимации
          color: HORSE_COLORS[index % HORSE_COLORS.length]
          // odds уже приходят с backend
        }));
        setHorses(initializedHorses);
        setRaceProgress(new Array(data.horses.length).fill(0));
      }
    } catch (error) {
      console.error('Failed to load horses:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBet = (horseId: number, type: 'win' | 'place' | 'show') => {
    // Разрешаем только одну ставку на одну лошадь
    const existingBet = bets.find(bet => bet.horseId === horseId);
    if (existingBet) {
      // Если ставка на эту лошадь уже есть, можно изменить тип, но не добавить новую
      setBets(bets.map(bet => 
        bet.horseId === horseId
          ? { ...bet, type, amount: betAmount } // Обновляем тип и сумму ставки
          : bet
      ));
      return;
    }

    // Ограничиваем количество ставок до одной
    if (bets.length >= 1) {
      alert('Можно сделать только одну ставку за забег.');
      return;
    }

    setBets([...bets, { horseId, type, amount: betAmount }]);
  };

  const removeBet = (horseId: number, type: 'win' | 'place' | 'show') => {
    setBets(bets.filter(bet => !(bet.horseId === horseId && bet.type === type)));
  };

  const getTotalBetAmount = () => {
    return bets.reduce((total, bet) => total + bet.amount, 0);
  };

  const startGame = () => {
    onGameStart();
    setGameStatus('playing');
  };

  const startRace = async () => {
    if (isRacing || bets.length === 0) return;
    
    const totalBet = getTotalBetAmount();
    
    setIsRacing(true);
    setResult(null);
    setShowResult(false);
    
    // Сброс позиций и расчет скоростей на основе статов
    const resetHorses = horses.map(horse => {
      // Отладка: проверяем статы лошади
      console.log('Horse stats:', {
        name: horse.name,
        speed: horse.speed,
        stamina: horse.stamina,
        luck: horse.luck
      });
      
      // Безопасный расчет скорости с дефолтными значениями
      const speed = Number(horse.speed) || 5;
      const stamina = Number(horse.stamina) || 5;
      const luck = Number(horse.luck) || 5;
      
      const baseSpeed = (speed + stamina + luck) / 150; // Увеличили базовую скорость
      const randomFactor = Math.random() * 0.3 + 0.85; // Случайность от 0.85 до 1.15
      const finalSpeed = baseSpeed * randomFactor;
      
      console.log('Calculated speed for', horse.name, ':', {
        baseSpeed,
        randomFactor,
        finalSpeed
      });
      
      return { 
        ...horse, 
        position: 0,
        raceSpeed: finalSpeed
      };
    });
    setHorses(resetHorses);
    setRaceProgress(new Array(resetHorses.length).fill(0));
    
    console.log('Starting race with horses:', resetHorses.length, 'horses');
    
    // Анимация гонки с учетом статов
    const raceDuration = 8000; // 8 секунд
    const updateInterval = 50; // Обновляем каждые 50мс
    const totalUpdates = raceDuration / updateInterval;
    
    let currentHorsesState = resetHorses;

    for (let i = 0; i < totalUpdates; i++) {
      await new Promise(resolve => setTimeout(resolve, updateInterval));
      
      const updatedHorses = currentHorsesState.map(horse => {
        // Безопасные расчеты с проверками на NaN
        const stamina = Number(horse.stamina) || 5;
        const luck = Number(horse.luck) || 5;
        const raceSpeed = Number(horse.raceSpeed) || 0.01;
        const currentPosition = Number(horse.position) || 0;
        
        const fatigueMultiplier = 1 - (i / totalUpdates) * (1 - stamina / 100); // Усталость
        const luckBonus = (Math.random() - 0.5) * (luck / 1000); // Бонус удачи
        const speedWithModifiers = raceSpeed * fatigueMultiplier + luckBonus;
        
        const newPosition = Math.min(currentPosition + speedWithModifiers, 1);
        
        // Дополнительная проверка на NaN
        const safeNewPosition = isNaN(newPosition) ? currentPosition : newPosition;
        
        return { ...horse, position: safeNewPosition };
      });
      
      currentHorsesState = updatedHorses;
      setHorses(updatedHorses);
      const newProgress = updatedHorses.map(horse => horse.position);
      setRaceProgress(newProgress);
      
      // Отладочная информация каждые 20 итераций
      if (i % 20 === 0) {
        console.log(`Iteration ${i}:`, newProgress);
      }
    }
    
    // Определяем победителя, используя актуальное состояние
    const finalHorses = currentHorsesState;
    const sortedHorses = [...finalHorses].sort((a, b) => b.position - a.position);
    const winner = sortedHorses[0];
    
    const gameResult = calculateResult(winner, sortedHorses, bets);
    
    setResult({
      winner,
      winAmount: gameResult.winAmount,
      message: gameResult.message,
      finalPositions: sortedHorses
    });
    setShowResult(true);
    setIsRacing(false);
    
    setTimeout(() => {
      onGameEnd({
        result: gameResult.winAmount > 0 ? 'win' : 'lose',
        winAmount: gameResult.winAmount,
        gameData: { 
          winner: winner.id, 
          finalPositions: sortedHorses.map(h => h.id),
          bets: bets 
        },
        raceResults: sortedHorses.map((horse, index) => ({
          horse_id: horse.id,
          position: index + 1,
          final_time: Math.random() * 2 + 8, // Случайное время от 8 до 10 секунд
          distance_covered: 1000 // Полная дистанция
        }))
      });
    }, 3000);
  };

  const calculateResult = (winner: Horse, finalPositions: Horse[], bets: Bet[]) => {
    let totalWinAmount = 0;
    let winMessages: string[] = [];
    
    bets.forEach(bet => {
      const horse = horses.find(h => h.id === bet.horseId);
      if (!horse) return;
      
      let isWin = false;
      let multiplier = 0;
      
      switch (bet.type) {
        case 'win':
          isWin = bet.horseId === winner.id;
          multiplier = horse.odds;
          break;
        case 'place':
          isWin = finalPositions.slice(0, 2).some(h => h.id === bet.horseId);
          multiplier = horse.odds * 0.4; // 40% от выигрышных коэффициентов
          break;
        case 'show':
          isWin = finalPositions.slice(0, 3).some(h => h.id === bet.horseId);
          multiplier = horse.odds * 0.2; // 20% от выигрышных коэффициентов
          break;
      }
      
      if (isWin) {
        const winAmount = Math.floor(bet.amount * multiplier);
        totalWinAmount += winAmount;
        winMessages.push(`${horse.name} (${bet.type}): +${winAmount}`);
      }
    });
    
    const message = winMessages.length > 0 
      ? `🏆 Победа! ${winMessages.join(', ')}`
      : `😔 Не повезло! Победил ${winner.name}`;
    
    return { winAmount: totalWinAmount, message };
  };

  const renderRaceTrack = () => {
    return (
      <div style={{
        backgroundColor: '#1a1a1a',
        border: '2px solid #444',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20
      }}>
        <Text weight="2" style={{ marginBottom: 12, fontSize: 14, color: '#fff', textAlign: 'center' }}>
          🏁 Трек гонки
        </Text>
        
        {horses.map((horse, index) => (
          <div key={horse.id} style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 4
            }}>
              <div style={{
                width: 24,
                height: 24,
                backgroundColor: horse.color,
                borderRadius: '50%',
                marginRight: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {horse.emoji || horse.id}
              </div>
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>
                  {horse.name}
                </Text>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  <Text style={{ fontSize: 9, color: '#ffd700' }}>
                    🏃 {horse.speed}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#00bcd4' }}>
                    💪 {horse.stamina}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#4caf50' }}>
                    🍀 {horse.luck}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#ccc' }}>
                    {horse.odds}:1
                  </Text>
                </div>
                <Text style={{ fontSize: 8, color: '#999', marginTop: 1 }}>
                  {horse.personality}
                </Text>
              </div>
            </div>
            
            <div style={{
              width: '100%',
              height: 20,
              backgroundColor: '#333',
              borderRadius: 10,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(raceProgress[index] || 0) * 100}%`,
                height: '100%',
                backgroundColor: horse.color,
                borderRadius: 10,
                transition: 'width 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 4
              }}>
                {raceProgress[index] > 0.8 && (
                  <span style={{ fontSize: 12 }}>🏃</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (gameStatus === 'waiting') {
    return (
      <Card style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
        <Div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Text weight="2" style={{ fontSize: 24, color: '#fff', marginBottom: 16 }}>
            🐎 Скачки
          </Text>
          <Text style={{ color: '#ccc', marginBottom: 24 }}>
            Ставка: {betAmount} 💰
          </Text>
          {loading ? (
            <div>
              <Spinner size="m" style={{ marginBottom: 16 }} />
              <Text style={{ color: '#ccc' }}>
                Подготовка лошадей к гонке...
              </Text>
            </div>
          ) : (
            <div>
              <Text style={{ color: '#ccc', marginBottom: 32, lineHeight: 1.4 }}>
                В скачках участвуют случайно выбранные лошади с уникальными характеристиками. 
                Сделайте ставки и начните гонку.
              </Text>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Button
                  size="l"
                  onClick={startGame}
                  style={{ backgroundColor: '#4caf50', color: '#fff' }}
                >
                  Начать игру
                </Button>
                <Button
                  size="l"
                  onClick={onClose}
                  style={{ backgroundColor: '#444', color: '#fff' }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          )}
        </Div>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
      <Div style={{ backgroundColor: '#2a2a2a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text weight="2" style={{ fontSize: 18, color: '#fff' }}>🐎 Скачки</Text>
          <Button 
            size="s" 
            onClick={onClose}
            style={{ backgroundColor: '#444', color: '#fff' }}
          >
            ✕
          </Button>
        </div>

        {/* Трек гонки */}
        {renderRaceTrack()}

        {/* Результат */}
        {showResult && result && (
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: result.winAmount > 0 ? '#e8f5e8' : '#ffebee',
            borderRadius: 8, 
            marginBottom: 16,
            animation: 'resultPulse 0.5s ease'
          }}>
            <Text weight="2" style={{ 
              color: result.winAmount > 0 ? '#2e7d32' : '#d32f2f',
              fontSize: 16
            }}>
              🏆 Победитель: {result.winner.name}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 14, color: '#666' }}>
              {result.message}
            </Text>
            {result.winAmount > 0 && (
              <Text style={{ marginTop: 8, fontSize: 18, fontWeight: 'bold' }}>
                +{result.winAmount} 💰
              </Text>
            )}
          </div>
        )}

        {/* Ставки */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 12, fontSize: 14, color: '#fff' }}>
            Ваши ставки: {getTotalBetAmount()} 💰
          </Text>
          
          {bets.length > 0 && (
            <div style={{ 
              maxHeight: 120, 
              overflowY: 'auto', 
              marginBottom: 12,
              padding: 8,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 6
            }}>
              {bets.map((bet, index) => {
                const horse = horses.find((h: Horse) => h.id === bet.horseId);
                return (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 4,
                    fontSize: 12
                  }}>
                    <span style={{ color: '#fff' }}>
                      {horse?.name} ({bet.type}) - {bet.amount}💰
                    </span>
                  <Button
                    size="s"
                    onClick={() => removeBet(bet.horseId, bet.type)}
                    style={{ backgroundColor: '#dc3545', color: '#fff', minWidth: 20, height: 20 }}
                  >
                    ×
                  </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Лошади для ставок */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 14, color: '#fff' }}>Сделать ставку:</Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {horses.map((horse: Horse) => (
              <div key={horse.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 8,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 6,
                border: `2px solid ${horse.color}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    backgroundColor: horse.color,
                    borderRadius: '50%',
                    marginRight: 8
                  }} />
                  <Text style={{ color: '#fff', fontSize: 12 }}>
                    {horse.name} ({horse.odds}:1)
                  </Text>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Button
                    size="s"
                    onClick={() => addBet(horse.id, 'win')}
                    style={{ backgroundColor: '#28a745', fontSize: 10 }}
                  >
                    Победа
                  </Button>
                  <Button
                    size="s"
                    onClick={() => addBet(horse.id, 'place')}
                    style={{ backgroundColor: '#ffc107', color: '#000', fontSize: 10 }}
                  >
                    Место
                  </Button>
                  <Button
                    size="s"
                    onClick={() => addBet(horse.id, 'show')}
                    style={{ backgroundColor: '#17a2b8', fontSize: 10 }}
                  >
                    Показ
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка старта */}
        <div style={{ textAlign: 'center' }}>
          <Button
            size="l"
            before={isRacing ? <Spinner size="s" /> : <Icon28GameOutline />}
            onClick={startRace}
            disabled={isRacing || bets.length === 0}
            style={{
              minWidth: 120,
              height: 50,
              fontSize: 16,
              fontWeight: 'bold',
              background: isRacing ? '#666' : 'linear-gradient(45deg, #ff6b6b, #ff8e53)',
              border: 'none',
              boxShadow: isRacing ? 'none' : '0 4px 8px rgba(0,0,0,0.3)'
            }}
          >
            {isRacing ? 'ГОНКА...' : 'СТАРТ!'}
          </Button>
        </div>

        {/* Правила */}
        <div style={{ marginTop: 20, padding: 12, backgroundColor: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 14, color: '#fff' }}>Правила:</Text>
          <Text style={{ fontSize: 12, lineHeight: 1.4, color: '#ccc' }}>
            🏆 Победа: Лошадь должна прийти первой<br/>
            🥈 Место: Лошадь должна прийти 1-2<br/>
            🥉 Показ: Лошадь должна прийти 1-3<br/>
            Коэффициенты указаны для ставок на Победу
          </Text>
        </div>
      </Div>

      <style>{`
        @keyframes resultPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </Card>
  );
};
