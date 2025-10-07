import React, { useState, useEffect } from 'react';
import { Button, Progress, Card, Title, Text, Div } from '@vkontakte/vkui';

interface AerialHuntingMinigameProps {
  difficulty: number;  // От 0.5 до 2.0 (от брони)
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

interface Target {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hit: boolean;
}

const AerialHuntingMinigame: React.FC<AerialHuntingMinigameProps> = ({ 
  difficulty, 
  onComplete, 
  onCancel 
}) => {
  const [gameState, setGameState] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [nextTargetId, setNextTargetId] = useState(0);
  
  // Требуемый счет для победы
  const requiredScore = Math.ceil(3 + difficulty * 2); // От 4 до 7 целей

  const startGame = () => {
    setGameState('active');
    setTargets([]);
    setScore(0);
    setNextTargetId(0);
    setTimeLeft(Math.floor(15000 / difficulty)); // От 7.5 до 30 секунд
    
    // Создаем первую цель
    spawnTarget();
  };

  // Создать новую цель
  const spawnTarget = () => {
    const speed = 0.5 + difficulty * 0.5;
    const angle = Math.random() * Math.PI * 2;
    
    setTargets(prev => [...prev, {
      id: nextTargetId,
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      hit: false
    }]);
    
    setNextTargetId(prev => prev + 1);
  };

  // Игровой цикл
  useEffect(() => {
    if (gameState !== 'active') return;

    const gameLoop = setInterval(() => {
      // Движение целей
      setTargets(prev => prev.map(target => {
        if (target.hit) return target;
        
        let newX = target.x + target.vx;
        let newY = target.y + target.vy;
        let newVx = target.vx;
        let newVy = target.vy;

        // Отражение от краев
        if (newX <= 5 || newX >= 95) {
          newVx = -target.vx;
          newX = Math.max(5, Math.min(95, newX));
        }
        if (newY <= 5 || newY >= 75) {
          newVy = -target.vy;
          newY = Math.max(5, Math.min(75, newY));
        }

        return { ...target, x: newX, y: newY, vx: newVx, vy: newVy };
      }));

      // Таймер
      setTimeLeft(prev => {
        const newTime = prev - 50;
        if (newTime <= 0) {
          setGameState('completed');
          onComplete(false);
          return 0;
        }
        return newTime;
      });

      // Спавн новых целей
      setTargets(prev => {
        const activeTargets = prev.filter(t => !t.hit);
        const maxTargets = Math.ceil(1 + difficulty);
        
        if (activeTargets.length < maxTargets && Math.random() < 0.02 * difficulty) {
          spawnTarget();
        }
        
        return prev;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState, difficulty, onComplete]);

  // Проверка победы
  useEffect(() => {
    if (score >= requiredScore && gameState === 'active') {
      setGameState('completed');
      onComplete(true);
    }
  }, [score, requiredScore, gameState, onComplete]);

  // Выстрел по цели
  const shootTarget = (targetId: number) => {
    if (gameState !== 'active') return;

    setTargets(prev => prev.map(target => {
      if (target.id === targetId && !target.hit) {
        setScore(s => s + 1);
        return { ...target, hit: true };
      }
      return target;
    }));

    // Убираем пораженную цель через 500мс
    setTimeout(() => {
      setTargets(prev => prev.filter(t => t.id !== targetId));
    }, 500);
  };

  return (
    <Card mode="shadow" style={{ margin: '16px', padding: '16px' }}>
      <Title level="2" style={{ marginBottom: '12px' }}>🦅 Воздушная охота</Title>

      {gameState === 'waiting' && (
        <Div>
          <Text style={{ marginBottom: '16px' }}>
            Сложность: {difficulty.toFixed(1)}x<br/>
            Нужно подбить: {requiredScore} целей<br/>
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

      {gameState === 'active' && (
        <Div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <Text weight="2">Счет: {score} / {requiredScore}</Text>
            <Text weight="2">Время: {(timeLeft / 1000).toFixed(1)}с</Text>
          </div>

          <Progress 
            value={(score / requiredScore) * 100} 
            style={{ marginBottom: '16px' }}
          />

          <div style={{
            position: 'relative',
            width: '100%',
            height: '400px',
            background: 'linear-gradient(to bottom, #87CEEB 0%, #E0F6FF 100%)',
            borderRadius: '8px',
            overflow: 'hidden',
            cursor: 'crosshair'
          }}>
            {/* Облака для атмосферы */}
            <div style={{
              position: 'absolute',
              top: '20%',
              left: '10%',
              fontSize: '48px',
              opacity: 0.4
            }}>☁️</div>
            <div style={{
              position: 'absolute',
              top: '50%',
              right: '15%',
              fontSize: '64px',
              opacity: 0.4
            }}>☁️</div>
            <div style={{
              position: 'absolute',
              bottom: '30%',
              left: '60%',
              fontSize: '56px',
              opacity: 0.4
            }}>☁️</div>

            {/* Цели (птицы) */}
            {targets.map(target => (
              <div
                key={target.id}
                onClick={() => shootTarget(target.id)}
                style={{
                  position: 'absolute',
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '32px',
                  cursor: 'pointer',
                  transition: 'all 0.05s linear',
                  opacity: target.hit ? 0.3 : 1,
                  filter: target.hit ? 'grayscale(100%)' : 'none',
                  pointerEvents: target.hit ? 'none' : 'auto'
                }}
              >
                🦅
              </div>
            ))}
          </div>

          <Text style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--text_secondary)' }}>
            Кликайте по птицам, чтобы подбить их!
          </Text>
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

export default AerialHuntingMinigame;
