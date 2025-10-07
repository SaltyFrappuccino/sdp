import React, { useState, useEffect, useCallback } from 'react';
import { Button, Progress, Card, Title, Text, Div } from '@vkontakte/vkui';

interface TerrestrialHuntingMinigameProps {
  difficulty: number;  // От 0.5 до 2.0 (от брони)
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

const TerrestrialHuntingMinigame: React.FC<TerrestrialHuntingMinigameProps> = ({ 
  difficulty, 
  onComplete, 
  onCancel 
}) => {
  const [gameState, setGameState] = useState<'waiting' | 'tracking' | 'aiming' | 'completed'>('waiting');
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [crosshairPosition, setCrosshairPosition] = useState({ x: 20, y: 20 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [currentDirection, setCurrentDirection] = useState<'up' | 'down' | 'left' | 'right' | null>(null);

  // Начать игру
  const startGame = () => {
    setGameState('tracking');
    setTrackingProgress(0);
    setTimeLeft(Math.floor(8000 / difficulty)); // От 4 до 16 секунд
    setTargetPosition({ x: 50, y: 50 });
    setCrosshairPosition({ x: 20, y: 20 });
    setAccuracy(0);
    
    // Показываем первое направление сразу
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    setCurrentDirection(randomDirection);
  };

  // Фаза 1: Выслеживание (нажимай кнопки в правильном порядке)
  useEffect(() => {
    if (gameState !== 'tracking') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          setGameState('completed');
          onComplete(false);
          return 0;
        }
        return prev - 50;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [gameState, difficulty, onComplete]);

  // Обработка нажатия направления
  const handleDirectionClick = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState !== 'tracking') return;

    if (direction === currentDirection) {
      // Правильное направление
      const increment = 15 + (difficulty - 1) * 5;  // Чем сложнее, тем медленнее прогресс
      const newProgress = Math.min(100, trackingProgress + increment);
      setTrackingProgress(newProgress);
      
      // Проверяем завершение фазы
      if (newProgress >= 100) {
        setGameState('aiming');
        setTimeLeft(Math.floor(5000 / difficulty)); // От 2.5 до 10 секунд на прицел
        return;
      }
      
      // Показываем следующее направление сразу
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      setCurrentDirection(randomDirection);
    } else {
      // Неправильное направление
      setTrackingProgress(prev => Math.max(0, prev - 10));
    }
  };

  // Фаза 2: Прицеливание (перемещай прицел к цели)
  useEffect(() => {
    if (gameState !== 'aiming') return;

    // Цель движется
    const targetMovement = setInterval(() => {
      setTargetPosition(prev => {
        const speed = 0.5 + difficulty * 0.3;
        const angle = Math.random() * Math.PI * 2;
        const newX = Math.max(10, Math.min(90, prev.x + Math.cos(angle) * speed));
        const newY = Math.max(10, Math.min(90, prev.y + Math.sin(angle) * speed));
        return { x: newX, y: newY };
      });
    }, 100);

    // Таймер
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          clearInterval(targetMovement);
          setGameState('completed');
          onComplete(false);
          return 0;
        }
        return prev - 50;
      });
    }, 50);

    // Обновление точности
    const accuracyCheck = setInterval(() => {
      const distance = Math.sqrt(
        Math.pow(targetPosition.x - crosshairPosition.x, 2) + 
        Math.pow(targetPosition.y - crosshairPosition.y, 2)
      );
      const newAccuracy = Math.max(0, 100 - distance * 2);
      setAccuracy(newAccuracy);
    }, 50);

    return () => {
      clearInterval(targetMovement);
      clearInterval(timer);
      clearInterval(accuracyCheck);
    };
  }, [gameState, difficulty, onComplete, targetPosition, crosshairPosition]);

  // Движение прицела
  const moveCrosshair = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (gameState !== 'aiming') return;

    const speed = 3;
    setCrosshairPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;

      if (direction === 'up') newY = Math.max(10, prev.y - speed);
      if (direction === 'down') newY = Math.min(90, prev.y + speed);
      if (direction === 'left') newX = Math.max(10, prev.x - speed);
      if (direction === 'right') newX = Math.min(90, prev.x + speed);

      return { x: newX, y: newY };
    });
  };

  // Выстрел
  const shoot = () => {
    if (gameState !== 'aiming') return;

    const distance = Math.sqrt(
      Math.pow(targetPosition.x - crosshairPosition.x, 2) + 
      Math.pow(targetPosition.y - crosshairPosition.y, 2)
    );

    // Успех, если расстояние меньше определенного порога
    const successThreshold = 8 + difficulty * 2;  // Чем сложнее, тем меньше допуск
    const success = distance < successThreshold;

    setGameState('completed');
    onComplete(success);
  };

  return (
    <Card mode="shadow" style={{ margin: '16px', padding: '16px' }}>
      <Title level="2" style={{ marginBottom: '12px' }}>🐾 Наземная охота</Title>

      {gameState === 'waiting' && (
        <Div>
          <Text style={{ marginBottom: '16px' }}>
            Сложность: {difficulty.toFixed(1)}x<br/>
            Готовы начать охоту?
          </Text>
          <Button size="l" onClick={startGame} stretched style={{ marginBottom: '8px' }}>
            🎯 Начать охоту
          </Button>
          <Button size="l" mode="secondary" onClick={onCancel} stretched>
            ❌ Отмена
          </Button>
        </Div>
      )}

      {gameState === 'tracking' && (
        <Div>
          <Text weight="2" style={{ marginBottom: '12px' }}>
            Фаза 1: Выслеживание ({(timeLeft / 1000).toFixed(1)}с)
          </Text>
          <Text style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text_secondary)' }}>
            Следуйте за следами! Нажимайте стрелки в правильном направлении
          </Text>

          <Progress value={trackingProgress} style={{ marginBottom: '16px' }} />

          {currentDirection && (
            <Div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '48px' }}>
              {currentDirection === 'up' && '⬆️'}
              {currentDirection === 'down' && '⬇️'}
              {currentDirection === 'left' && '⬅️'}
              {currentDirection === 'right' && '➡️'}
            </Div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div></div>
            <Button size="l" onClick={() => handleDirectionClick('up')}>⬆️</Button>
            <div></div>
            <Button size="l" onClick={() => handleDirectionClick('left')}>⬅️</Button>
            <div></div>
            <Button size="l" onClick={() => handleDirectionClick('right')}>➡️</Button>
            <div></div>
            <Button size="l" onClick={() => handleDirectionClick('down')}>⬇️</Button>
            <div></div>
          </div>
        </Div>
      )}

      {gameState === 'aiming' && (
        <Div>
          <Text weight="2" style={{ marginBottom: '12px' }}>
            Фаза 2: Прицеливание ({(timeLeft / 1000).toFixed(1)}с)
          </Text>
          <Text style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text_secondary)' }}>
            Наведите прицел на цель и стреляйте!
          </Text>

          <div style={{
            position: 'relative',
            width: '100%',
            height: '300px',
            background: 'linear-gradient(to bottom, #87CEEB 0%, #228B22 100%)',
            borderRadius: '8px',
            marginBottom: '16px',
            overflow: 'hidden'
          }}>
            {/* Цель (зверь) */}
            <div style={{
              position: 'absolute',
              left: `${targetPosition.x}%`,
              top: `${targetPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: '32px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}>
              🦌
            </div>

            {/* Прицел */}
            <div style={{
              position: 'absolute',
              left: `${crosshairPosition.x}%`,
              top: `${crosshairPosition.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: '40px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }}>
              ⊕
            </div>
          </div>

          <Progress value={accuracy} style={{ marginBottom: '16px' }} />
          <Text style={{ marginBottom: '16px', textAlign: 'center' }}>
            Точность: {Math.round(accuracy)}%
          </Text>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <div></div>
            <Button size="l" onClick={() => moveCrosshair('up')}>⬆️</Button>
            <div></div>
            <Button size="l" onClick={() => moveCrosshair('left')}>⬅️</Button>
            <div></div>
            <Button size="l" onClick={() => moveCrosshair('right')}>➡️</Button>
            <div></div>
            <Button size="l" onClick={() => moveCrosshair('down')}>⬇️</Button>
            <div></div>
          </div>

          <Button size="l" mode="primary" onClick={shoot} stretched>
            🎯 ВЫСТРЕЛ!
          </Button>
        </Div>
      )}

      {gameState === 'completed' && (
        <Div>
          <Text>Игра завершена</Text>
        </Div>
      )}
    </Card>
  );
};

export default TerrestrialHuntingMinigame;
