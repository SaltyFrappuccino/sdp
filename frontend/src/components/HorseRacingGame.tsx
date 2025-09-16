import { FC, useState, useEffect } from 'react';
import { Card, Div, Text, Button, Spinner } from '@vkontakte/vkui';
import { Icon28GameOutline } from '@vkontakte/icons';

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
  odds: number;
  color: string;
  position: number;
  speed: number;
}

interface Bet {
  horseId: number;
  amount: number;
  type: 'win' | 'place' | 'show';
}

const HORSES = [
  { id: 1, name: 'Молния', odds: 2.5, color: '#ff6b6b' },
  { id: 2, name: 'Гром', odds: 3.2, color: '#4ecdc4' },
  { id: 3, name: 'Ветер', odds: 4.0, color: '#45b7d1' },
  { id: 4, name: 'Огонь', odds: 5.5, color: '#f9ca24' },
  { id: 5, name: 'Звезда', odds: 7.0, color: '#6c5ce7' },
  { id: 6, name: 'Мечта', odds: 8.5, color: '#a29bfe' }
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

  useEffect(() => {
    initializeHorses();
  }, []);

  const initializeHorses = () => {
    const initializedHorses = HORSES.map(horse => ({
      ...horse,
      position: 0,
      speed: Math.random() * 0.02 + 0.01 // Случайная скорость
    }));
    setHorses(initializedHorses);
    setRaceProgress(new Array(HORSES.length).fill(0));
  };

  const addBet = (horseId: number, type: 'win' | 'place' | 'show') => {
    const existingBet = bets.find(bet => bet.horseId === horseId && bet.type === type);
    
    if (existingBet) {
      setBets(bets.map(bet => 
        bet.horseId === horseId && bet.type === type
          ? { ...bet, amount: bet.amount + betAmount }
          : bet
      ));
    } else {
      setBets([...bets, { horseId, type, amount: betAmount }]);
    }
  };

  const removeBet = (horseId: number, type: 'win' | 'place' | 'show') => {
    setBets(bets.filter(bet => !(bet.horseId === horseId && bet.type === type)));
  };

  const getTotalBetAmount = () => {
    return bets.reduce((total, bet) => total + bet.amount, 0);
  };

  const startRace = async () => {
    if (isRacing || bets.length === 0) return;
    
    const totalBet = getTotalBetAmount();
    onGameStart();
    
    setIsRacing(true);
    setResult(null);
    setShowResult(false);
    
    // Сброс позиций
    const resetHorses = horses.map(horse => ({ ...horse, position: 0 }));
    setHorses(resetHorses);
    setRaceProgress(new Array(HORSES.length).fill(0));
    
    // Анимация гонки
    const raceDuration = 8000; // 8 секунд
    const updateInterval = 50; // Обновляем каждые 50мс
    const totalUpdates = raceDuration / updateInterval;
    
    for (let i = 0; i < totalUpdates; i++) {
      await new Promise(resolve => setTimeout(resolve, updateInterval));
      
      setHorses(prevHorses => {
        const updatedHorses = prevHorses.map(horse => {
          const newPosition = Math.min(horse.position + horse.speed + (Math.random() - 0.5) * 0.01, 1);
          return { ...horse, position: newPosition };
        });
        
        // Обновляем прогресс для визуализации
        setRaceProgress(updatedHorses.map(horse => horse.position));
        
        return updatedHorses;
      });
    }
    
    // Определяем победителя
    const finalHorses = horses.map(horse => ({ ...horse, position: Math.min(horse.position + horse.speed, 1) }));
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
        }
      });
    }, 3000);
  };

  const calculateResult = (winner: Horse, finalPositions: Horse[], bets: Bet[]) => {
    let totalWinAmount = 0;
    let winMessages: string[] = [];
    
    bets.forEach(bet => {
      const horse = HORSES.find(h => h.id === bet.horseId);
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
                width: 20,
                height: 20,
                backgroundColor: horse.color,
                borderRadius: '50%',
                marginRight: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {horse.id}
              </div>
              <Text style={{ fontSize: 12, color: '#fff', marginRight: 8 }}>
                {horse.name}
              </Text>
              <Text style={{ fontSize: 10, color: '#ccc' }}>
                {horse.odds}:1
              </Text>
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
                const horse = HORSES.find(h => h.id === bet.horseId);
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
            {HORSES.map(horse => (
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
                    Win
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
