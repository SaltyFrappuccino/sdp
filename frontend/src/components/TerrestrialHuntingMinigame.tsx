import React, { useState, useEffect, useCallback } from 'react';
import { Button, Progress, Card, Title, Text, Div } from '@vkontakte/vkui';

interface TerrestrialHuntingMinigameProps {
  creatureRank: string;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

const TerrestrialHuntingMinigame: React.FC<TerrestrialHuntingMinigameProps> = ({ 
  creatureRank, 
  onComplete, 
  onCancel 
}) => {
  const [gameState, setGameState] = useState<'waiting' | 'tracking' | 'aiming' | 'completed'>('waiting');
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [aimProgress, setAimProgress] = useState(0);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [crosshairPosition, setCrosshairPosition] = useState({ x: 50, y: 50 });
  const [timeLeft, setTimeLeft] = useState(8000);
  const [difficulty, setDifficulty] = useState(1);
  const [isMoving, setIsMoving] = useState(false);

  // Настройка сложности в зависимости от ранга существа
  useEffect(() => {
    const difficultyMap: { [key: string]: number } = {
      'F': 1,
      'E': 1.5,
      'D': 2,
      'C': 2.5,
      'B': 3,
      'A': 3.5
    };
    
    const newDifficulty = difficultyMap[creatureRank] || 1;
    setDifficulty(newDifficulty);
    setTimeLeft(Math.max(5000, 10000 - (newDifficulty - 1) * 800));
  }, [creatureRank]);

  // Фаза выслеживания
  const startTracking = () => {
    setGameState('tracking');
    setTrackingProgress(0);
    
    const trackingInterval = setInterval(() => {
      setTrackingProgress(prev => {
        const increment = 100 / (30 + difficulty * 5); // Чем выше сложность, тем дольше выслеживание
        const newProgress = prev + increment;
        
        if (newProgress >= 100) {
          clearInterval(trackingInterval);
          setGameState('aiming');
          // Устанавливаем случайную позицию цели
          setTargetPosition({
            x: 20 + Math.random() * 60,
            y: 20 + Math.random() * 60
          });
          return 100;
        }
        return newProgress;
      });
    }, 100);
  };

  // Движение цели в фазе прицеливания
  useEffect(() => {
    if (gameState !== 'aiming') return;

    const moveInterval = setInterval(() => {
      if (Math.random() < 0.3 + difficulty * 0.1) { // Вероятность движения зависит от сложности
        setTargetPosition(prev => ({
          x: Math.max(10, Math.min(90, prev.x + (Math.random() - 0.5) * 20)),
          y: Math.max(10, Math.min(90, prev.y + (Math.random() - 0.5) * 20))
        }));
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 500);
      }
    }, 1000 + Math.random() * 2000);

    return () => clearInterval(moveInterval);
  }, [gameState, difficulty]);

  // Таймер
  useEffect(() => {
    if (gameState !== 'aiming') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          setGameState('completed');
          onComplete(false);
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameState, onComplete]);

  // Управление прицелом
  const moveCrosshair = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState !== 'aiming') return;
    
    const speed = 3;
    setCrosshairPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;
      
      switch (direction) {
        case 'up': newY = Math.max(0, prev.y - speed); break;
        case 'down': newY = Math.min(100, prev.y + speed); break;
        case 'left': newX = Math.max(0, prev.x - speed); break;
        case 'right': newX = Math.min(100, prev.x + speed); break;
      }
      
      return { x: newX, y: newY };
    });
  }, [gameState]);

  // Выстрел
  const shoot = useCallback(() => {
    if (gameState !== 'aiming') return;
    
    const distance = Math.sqrt(
      Math.pow(crosshairPosition.x - targetPosition.x, 2) + 
      Math.pow(crosshairPosition.y - targetPosition.y, 2)
    );
    
    const hitRadius = Math.max(5, 15 - difficulty * 2); // Чем выше сложность, тем меньше радиус попадания
    const success = distance <= hitRadius;
    
    setGameState('completed');
    onComplete(success);
  }, [gameState, crosshairPosition, targetPosition, difficulty, onComplete]);

  if (gameState === 'waiting') {
    return (
      <Card>
        <Div>
          <Title level="2">🏹 Наземная охота</Title>
          <Text>Ранг существа: {creatureRank}</Text>
          <Text>Сначала выследите добычу, затем прицельтесь и сделайте точный выстрел!</Text>
          <br />
          <Button size="l" onClick={startTracking} stretched>
            Начать выслеживание
          </Button>
          <Button size="m" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 8 }}>
            Отменить
          </Button>
        </Div>
      </Card>
    );
  }

  if (gameState === 'tracking') {
    return (
      <Card>
        <Div>
          <Title level="2">🔍 Выслеживание</Title>
          <Text>Ищем следы существа...</Text>
          <Progress value={trackingProgress} />
          <br />
          <Button size="m" mode="secondary" onClick={onCancel} stretched>
            Прервать охоту
          </Button>
        </Div>
      </Card>
    );
  }

  return (
    <Card>
      <Div>
        <Title level="2">🎯 Прицеливание</Title>
        
        <Text>Время: {Math.ceil(timeLeft / 1000)}с</Text>
        
        {/* Игровое поле */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '200px', 
          background: '#2d5016', 
          margin: '16px 0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Цель (существо) */}
          <div style={{
            position: 'absolute',
            left: `${targetPosition.x}%`,
            top: `${targetPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            background: isMoving ? '#FF6B35' : '#8B4513',
            borderRadius: '50%',
            border: '2px solid #654321',
            transition: isMoving ? 'none' : 'all 0.3s ease'
          }} />
          
          {/* Прицел */}
          <div style={{
            position: 'absolute',
            left: `${crosshairPosition.x}%`,
            top: `${crosshairPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            border: '2px solid #FF3347',
            borderRadius: '50%',
            background: 'rgba(255, 51, 71, 0.2)'
          }} />
          
          {/* Линии прицела */}
          <div style={{
            position: 'absolute',
            left: `${crosshairPosition.x}%`,
            top: `${crosshairPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: '40px',
            background: '#FF3347'
          }} />
          <div style={{
            position: 'absolute',
            left: `${crosshairPosition.x}%`,
            top: `${crosshairPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '2px',
            background: '#FF3347'
          }} />
        </div>
        
        {/* Управление */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <div></div>
          <Button size="s" onClick={() => moveCrosshair('up')}>↑</Button>
          <div></div>
          <Button size="s" onClick={() => moveCrosshair('left')}>←</Button>
          <Button size="s" onClick={shoot} appearance="positive">🎯</Button>
          <Button size="s" onClick={() => moveCrosshair('right')}>→</Button>
          <div></div>
          <Button size="s" onClick={() => moveCrosshair('down')}>↓</Button>
          <div></div>
        </div>
        
        <Button size="m" mode="secondary" onClick={onCancel} stretched>
          Сдаться
        </Button>
      </Div>
    </Card>
  );
};

export default TerrestrialHuntingMinigame;
