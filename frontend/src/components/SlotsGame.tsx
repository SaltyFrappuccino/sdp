import { FC, useState, useEffect } from 'react';
import { Card, Div, Text, Button, Spinner } from '@vkontakte/vkui';
import { Icon28GameOutline } from '@vkontakte/icons';

interface SlotsGameProps {
  characterId: number;
  betAmount: number;
  onGameEnd: (result: any) => void;
  onClose: () => void;
}

interface SlotReel {
  symbols: number[];
  currentIndex: number;
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎'];
const SYMBOL_WEIGHTS = [30, 25, 20, 15, 8, 1.5, 0.5]; // Веса для символов (чем меньше, тем реже)

export const SlotsGame: FC<SlotsGameProps> = ({ betAmount, onGameEnd, onClose }) => {
  const [reels, setReels] = useState<SlotReel[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<{ type: 'win' | 'lose' | 'jackpot'; winAmount: number; message: string } | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    initializeReels();
  }, []);

  const initializeReels = () => {
    const newReels: SlotReel[] = [];
    for (let i = 0; i < 3; i++) {
      const symbols: number[] = [];
      for (let j = 0; j < 20; j++) {
        symbols.push(getRandomSymbol());
      }
      newReels.push({
        symbols,
        currentIndex: Math.floor(Math.random() * 20)
      });
    }
    setReels(newReels);
  };

  const getRandomSymbol = (): number => {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (let i = 0; i < SYMBOL_WEIGHTS.length; i++) {
      cumulative += SYMBOL_WEIGHTS[i];
      if (random <= cumulative) {
        return i;
      }
    }
    return SYMBOL_WEIGHTS.length - 1;
  };

  const spin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);
    setShowResult(false);
    
    // Анимация крутки
    const spinDuration = 2000; // 2 секунды
    const spinInterval = 100; // Обновляем каждые 100мс
    const totalUpdates = spinDuration / spinInterval;
    
    for (let i = 0; i < totalUpdates; i++) {
      await new Promise(resolve => setTimeout(resolve, spinInterval));
      
      setReels(prevReels => 
        prevReels.map(reel => ({
          ...reel,
          currentIndex: (reel.currentIndex + 1) % reel.symbols.length
        }))
      );
    }
    
    // Финальный результат
    const finalReels = reels.map(reel => 
      SYMBOLS[reel.symbols[reel.currentIndex]]
    );
    
    const gameResult = calculateResult(finalReels);
    setResult(gameResult);
    setShowResult(true);
    setIsSpinning(false);
    
    // Передаем результат родительскому компоненту
    setTimeout(() => {
      onGameEnd({
        result: gameResult.type === 'lose' ? 'lose' : 'win',
        winAmount: gameResult.winAmount,
        gameData: { reels: finalReels.map(symbol => SYMBOLS.indexOf(symbol) + 1) }
      });
    }, 2000);
  };

  const calculateResult = (finalReels: string[]): { type: 'win' | 'lose' | 'jackpot'; winAmount: number; message: string } => {
    const [reel1, reel2, reel3] = finalReels;
    
    // Джекпот - три алмаза
    if (reel1 === '💎' && reel2 === '💎' && reel3 === '💎') {
      return {
        type: 'jackpot',
        winAmount: betAmount * 100,
        message: '🎰 ДЖЕКПОТ! Три алмаза! 🎰'
      };
    }
    
    // Три одинаковых символа
    if (reel1 === reel2 && reel2 === reel3) {
      const multiplier = getSymbolMultiplier(reel1);
      return {
        type: 'win',
        winAmount: Math.floor(betAmount * multiplier),
        message: `🎉 Три ${reel1}! x${multiplier}`
      };
    }
    
    // Два одинаковых символа
    if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
      const symbol = reel1 === reel2 ? reel1 : reel2;
      const multiplier = getSymbolMultiplier(symbol) * 0.3;
      return {
        type: 'win',
        winAmount: Math.floor(betAmount * multiplier),
        message: `✨ Два ${symbol}! x${multiplier.toFixed(1)}`
      };
    }
    
    return {
      type: 'lose',
      winAmount: 0,
      message: '😔 Не повезло, попробуйте еще раз!'
    };
  };

  const getSymbolMultiplier = (symbol: string): number => {
    switch (symbol) {
      case '💎': return 50;
      case '⭐': return 20;
      case '🔔': return 10;
      case '🍇': return 5;
      case '🍊': return 3;
      case '🍋': return 2;
      case '🍒': return 1.5;
      default: return 1;
    }
  };

  const renderReel = (reel: SlotReel, index: number) => {
    const visibleSymbols = [];
    for (let i = -1; i <= 1; i++) {
      const symbolIndex = (reel.currentIndex + i + reel.symbols.length) % reel.symbols.length;
      visibleSymbols.push(SYMBOLS[reel.symbols[symbolIndex]]);
    }
    
    return (
      <div
        key={index}
        style={{
          width: 80,
          height: 100,
          border: '3px solid #333',
          borderRadius: 12,
          backgroundColor: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
        }}
      >
        {visibleSymbols.map((symbol, i) => (
          <div
            key={i}
            style={{
              fontSize: 32,
              height: 33,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translateY(${(i - 1) * 33}px)`,
              transition: isSpinning ? 'none' : 'transform 0.3s ease',
              opacity: i === 1 ? 1 : 0.3
            }}
          >
            {symbol}
          </div>
        ))}
        
        {/* Подсветка центрального символа */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 33,
            backgroundColor: 'rgba(255, 255, 0, 0.2)',
            border: '2px solid #ffd700',
            borderRadius: 4,
            transform: 'translateY(-50%)',
            zIndex: 1
          }}
        />
      </div>
    );
  };

  return (
    <Card>
      <Div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text weight="2" style={{ fontSize: 18 }}>🎰 Слоты 777</Text>
          <Button size="s" onClick={onClose}>✕</Button>
        </div>

        {/* Слот машина */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 8, 
          marginBottom: 20,
          padding: '20px 0',
          backgroundColor: '#2a2a2a',
          borderRadius: 12,
          border: '4px solid #444'
        }}>
          {reels.map((reel, index) => renderReel(reel, index))}
        </div>

        {/* Результат */}
        {showResult && result && (
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: result.type === 'lose' ? '#ffebee' : 
                           result.type === 'jackpot' ? '#fff3e0' : '#e8f5e8',
            borderRadius: 8, 
            marginBottom: 16,
            animation: 'resultPulse 0.5s ease'
          }}>
            <Text weight="2" style={{ 
              color: result.type === 'lose' ? '#d32f2f' : 
                     result.type === 'jackpot' ? '#ff6f00' : '#2e7d32',
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

        {/* Кнопка спина */}
        <div style={{ textAlign: 'center' }}>
          <Button
            size="l"
            before={isSpinning ? <Spinner size="s" /> : <Icon28GameOutline />}
            onClick={spin}
            disabled={isSpinning}
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
            💎💎💎 = x100 (Джекпот)<br/>
            ⭐⭐⭐ = x20 | 🔔🔔🔔 = x10 | 🍇🍇🍇 = x5<br/>
            🍊🍊🍊 = x3 | 🍋🍋🍋 = x2 | 🍒🍒🍒 = x1.5<br/>
            Два одинаковых = x0.3 от полного множителя
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
