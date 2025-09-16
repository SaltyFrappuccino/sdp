import { FC, useState, useEffect } from 'react';
import { Card, Div, Text, Button, Spinner } from '@vkontakte/vkui';
import { Icon28GameOutline } from '@vkontakte/icons';

interface RouletteGameProps {
  characterId: number;
  betAmount: number;
  onGameStart: () => void;
  onGameEnd: (result: any) => void;
  onClose: () => void;
}

interface Bet {
  type: 'number' | 'color' | 'even' | 'odd' | 'high' | 'low';
  value: number | string;
  amount: number;
}

const ROULETTE_NUMBERS = [
  { number: 0, color: 'green' },
  { number: 1, color: 'red' }, { number: 2, color: 'black' }, { number: 3, color: 'red' },
  { number: 4, color: 'black' }, { number: 5, color: 'red' }, { number: 6, color: 'black' },
  { number: 7, color: 'red' }, { number: 8, color: 'black' }, { number: 9, color: 'red' },
  { number: 10, color: 'black' }, { number: 11, color: 'red' }, { number: 12, color: 'black' },
  { number: 13, color: 'red' }, { number: 14, color: 'black' }, { number: 15, color: 'red' },
  { number: 16, color: 'black' }, { number: 17, color: 'red' }, { number: 18, color: 'black' },
  { number: 19, color: 'red' }, { number: 20, color: 'black' }, { number: 21, color: 'red' },
  { number: 22, color: 'black' }, { number: 23, color: 'red' }, { number: 24, color: 'black' },
  { number: 25, color: 'red' }, { number: 26, color: 'black' }, { number: 27, color: 'red' },
  { number: 28, color: 'black' }, { number: 29, color: 'red' }, { number: 30, color: 'black' },
  { number: 31, color: 'red' }, { number: 32, color: 'black' }, { number: 33, color: 'red' },
  { number: 34, color: 'black' }, { number: 35, color: 'red' }, { number: 36, color: 'black' }
];

export const RouletteGame: FC<RouletteGameProps> = ({ betAmount, onGameStart, onGameEnd, onClose }) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ number: number; color: string; winAmount: number; message: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [displayNumber, setDisplayNumber] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<'number' | 'color' | 'even' | 'odd' | 'high' | 'low'>('number');

  const getColorStyle = (color: string) => {
    switch (color) {
      case 'red': return { backgroundColor: '#dc3545', color: 'white' };
      case 'black': return { backgroundColor: '#212529', color: 'white' };
      case 'green': return { backgroundColor: '#28a745', color: 'white' };
      default: return { backgroundColor: '#6c757d', color: 'white' };
    }
  };

  const addBet = (type: 'number' | 'color' | 'even' | 'odd' | 'high' | 'low', value: number | string) => {
    const existingBet = bets.find(bet => bet.type === type && bet.value === value);
    
    if (existingBet) {
      setBets(bets.map(bet => 
        bet.type === type && bet.value === value 
          ? { ...bet, amount: bet.amount + betAmount }
          : bet
      ));
    } else {
      setBets([...bets, { type, value, amount: betAmount }]);
    }
  };

  const removeBet = (type: 'number' | 'color' | 'even' | 'odd' | 'high' | 'low', value: number | string) => {
    setBets(bets.filter(bet => !(bet.type === type && bet.value === value)));
  };

  const getTotalBetAmount = () => {
    return bets.reduce((total, bet) => total + bet.amount, 0);
  };

  const spin = async () => {
    if (isSpinning || bets.length === 0) return;
    
    const totalBet = getTotalBetAmount();
    onGameStart();
    
    setIsSpinning(true);
    setResult(null);
    setShowResult(false);
    
    // Анимация крутки
    const spinDuration = 3000;
    const spinInterval = 50;
    const totalUpdates = spinDuration / spinInterval;
    
    let currentNumber = 0;
    for (let i = 0; i < totalUpdates; i++) {
      const timeout = spinInterval + i * (spinInterval / totalUpdates); // Замедление
      await new Promise(resolve => setTimeout(resolve, timeout));
      currentNumber = Math.floor(Math.random() * 37);
      setDisplayNumber(currentNumber);
    }
    
    const winningNumber = ROULETTE_NUMBERS[currentNumber];
    const gameResult = calculateResult(winningNumber, bets);
    
    setResult({
      number: winningNumber.number,
      color: winningNumber.color,
      winAmount: gameResult.winAmount,
      message: gameResult.message
    });
    setShowResult(true);
    setIsSpinning(false);
    
    setTimeout(() => {
      onGameEnd({
        result: gameResult.winAmount > 0 ? 'win' : 'lose',
        winAmount: gameResult.winAmount,
        gameData: { 
          winningNumber: winningNumber.number, 
          winningColor: winningNumber.color,
          bets: bets 
        }
      });
    }, 2000);
  };

  const calculateResult = (winningNumber: { number: number; color: string }, bets: Bet[]) => {
    let totalWinAmount = 0;
    let winMessages: string[] = [];
    
    bets.forEach(bet => {
      let isWin = false;
      let multiplier = 0;
      
      switch (bet.type) {
        case 'number':
          isWin = bet.value === winningNumber.number;
          multiplier = 35; // 35:1 для конкретного числа
          break;
        case 'color':
          isWin = bet.value === winningNumber.color;
          multiplier = 2; // 2:1 для цвета
          break;
        case 'even':
          isWin = winningNumber.number !== 0 && winningNumber.number % 2 === 0;
          multiplier = 2; // 2:1 для четных
          break;
        case 'odd':
          isWin = winningNumber.number !== 0 && winningNumber.number % 2 === 1;
          multiplier = 2; // 2:1 для нечетных
          break;
        case 'high':
          isWin = winningNumber.number >= 19 && winningNumber.number <= 36;
          multiplier = 2; // 2:1 для высоких (19-36)
          break;
        case 'low':
          isWin = winningNumber.number >= 1 && winningNumber.number <= 18;
          multiplier = 2; // 2:1 для низких (1-18)
          break;
      }
      
      if (isWin) {
        const winAmount = bet.amount * multiplier;
        totalWinAmount += winAmount;
        winMessages.push(`${bet.type}: ${bet.value} (+${winAmount})`);
      }
    });
    
    const message = winMessages.length > 0 
      ? `🎉 Выигрыш! ${winMessages.join(', ')}`
      : `😔 Не повезло! Выпало ${winningNumber.number} (${winningNumber.color})`;
    
    return { winAmount: totalWinAmount, message };
  };

  const renderRouletteWheel = () => {
    return (
      <div style={{
        width: 200,
        height: 200,
        borderRadius: '50%',
        border: '4px solid #333',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexWrap: 'wrap',
        position: 'relative',
        margin: '0 auto 20px',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          fontWeight: 'bold',
          transition: 'transform 0.1s ease-out',
          ...getColorStyle(ROULETTE_NUMBERS[displayNumber]?.color || 'green')
        }}>
          {displayNumber}
        </div>
        
        {/* Центральная точка */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: '#ffd700',
          border: '2px solid #333',
          zIndex: 10
        }} />
      </div>
    );
  };

  return (
    <Card style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
      <Div style={{ backgroundColor: '#2a2a2a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text weight="2" style={{ fontSize: 18, color: '#fff' }}>🎰 Рулетка</Text>
          <Button 
            size="s" 
            onClick={onClose}
            style={{ backgroundColor: '#444', color: '#fff' }}
          >
            ✕
          </Button>
        </div>

        {/* Рулетка */}
        {renderRouletteWheel()}

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
              maxHeight: 100, 
              overflowY: 'auto', 
              marginBottom: 12,
              padding: 8,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 6
            }}>
              {bets.map((bet, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 4,
                  fontSize: 12
                }}>
                  <span style={{ color: '#fff' }}>
                    {bet.type}: {bet.value} - {bet.amount}💰
                  </span>
                  <Button
                    size="s"
                    onClick={() => removeBet(bet.type, bet.value)}
                    style={{ backgroundColor: '#dc3545', color: '#fff', minWidth: 20, height: 20 }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Быстрые ставки */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 14, color: '#fff' }}>Быстрые ставки:</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Button size="s" onClick={() => addBet('color', 'red')} style={{ backgroundColor: '#dc3545' }}>
              🔴 Красное
            </Button>
            <Button size="s" onClick={() => addBet('color', 'black')} style={{ backgroundColor: '#212529' }}>
              ⚫ Черное
            </Button>
            <Button size="s" onClick={() => addBet('even', 'even')} style={{ backgroundColor: '#6c757d' }}>
              Четное
            </Button>
            <Button size="s" onClick={() => addBet('odd', 'odd')} style={{ backgroundColor: '#6c757d' }}>
              Нечетное
            </Button>
            <Button size="s" onClick={() => addBet('high', 'high')} style={{ backgroundColor: '#6c757d' }}>
              19-36
            </Button>
            <Button size="s" onClick={() => addBet('low', 'low')} style={{ backgroundColor: '#6c757d' }}>
              1-18
            </Button>
          </div>
        </div>

        {/* Кнопка спина */}
        <div style={{ textAlign: 'center' }}>
          <Button
            size="l"
            before={isSpinning ? <Spinner size="s" /> : <Icon28GameOutline />}
            onClick={spin}
            disabled={isSpinning || bets.length === 0}
            style={{
              minWidth: 120,
              height: 50,
              fontSize: 16,
              fontWeight: 'bold',
              background: isSpinning ? '#666' : 'linear-gradient(45deg, #ff6b6b, #ff8e53)',
              border: 'none',
              boxShadow: isSpinning ? 'none' : '0 4px 8px rgba(0,0,0,0.3)'
            }}
          >
            {isSpinning ? 'КРУТИМ...' : 'КРУТИТЬ!'}
          </Button>
        </div>

        {/* Правила */}
        <div style={{ marginTop: 20, padding: 12, backgroundColor: '#2a2a2a', borderRadius: 8, border: '1px solid #444' }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 14, color: '#fff' }}>Правила:</Text>
          <Text style={{ fontSize: 12, lineHeight: 1.4, color: '#ccc' }}>
            🔴⚫ Цвет: x2 | Четное/Нечетное: x2<br/>
            1-18 / 19-36: x2 | Конкретное число: x35<br/>
            Можно делать несколько ставок одновременно
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
