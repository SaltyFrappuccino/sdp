import React, { useState, useEffect, useCallback } from 'react';
import { Button, Progress, Card, Title, Text, Div } from '@vkontakte/vkui';

interface AerialHuntingMinigameProps {
  creatureRank: string;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

const AerialHuntingMinigame: React.FC<AerialHuntingMinigameProps> = ({ 
  creatureRank, 
  onComplete, 
  onCancel 
}) => {
  const [gameState, setGameState] = useState<'waiting' | 'flying' | 'completed'>('waiting');
  const [targets, setTargets] = useState<Array<{ id: number; x: number; y: number; speed: number; hit: boolean }>>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10000);
  const [difficulty, setDifficulty] = useState(1);
  const [requiredHits, setRequiredHits] = useState(3);

  // Настройка сложности в зависимости от ранга существа
  useEffect(() => {
    const difficultyMap: { [key: string]: number } = {
      'F': 1,
      'E': 1.3,
      'D': 1.6,
      'C': 2,
      'B': 2.5,
      'A': 3
    };
    
    const newDifficulty = difficultyMap[creatureRank] || 1;
    setDifficulty(newDifficulty);
    
    // Больше попаданий нужно для более высоких рангов
    const hitsMap: { [key: string]: number } = {
      'F': 2,
      'E': 3,
      'D': 4,
      'C': 5,
      'B': 6,
      'A': 7
    };
    setRequiredHits(hitsMap[creatureRank] || 3);
    
    setTimeLeft(Math.max(8000, 12000 - (newDifficulty - 1) * 1000));
  }, [creatureRank]);

  // Создание целей
  const createTarget = useCallback(() => {
    const newTarget = {
      id: Date.now() + Math.random(),
      x: Math.random() * 80 + 10, // Не слишком близко к краям
      y: Math.random() * 60 + 20,
      speed: 0.5 + difficulty * 0.3,
      hit: false
    };
    
    setTargets(prev => [...prev.slice(-4), newTarget]); // Максимум 5 целей одновременно
  }, [difficulty]);

  // Игровой цикл
  useEffect(() => {
    if (gameState !== 'flying') return;

    // Создание новых целей
    const targetInterval = setInterval(() => {
      if (Math.random() < 0.7) {
        createTarget();
      }
    }, 1500 - difficulty * 200);

    // Движение целей и таймер
    const gameInterval = setInterval(() => {
      setTargets(prev => prev
        .map(target => ({
          ...target,
          x: target.x + (Math.random() - 0.5) * target.speed * 2,
          y: target.y + (Math.random() - 0.5) * target.speed * 2
        }))
        .filter(target => 
          target.x > -10 && target.x < 110 && 
          target.y > -10 && target.y < 110 &&
          !target.hit
        )
      );

      setTimeLeft(prev => {
        const newTime = prev - 100;
        if (newTime <= 0) {
          setGameState('completed');
          onComplete(score >= requiredHits);
          return 0;
        }
        return newTime;
      });
    }, 100);

    return () => {
      clearInterval(targetInterval);
      clearInterval(gameInterval);
    };
  }, [gameState, difficulty, createTarget, score, requiredHits, onComplete]);

  // Попадание по цели
  const hitTarget = useCallback((targetId: number) => {
    setTargets(prev => prev.map(target => 
      target.id === targetId ? { ...target, hit: true } : target
    ));
    
    setScore(prev => {
      const newScore = prev + 1;
      if (newScore >= requiredHits) {
        setGameState('completed');
        onComplete(true);
      }
      return newScore;
    });
  }, [requiredHits, onComplete]);

  const startGame = () => {
    setGameState('flying');
    setScore(0);
    setTargets([]);
    createTarget(); // Создаем первую цель
  };

  if (gameState === 'waiting') {
    return (
      <Card>
        <Div>
          <Title level="2">🦅 Воздушная охота</Title>
          <Text>Ранг существа: {creatureRank}</Text>
          <Text>Попадите по летающим целям! Нужно попаданий: {requiredHits}</Text>
          <Text>Цели движутся быстро и непредсказуемо!</Text>
          <br />
          <Button size="l" onClick={startGame} stretched>
            Начать охоту
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
        <Title level="2">🎯 Воздушная стрельба</Title>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Text>Попаданий: {score}/{requiredHits}</Text>
          <Text>Время: {Math.ceil(timeLeft / 1000)}с</Text>
        </div>
        
        <Progress value={(score / requiredHits) * 100} />
        
        {/* Игровое поле */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '250px', 
          background: 'linear-gradient(to bottom, #87CEEB 0%, #98D8E8 100%)', 
          margin: '16px 0',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid #4682B4'
        }}>
          {/* Облака для атмосферы */}
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: '30px',
            height: '20px',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '20px'
          }} />
          <div style={{
            position: 'absolute',
            top: '40%',
            right: '15%',
            width: '25px',
            height: '15px',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '15px'
          }} />
          
          {/* Цели */}
          {targets.map(target => (
            <button
              key={target.id}
              onClick={() => hitTarget(target.id)}
              style={{
                position: 'absolute',
                left: `${target.x}%`,
                top: `${target.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '24px',
                background: target.hit ? '#4BB34B' : '#FF6B35',
                border: '2px solid #8B4513',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '12px',
                opacity: target.hit ? 0.5 : 1,
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              disabled={target.hit}
            >
              🦅
            </button>
          ))}
          
          {/* Прицельная сетка */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}>
            {/* Вертикальные линии */}
            {[25, 50, 75].map(x => (
              <div key={`v-${x}`} style={{
                position: 'absolute',
                left: `${x}%`,
                top: '0',
                width: '1px',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.3)'
              }} />
            ))}
            {/* Горизонтальные линии */}
            {[25, 50, 75].map(y => (
              <div key={`h-${y}`} style={{
                position: 'absolute',
                top: `${y}%`,
                left: '0',
                width: '100%',
                height: '1px',
                background: 'rgba(255, 255, 255, 0.3)'
              }} />
            ))}
          </div>
        </div>
        
        <Button size="m" mode="secondary" onClick={onCancel} stretched>
          Сдаться
        </Button>
      </Div>
    </Card>
  );
};

export default AerialHuntingMinigame;
