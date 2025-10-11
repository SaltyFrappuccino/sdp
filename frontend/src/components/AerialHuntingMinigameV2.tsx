import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Progress, Card, Title, Text, Div } from '@vkontakte/vkui';

interface Position {
  x: number;
  y: number;
}

interface Vector2D {
  x: number;
  y: number;
}

interface FlyingTarget {
  id: number;
  position: Position;
  velocity: Vector2D;
  size: number;
  isLeader: boolean;
}

interface WindConditions {
  speed: number;
  direction: number;
  turbulence: number;
}

interface AerialHuntingMinigameV2Props {
  difficulty: number;
  windConditions: WindConditions;
  echoZone: { intensity: number; residual_aura: number } | null;
  onComplete: (success: boolean, minigameScore: number, perfectHits: number) => void;
  onCancel: () => void;
}

type GamePhase = 'aim' | 'shoot' | 'reload' | 'result';

const AerialHuntingMinigameV2: React.FC<AerialHuntingMinigameV2Props> = ({
  difficulty,
  windConditions,
  echoZone,
  onComplete,
  onCancel
}) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('aim');
  const [targets, setTargets] = useState<FlyingTarget[]>([]);
  const [ammunition, setAmmunition] = useState(10);
  const [aimPosition, setAimPosition] = useState<Position>({ x: 50, y: 50 });
  const [predictedPath, setPredictedPath] = useState<Position[]>([]);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [perfectHits, setPerfectHits] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [message, setMessage] = useState('Прицельтесь и стреляйте!');
  const [isReloading, setIsReloading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Генерация начальных целей
  useEffect(() => {
    const initialTargets: FlyingTarget[] = [];
    const flockSize = Math.floor(3 + difficulty * 2);
    const isLeaderIndex = Math.floor(Math.random() * flockSize);

    for (let i = 0; i < flockSize; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * (difficulty * 0.5);

      initialTargets.push({
        id: i,
        position: {
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 60
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        size: 20 + Math.random() * 10,
        isLeader: i === isLeaderIndex
      });
    }

    setTargets(initialTargets);
  }, [difficulty]);

  // Обновление позиций целей
  useEffect(() => {
    if (gamePhase !== 'aim') return;

    const interval = setInterval(() => {
      setTargets(prevTargets => {
        return prevTargets.map(target => {
          let newX = target.position.x + target.velocity.x;
          let newY = target.position.y + target.velocity.y;

          // Влияние ветра
          const windEffect = windConditions.speed * 0.1;
          const windAngle = (windConditions.direction * Math.PI) / 180;
          newX += Math.cos(windAngle) * windEffect;
          newY += Math.sin(windAngle) * windEffect;

          // Турбулентность в Эхо-Зонах
          if (echoZone && Math.random() < windConditions.turbulence) {
            newX += (Math.random() - 0.5) * 4;
            newY += (Math.random() - 0.5) * 4;
          }

          // Отскок от границ
          let newVelX = target.velocity.x;
          let newVelY = target.velocity.y;

          if (newX < 5 || newX > 95) {
            newVelX *= -1;
            newX = Math.max(5, Math.min(95, newX));
          }
          if (newY < 5 || newY > 75) {
            newVelY *= -1;
            newY = Math.max(5, Math.min(75, newY));
          }

          return {
            ...target,
            position: { x: newX, y: newY },
            velocity: { x: newVelX, y: newVelY }
          };
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gamePhase, windConditions, echoZone]);

  // Таймер игры
  useEffect(() => {
    if (gamePhase !== 'aim') return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Время вышло
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase]);

  const finishGame = useCallback(() => {
    setGamePhase('result');
    const accuracy = ammunition > 0 ? (hits / (10 - ammunition)) * 100 : 0;
    const finalScore = score + perfectHits * 10;
    
    setTimeout(() => {
      onComplete(hits > 0, finalScore, perfectHits);
    }, 2000);
  }, [hits, ammunition, score, perfectHits, onComplete]);

  // Предсказание траектории с учётом ветра
  useEffect(() => {
    if (targets.length === 0) return;

    // Находим ближайшую цель к прицелу
    const closestOrNull = targets.reduce<FlyingTarget | null>((minTarget, target) => {
      const distance = Math.sqrt(
        Math.pow(target.position.x - aimPosition.x, 2) +
        Math.pow(target.position.y - aimPosition.y, 2)
      );
      const minDistance = minTarget ? Math.sqrt(
        Math.pow(minTarget.position.x - aimPosition.x, 2) +
        Math.pow(minTarget.position.y - aimPosition.y, 2)
      ) : Infinity;

      return distance < minDistance ? target : minTarget;
    }, null);

    if (!closestOrNull) return;
    
    const closest: FlyingTarget = closestOrNull;

    // Предсказываем траекторию
    const path: Position[] = [];
    let pos: Position = { ...closest.position };
    let vel: Vector2D = { ...closest.velocity };

    for (let i = 0; i < 10; i++) {
      const windEffect = windConditions.speed * 0.1;
      const windAngle = (windConditions.direction * Math.PI) / 180;

      pos = {
        x: pos.x + vel.x + Math.cos(windAngle) * windEffect,
        y: pos.y + vel.y + Math.sin(windAngle) * windEffect
      };

      path.push({ ...pos });
    }

    setPredictedPath(path);
  }, [aimPosition, targets, windConditions]);

  // Выстрел
  const shoot = useCallback(() => {
    if (ammunition <= 0 || isReloading) {
      setMessage('Нет патронов! Перезарядка...');
      return;
    }

    setGamePhase('shoot');
    setAmmunition(prev => prev - 1);

    // Проверяем попадание
    let hit = false;
    let targetHit: FlyingTarget | null = null;

    setTargets(prevTargets => {
      return prevTargets.filter(target => {
        const distance = Math.sqrt(
          Math.pow(target.position.x - aimPosition.x, 2) +
          Math.pow(target.position.y - aimPosition.y, 2)
        );

        const hitRadius = 8 + (difficulty * 2);

        if (distance < hitRadius) {
          hit = true;
          targetHit = target;
          return false; // Удаляем цель
        }
        return true;
      });
    });

    if (hit && targetHit !== null) {
      setHits(prev => prev + 1);
      const hitTarget: FlyingTarget = targetHit;
      const basePoints = hitTarget.isLeader ? 30 : 15;
      const accuracyBonus = Math.floor((1 - Math.min(1, Math.sqrt(
        Math.pow(hitTarget.position.x - aimPosition.x, 2) +
        Math.pow(hitTarget.position.y - aimPosition.y, 2)
      ) / 8)) * 10);

      setScore(prev => prev + basePoints + accuracyBonus);

      if (accuracyBonus > 8) {
        setPerfectHits(prev => prev + 1);
        setMessage(hitTarget.isLeader ? '🎯 ЛИДЕР СБИТ! Стая рассеивается!' : '🎯 Отличное попадание!');
      } else {
        setMessage(hitTarget.isLeader ? '✓ Лидер сбит!' : '✓ Попадание!');
      }

      // Если сбит лидер - стая рассеивается
      if (hitTarget.isLeader) {
        setTargets(prev => prev.map(t => ({
          ...t,
          velocity: {
            x: t.velocity.x + (Math.random() - 0.5) * 4,
            y: t.velocity.y + (Math.random() - 0.5) * 4
          }
        })));
      }
    } else {
      setMessage('✗ Промах...');
    }

    // Возвращаемся к прицеливанию
    setTimeout(() => {
      setGamePhase('aim');
      
      // Проверяем окончание игры
      if (ammunition - 1 <= 0) {
        setMessage('Патроны закончились! Перезарядка...');
        reload();
      } else if (targets.length - (hit ? 1 : 0) === 0) {
        setMessage('🏆 Все цели сбиты!');
        setTimeout(() => finishGame(), 1500);
      }
    }, 500);
  }, [ammunition, aimPosition, targets, difficulty, isReloading, finishGame]);

  const reload = useCallback(() => {
    if (isReloading) return;

    setIsReloading(true);
    setMessage('⏳ Перезарядка...');

    setTimeout(() => {
      setAmmunition(10);
      setIsReloading(false);
      setMessage('✓ Перезарядка завершена!');
    }, 2000);
  }, [isReloading]);

  // Управление прицелом
  const moveAim = useCallback((dx: number, dy: number) => {
    setAimPosition(prev => ({
      x: Math.max(0, Math.min(100, prev.x + dx)),
      y: Math.max(0, Math.min(100, prev.y + dy))
    }));
  }, []);

  // Рендер
  const renderGame = () => {
    if (gamePhase === 'result') {
      return (
        <Div>
          <Title level="2" style={{ color: hits > 0 ? '#4BB34B' : '#FF3347' }}>
            {hits > 0 ? '✓ Охота завершена!' : '✗ Неудача...'}
          </Title>
          <div style={{ textAlign: 'center', fontSize: 64, margin: '24px 0' }}>
            🦅
          </div>
          <Text style={{ textAlign: 'center' }}>
            Очки: {score}<br/>
            Попаданий: {hits}<br/>
            Точных попаданий: {perfectHits}<br/>
            Точность: {ammunition < 10 ? Math.round((hits / (10 - ammunition)) * 100) : 0}%
          </Text>
        </Div>
      );
    }

    return (
      <Div>
        <Title level="2">🦅 Воздушная охота</Title>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text>Патроны: {ammunition}/10</Text>
          <Text>Время: {timeRemaining}с</Text>
          <Text>Очки: {score}</Text>
        </div>

        <Text style={{ marginBottom: 8, fontSize: 14 }}>
          {message}
        </Text>

        {/* Игровое поле */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '350px',
          background: 'linear-gradient(to bottom, #87CEEB 0%, #B0E0E6 100%)',
          borderRadius: 8,
          marginBottom: 16,
          overflow: 'hidden',
          border: '2px solid #555'
        }}>
          {/* Облака (визуальная атмосфера) */}
          <div style={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            fontSize: 40,
            opacity: 0.6
          }}>
            ☁️
          </div>
          <div style={{
            position: 'absolute',
            top: '40%',
            right: '15%',
            fontSize: 50,
            opacity: 0.5
          }}>
            ☁️
          </div>

          {/* Ветер - индикатор */}
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(255,255,255,0.9)',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12
          }}>
            🌬️ {windConditions.speed.toFixed(1)} м/с @ {windConditions.direction}°
          </div>

          {/* Цели */}
          {targets.map(target => (
            <div
              key={target.id}
              style={{
                position: 'absolute',
                left: `${target.position.x}%`,
                top: `${target.position.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: target.size,
                transition: 'left 0.05s, top 0.05s',
                filter: target.isLeader ? 'drop-shadow(0 0 4px gold)' : 'none'
              }}
            >
              🦅
            </div>
          ))}

          {/* Предсказанная траектория */}
          {predictedPath.map((pos, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: 4,
                height: 4,
                background: `rgba(255, 255, 0, ${1 - idx * 0.1})`,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none'
              }}
            />
          ))}

          {/* Прицел */}
          <div style={{
            position: 'absolute',
            left: `${aimPosition.x}%`,
            top: `${aimPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: 48,
            color: '#FF3347',
            textShadow: '0 0 4px white',
            pointerEvents: 'none'
          }}>
            ⊕
          </div>
        </div>

        {/* Управление */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div />
          <Button size="m" onClick={() => moveAim(0, -3)}>⬆️</Button>
          <div />
          <Button size="m" onClick={() => moveAim(-3, 0)}>⬅️</Button>
          <Button size="l" mode="primary" onClick={shoot} disabled={isReloading}>
            {isReloading ? '⏳' : '🎯'}
          </Button>
          <Button size="m" onClick={() => moveAim(3, 0)}>➡️</Button>
          <div />
          <Button size="m" onClick={() => moveAim(0, 3)}>⬇️</Button>
          <div />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="m" mode="secondary" onClick={reload} disabled={isReloading} stretched>
            🔄 Перезарядка
          </Button>
          <Button size="m" mode="tertiary" onClick={onCancel} stretched>
            Отменить
          </Button>
        </div>

        <Text style={{ fontSize: 12, textAlign: 'center', color: 'var(--text_secondary)', marginTop: 8 }}>
          Жёлтая линия показывает предсказанную траекторию. Учитывайте ветер!
        </Text>
      </Div>
    );
  };

  return (
    <Card mode="shadow" style={{ margin: 16, padding: 16 }}>
      {renderGame()}
    </Card>
  );
};

export default AerialHuntingMinigameV2;

