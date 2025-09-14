import { FC, useState } from 'react';
import { Card, Div, Text, Button, Spinner, Select } from '@vkontakte/vkui';
import { Icon28Dice1Outline } from '@vkontakte/icons';

interface DiceGameProps {
  characterId: number;
  betAmount: number;
  onGameEnd: (result: any) => void;
  onClose: () => void;
}

interface DiceResult {
  dice1: number;
  dice2: number;
  total: number;
  prediction: number;
  result: 'win' | 'lose';
  winAmount: number;
}

const DICE_FACES = [
  ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'], // Обычные кости
  ['🎲', '🎲', '🎲', '🎲', '🎲', '🎲']  // Альтернативные символы
];

export const DiceGame: FC<DiceGameProps> = ({ betAmount, onGameEnd, onClose }) => {
  const [prediction, setPrediction] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [diceValues, setDiceValues] = useState<{ dice1: number; dice2: number }>({ dice1: 1, dice2: 1 });
  const [result, setResult] = useState<DiceResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rollHistory, setRollHistory] = useState<DiceResult[]>([]);

  const rollDice = async () => {
    if (isRolling) return;
    
    setIsRolling(true);
    setResult(null);
    setShowResult(false);
    
    // Анимация броска костей
    const rollDuration = 1500;
    const rollInterval = 100;
    const totalRolls = rollDuration / rollInterval;
    
    for (let i = 0; i < totalRolls; i++) {
      await new Promise(resolve => setTimeout(resolve, rollInterval));
      
      setDiceValues({
        dice1: Math.floor(Math.random() * 6) + 1,
        dice2: Math.floor(Math.random() * 6) + 1
      });
    }
    
    // Финальный результат
    const finalDice1 = Math.floor(Math.random() * 6) + 1;
    const finalDice2 = Math.floor(Math.random() * 6) + 1;
    const total = finalDice1 + finalDice2;
    const predictionTotal = prediction * 2;
    
    const isWin = total === predictionTotal;
    const winAmount = isWin ? Math.floor(betAmount * getMultiplier(prediction)) : 0;
    
    const diceResult: DiceResult = {
      dice1: finalDice1,
      dice2: finalDice2,
      total,
      prediction: predictionTotal,
      result: isWin ? 'win' : 'lose',
      winAmount
    };
    
    setDiceValues({ dice1: finalDice1, dice2: finalDice2 });
    setResult(diceResult);
    setShowResult(true);
    setRollHistory(prev => [diceResult, ...prev.slice(0, 4)]); // Храним последние 5 бросков
    setIsRolling(false);
    
    // Передаем результат родительскому компоненту
    setTimeout(() => {
      onGameEnd({
        result: diceResult.result,
        winAmount: diceResult.winAmount,
        gameData: diceResult
      });
    }, 2000);
  };

  const getMultiplier = (pred: number): number => {
    // Чем меньше число, тем больше множитель
    switch (pred) {
      case 1: return 12; // 2 - очень редко
      case 2: return 8;  // 4
      case 3: return 6;  // 6
      case 4: return 4;  // 8
      case 5: return 3;  // 10
      case 6: return 2;  // 12 - часто
      default: return 1;
    }
  };

  const getDiceFace = (value: number, isRolling: boolean) => {
    const faceIndex = isRolling ? Math.floor(Math.random() * 6) : value - 1;
    return DICE_FACES[0][faceIndex];
  };

  const getProbability = (pred: number): number => {
    const targetSum = pred * 2;
    let count = 0;
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 + d2 === targetSum) count++;
      }
    }
    return Math.round((count / 36) * 100);
  };

  return (
    <Card>
      <Div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text weight="2" style={{ fontSize: 18 }}>🎲 Кости</Text>
          <Button size="s" onClick={onClose}>✕</Button>
        </div>

        {/* Выбор предсказания */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8 }}>Предскажите сумму костей:</Text>
          <Select
            value={prediction.toString()}
            onChange={(e) => setPrediction(parseInt(e.target.value))}
            options={[1,2,3,4,5,6].map(num => ({
              label: `${num} (сумма ${num * 2}) - ${getProbability(num)}% шанс`,
              value: num.toString()
            }))}
          />
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Множитель: x{getMultiplier(prediction)} | Шанс: {getProbability(prediction)}%
          </Text>
        </div>

        {/* Кости */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 20, 
          marginBottom: 20,
          padding: '20px 0'
        }}>
          <div
            style={{
              width: 80,
              height: 80,
              border: '3px solid #333',
              borderRadius: 12,
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              transform: isRolling ? 'rotate(360deg)' : 'rotate(0deg)',
              transition: isRolling ? 'transform 0.1s linear' : 'transform 0.3s ease'
            }}
          >
            {getDiceFace(diceValues.dice1, isRolling)}
          </div>
          
          <div
            style={{
              width: 80,
              height: 80,
              border: '3px solid #333',
              borderRadius: 12,
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              transform: isRolling ? 'rotate(-360deg)' : 'rotate(0deg)',
              transition: isRolling ? 'transform 0.1s linear' : 'transform 0.3s ease'
            }}
          >
            {getDiceFace(diceValues.dice2, isRolling)}
          </div>
        </div>

        {/* Результат */}
        {showResult && result && (
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: result.result === 'win' ? '#e8f5e8' : '#ffebee',
            borderRadius: 8, 
            marginBottom: 16,
            animation: 'resultPulse 0.5s ease'
          }}>
            <Text weight="2" style={{ 
              color: result.result === 'win' ? '#2e7d32' : '#d32f2f',
              fontSize: 16
            }}>
              {result.result === 'win' ? '🎉 Угадали!' : '😔 Не угадали'}
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14 }}>
              Сумма: {result.total} | Предсказание: {result.prediction}
            </Text>
            {result.winAmount > 0 && (
              <Text style={{ marginTop: 8, fontSize: 18, fontWeight: 'bold' }}>
                +{result.winAmount} 💰
              </Text>
            )}
          </div>
        )}

        {/* Кнопка броска */}
        <div style={{ textAlign: 'center' }}>
          <Button
            size="l"
            before={isRolling ? <Spinner size="s" /> : <Icon28Dice1Outline />}
            onClick={rollDice}
            disabled={isRolling}
            style={{
              minWidth: 120,
              height: 50,
              fontSize: 16,
              fontWeight: 'bold',
              background: isRolling ? '#666' : 'linear-gradient(45deg, #4CAF50, #8BC34A)',
              border: 'none',
              boxShadow: isRolling ? 'none' : '0 4px 8px rgba(0,0,0,0.3)'
            }}
          >
            {isRolling ? 'БРОСАЕМ...' : 'БРОСИТЬ!'}
          </Button>
        </div>

        {/* История бросков */}
        {rollHistory.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Text weight="2" style={{ marginBottom: 8, fontSize: 14 }}>Последние броски:</Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {rollHistory.map((roll, index) => (
                <div
                  key={index}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: roll.result === 'win' ? '#e8f5e8' : '#ffebee',
                    borderRadius: 4,
                    fontSize: 12,
                    border: `1px solid ${roll.result === 'win' ? '#4caf50' : '#f44336'}`
                  }}
                >
                  {roll.dice1}+{roll.dice2}={roll.total} {roll.result === 'win' ? '✅' : '❌'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Информация о ставке */}
        <div style={{ textAlign: 'center', marginTop: 16, color: '#666' }}>
          <Text style={{ fontSize: 14 }}>
            Ставка: {betAmount} 💰
          </Text>
        </div>

        {/* Правила */}
        <div style={{ marginTop: 20, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <Text weight="2" style={{ marginBottom: 8, fontSize: 14 }}>Правила:</Text>
          <Text style={{ fontSize: 12, lineHeight: 1.4 }}>
            Угадайте сумму двух костей (2-12)<br/>
            Чем меньше число, тем больше множитель:<br/>
            2 = x12 | 4 = x8 | 6 = x6 | 8 = x4 | 10 = x3 | 12 = x2
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
