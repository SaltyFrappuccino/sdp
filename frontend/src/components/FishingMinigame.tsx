import React, { useState, useEffect, useCallback } from 'react';
import { Button, Progress, Card, Title, Text, Div } from '@vkontakte/vkui';

interface FishingMinigameProps {
  fishRarity: string;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

const FishingMinigame: React.FC<FishingMinigameProps> = ({ fishRarity, onComplete, onCancel }) => {
  const [gameState, setGameState] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [progress, setProgress] = useState(0);
  const [targetZone, setTargetZone] = useState({ start: 40, end: 60 });
  const [indicatorPosition, setIndicatorPosition] = useState(0);
  const [zoneDirection, setZoneDirection] = useState(1);
  const [timeLeft, setTimeLeft] = useState(5000);
  const [difficulty, setDifficulty] = useState(1);
  const [isHolding, setIsHolding] = useState(false);

  // Настройка сложности в зависимости от редкости рыбы
  useEffect(() => {
    const difficultyMap: { [key: string]: number } = {
      'Обычная': 1,
      'Необычная': 1.5,
      'Редкая': 2,
      'Очень редкая': 2.5,
      'Легендарная': 3
    };
    
    const newDifficulty = difficultyMap[fishRarity] || 1;
    setDifficulty(newDifficulty);
    
    // Уменьшаем зону попадания для более редких рыб
    const zoneSize = Math.max(10, 20 - (newDifficulty - 1) * 5);
    const zoneStart = Math.random() * (100 - zoneSize);
    setTargetZone({ start: zoneStart, end: zoneStart + zoneSize });
    
    // Уменьшаем время для более редких рыб
    setTimeLeft(Math.max(3000, 6000 - (newDifficulty - 1) * 500));
  }, [fishRarity]);

  // Игровой цикл - движение зоны и индикатора
  useEffect(() => {
    if (gameState !== 'active') return;

    const interval = setInterval(() => {
      // Движение зеленой зоны туда-сюда
      setTargetZone(prev => {
        const zoneSize = prev.end - prev.start;
        const speed = 0.8 + difficulty * 0.3;
        let newStart = prev.start + zoneDirection * speed;
        
        // Отражение от краев
        if (newStart <= 0 || newStart + zoneSize >= 100) {
          setZoneDirection(d => -d);
          newStart = Math.max(0, Math.min(100 - zoneSize, newStart));
        }
        
        return { start: newStart, end: newStart + zoneSize };
      });

      // Движение индикатора при удержании кнопки
      if (isHolding) {
        setIndicatorPosition(prev => Math.min(100, prev + 1.5));
      } else {
        // Индикатор падает, если не удерживаем
        setIndicatorPosition(prev => Math.max(0, prev - 0.8));
      }

      setTimeLeft(prev => {
        const newTime = prev - 50;
        if (newTime <= 0) {
          setGameState('completed');
          onComplete(false);
          return 0;
        }
        return newTime;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState, isHolding, zoneDirection, difficulty, onComplete]);

  // Проверка нахождения в зоне и обновление прогресса
  useEffect(() => {
    if (gameState !== 'active') return;

    const checkInterval = setInterval(() => {
      const inTargetZone = indicatorPosition >= targetZone.start && indicatorPosition <= targetZone.end;
      
      if (inTargetZone) {
        setProgress(prev => {
          const newProgress = prev + (2 / difficulty);
          if (newProgress >= 100) {
            setGameState('completed');
            onComplete(true);
            return 100;
          }
          return newProgress;
        });
      } else {
        setProgress(prev => Math.max(0, prev - 1));
      }
    }, 50);

    return () => clearInterval(checkInterval);
  }, [gameState, indicatorPosition, targetZone, difficulty, onComplete]);

  const startGame = () => {
    setGameState('active');
    setProgress(0);
    setIndicatorPosition(0);
    setZoneDirection(1);
  };

  if (gameState === 'waiting') {
    return (
      <Card>
        <Div>
          <Title level="2">🎣 Рыбалка</Title>
          <Text>Редкость рыбы: {fishRarity}</Text>
          <Text>Удерживайте кнопку, чтобы индикатор оставался в зеленой зоне!</Text>
          <br />
          <Button size="l" onClick={startGame} stretched>
            Начать ловлю
          </Button>
          <Button size="m" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 8 }}>
            Отменить
          </Button>
        </Div>
      </Card>
    );
  }

  return (
    <Card>
      <Div>
        <Title level="2">🎣 Ловля рыбы</Title>
        
        {/* Прогресс ловли */}
        <Text>Прогресс ловли:</Text>
        <Progress value={progress} />
        
        {/* Время */}
        <Text>Время: {Math.ceil(timeLeft / 1000)}с</Text>
        
        {/* Игровая зона */}
        <div style={{ 
          position: 'relative', 
          height: '60px', 
          background: '#f0f0f0', 
          margin: '16px 0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Целевая зона */}
          <div style={{
            position: 'absolute',
            left: `${targetZone.start}%`,
            width: `${targetZone.end - targetZone.start}%`,
            height: '100%',
            background: '#4BB34B',
            opacity: 0.7
          }} />
          
          {/* Индикатор */}
          <div style={{
            position: 'absolute',
            left: `${indicatorPosition}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '4px',
            height: '40px',
            background: '#FF3347',
            borderRadius: '2px',
            boxShadow: '0 0 8px rgba(255, 51, 71, 0.6)'
          }} />
        </div>
        
        <Button 
          size="l" 
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onMouseLeave={() => setIsHolding(false)}
          onTouchStart={() => setIsHolding(true)}
          onTouchEnd={() => setIsHolding(false)}
          stretched
          mode={isHolding ? 'primary' : 'secondary'}
        >
          {isHolding ? '🎣 Удерживаю!' : '🎣 Удерживать'}
        </Button>
        
        <Button size="m" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 8 }}>
          Сдаться
        </Button>
      </Div>
    </Card>
  );
};

export default FishingMinigame;
