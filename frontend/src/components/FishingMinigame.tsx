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
  const [currentPosition, setCurrentPosition] = useState(50);
  const [direction, setDirection] = useState(1);
  const [timeLeft, setTimeLeft] = useState(5000);
  const [difficulty, setDifficulty] = useState(1);

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

  // Игровой цикл
  useEffect(() => {
    if (gameState !== 'active') return;

    const interval = setInterval(() => {
      setCurrentPosition(prev => {
        const speed = 1 + difficulty * 0.5;
        let newPos = prev + direction * speed;
        
        if (newPos <= 0 || newPos >= 100) {
          setDirection(prev => -prev);
          newPos = Math.max(0, Math.min(100, newPos));
        }
        
        return newPos;
      });

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
  }, [gameState, direction, difficulty, onComplete]);

  const handleCatch = useCallback(() => {
    if (gameState !== 'active') return;
    
    const inTargetZone = currentPosition >= targetZone.start && currentPosition <= targetZone.end;
    
    if (inTargetZone) {
      setProgress(prev => {
        const newProgress = prev + (100 / (5 + difficulty));
        if (newProgress >= 100) {
          setGameState('completed');
          onComplete(true);
          return 100;
        }
        return newProgress;
      });
    } else {
      setProgress(prev => Math.max(0, prev - 10));
    }
  }, [gameState, currentPosition, targetZone, difficulty, onComplete]);

  const startGame = () => {
    setGameState('active');
    setProgress(0);
    setCurrentPosition(50);
    setDirection(1);
  };

  if (gameState === 'waiting') {
    return (
      <Card>
        <Div>
          <Title level="2">🎣 Рыбалка</Title>
          <Text>Редкость рыбы: {fishRarity}</Text>
          <Text>Нажимайте кнопку "Подсечь", когда индикатор находится в зеленой зоне!</Text>
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
            left: `${currentPosition}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '4px',
            height: '40px',
            background: '#FF3347',
            borderRadius: '2px'
          }} />
        </div>
        
        <Button size="l" onClick={handleCatch} stretched>
          Подсечь!
        </Button>
        
        <Button size="m" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 8 }}>
          Сдаться
        </Button>
      </Div>
    </Card>
  );
};

export default FishingMinigame;
