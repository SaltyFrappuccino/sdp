import React, { useState, useEffect, useCallback } from 'react';
import { Button, Progress, Card, Title, Text, Div, ModalRoot } from '@vkontakte/vkui';
import TutorialModal from './TutorialModal';

type GamePhase = 'preparation' | 'tracking' | 'approach' | 'engagement' | 'harvest' | 'result';
type Direction = 'up' | 'down' | 'left' | 'right';

interface Position {
  x: number;
  y: number;
}

interface WeatherConditions {
  windDirection: number;
  windSpeed: number;
  visibility: number;
  time: number;
}

interface Trap {
  id: number;
  name: string;
  type: string;
}

interface GroundHuntingMinigameV2Props {
  difficulty: number;
  weatherConditions: WeatherConditions;
  echoZone: { intensity: number; residual_aura: number } | null;
  trapsAvailable: Trap[];
  onComplete: (success: boolean, minigameScore: number, perfectHits: number, trapUsed: boolean) => void;
  onCancel: () => void;
}

const GroundHuntingMinigameV2: React.FC<GroundHuntingMinigameV2Props> = ({
  difficulty,
  weatherConditions,
  echoZone,
  trapsAvailable,
  onComplete,
  onCancel
}) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('preparation');
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [preyAlert, setPreyAlert] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [playerPosition, setPlayerPosition] = useState<Position>({ x: 10, y: 50 });
  const [preyPosition, setPreyPosition] = useState<Position>({ x: 90, y: 50 });
  const [currentTrack, setCurrentTrack] = useState<Direction | null>(null);
  const [perfectHits, setPerfectHits] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [message, setMessage] = useState('');
  const [selectedTrap, setSelectedTrap] = useState<Trap | null>(null);
  const [trapPlaced, setTrapPlaced] = useState(false);
  const [aimAccuracy, setAimAccuracy] = useState(0);
  const [crosshairPosition, setCrosshairPosition] = useState<Position>({ x: 50, y: 50 });
  const [showTutorial, setShowTutorial] = useState(false);

  // PHASE 1: PREPARATION
  const handleStartTracking = useCallback(() => {
    setGamePhase('tracking');
    setMessage('Следуйте по следам! Нажимайте правильные направления.');
    
    // Генерируем первый след
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    setCurrentTrack(directions[Math.floor(Math.random() * directions.length)]);
  }, []);

  // PHASE 2: TRACKING
  const handleDirectionClick = useCallback((direction: Direction) => {
    if (gamePhase !== 'tracking') return;

    if (direction === currentTrack) {
      // Правильное направление
      const increment = Math.max(15, 25 - difficulty * 2); // Было 10, 20 - difficulty * 3
      const newProgress = Math.min(100, trackingProgress + increment);
      setTrackingProgress(newProgress);
      setTotalScore(prev => prev + 5);
      setPerfectHits(prev => prev + 1);
      setMessage('✓ Верный след!');

      if (newProgress >= 100) {
        // Переход к приближению
        setTimeout(() => {
          setGamePhase('approach');
          setMessage('Добыча близко! Приближайтесь осторожно.');
          // Случайная позиция добычи
          setPreyPosition({
            x: 60 + Math.random() * 30,
            y: 30 + Math.random() * 40
          });
        }, 500);
        return;
      }

      // Следующий след
      const directions: Direction[] = ['up', 'down', 'left', 'right'];
      setCurrentTrack(directions[Math.floor(Math.random() * directions.length)]);
    } else {
      // Неправильное направление
      setTrackingProgress(prev => Math.max(0, prev - 5)); // Было -10
      setMessage('✗ Неверный след...');
    }
  }, [gamePhase, currentTrack, trackingProgress, difficulty]);

  // PHASE 3: APPROACH - скрытное приближение
  useEffect(() => {
    if (gamePhase !== 'approach') return;

    const interval = setInterval(() => {
      // Рассчитываем расстояние до добычи
      const distance = Math.sqrt(
        Math.pow(preyPosition.x - playerPosition.x, 2) +
        Math.pow(preyPosition.y - playerPosition.y, 2)
      );

      // Ветер влияет на обнаружение
      const windEffect = weatherConditions.windSpeed * 5;
      const playerDownwind = Math.abs(
        Math.atan2(preyPosition.y - playerPosition.y, preyPosition.x - playerPosition.x) * 180 / Math.PI -
        weatherConditions.windDirection
      ) < 45;

      // Уровень тревоги добычи
      let alertIncrease = noiseLevel * 0.5;
      if (playerDownwind) alertIncrease += windEffect;
      if (distance < 20) alertIncrease += 1; // Было +2

      setPreyAlert(prev => {
        const newAlert = Math.min(100, prev + alertIncrease);
        if (newAlert >= 100) {
          setMessage('💨 Добыча убежала!');
          setTimeout(() => onComplete(false, totalScore / 2, perfectHits, false), 1500);
          return 100;
        }
        return newAlert;
      });

      // Уровень шума естественно падает
      setNoiseLevel(prev => Math.max(0, prev - 1));

      // Проверка достижения добычи
      if (distance < 15 && !trapPlaced) {
        setGamePhase('engagement');
        setMessage('🎯 В зоне выстрела! Прицельтесь и стреляйте!');
        setCrosshairPosition({ x: 50, y: 50 });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gamePhase, playerPosition, preyPosition, noiseLevel, weatherConditions, trapPlaced, totalScore, perfectHits, onComplete]);

  const movePlayer = useCallback((direction: Direction) => {
    if (gamePhase !== 'approach') return;

    setPlayerPosition(prev => {
      const speed = 3;
      let newX = prev.x;
      let newY = prev.y;

      switch (direction) {
        case 'up':
          newY = Math.max(0, prev.y - speed);
          break;
        case 'down':
          newY = Math.min(100, prev.y + speed);
          break;
        case 'left':
          newX = Math.max(0, prev.x - speed);
          break;
        case 'right':
          newX = Math.min(100, prev.x + speed);
          break;
      }

      return { x: newX, y: newY };
    });

    // Движение создаёт шум
    setNoiseLevel(prev => Math.min(100, prev + 2)); // Было +5
  }, [gamePhase]);

  const placeTrap = useCallback(() => {
    if (!selectedTrap || trapPlaced) return;

    setTrapPlaced(true);
    setMessage(`Ловушка "${selectedTrap.name}" установлена! Ждите...`);
    setTotalScore(prev => prev + 15);

    // Имитация срабатывания ловушки
    setTimeout(() => {
      const trapSuccess = Math.random() > (difficulty * 0.3); // Шанс побега зависит от сложности
      
      if (trapSuccess) {
        setGamePhase('harvest');
        setMessage('✓ Ловушка сработала! Собирайте добычу.');
        setTotalScore(prev => prev + 30);
      } else {
        setMessage('💨 Добыча вырвалась из ловушки!');
        setTimeout(() => onComplete(false, totalScore, perfectHits, true), 1500);
      }
    }, 3000);
  }, [selectedTrap, trapPlaced, difficulty, totalScore, perfectHits, onComplete]);

  // PHASE 4: ENGAGEMENT - выстрел
  const moveCrosshair = useCallback((direction: Direction) => {
    if (gamePhase !== 'engagement') return;

    setCrosshairPosition(prev => {
      const speed = 4;
      let newX = prev.x;
      let newY = prev.y;

      switch (direction) {
        case 'up':
          newY = Math.max(0, prev.y - speed);
          break;
        case 'down':
          newY = Math.min(100, prev.y + speed);
          break;
        case 'left':
          newX = Math.max(0, prev.x - speed);
          break;
        case 'right':
          newX = Math.min(100, prev.x + speed);
          break;
      }

      return { x: newX, y: newY };
    });
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== 'engagement') return;

    const interval = setInterval(() => {
      const distance = Math.sqrt(
        Math.pow(preyPosition.x - crosshairPosition.x, 2) +
        Math.pow(preyPosition.y - crosshairPosition.y, 2)
      );

      const newAccuracy = Math.max(0, 100 - distance * 2);
      setAimAccuracy(newAccuracy);

      // Добыча движется
      setPreyPosition(prev => ({
        x: Math.max(40, Math.min(100, prev.x + (Math.random() - 0.5) * (difficulty * 1))), // Было * 2
        y: Math.max(20, Math.min(80, prev.y + (Math.random() - 0.5) * (difficulty * 1))) // Было * 2
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [gamePhase, crosshairPosition, preyPosition, difficulty]);

  const shoot = useCallback(() => {
    if (gamePhase !== 'engagement') return;

    const distance = Math.sqrt(
      Math.pow(preyPosition.x - crosshairPosition.x, 2) +
      Math.pow(preyPosition.y - crosshairPosition.y, 2)
    );

    const hitThreshold = 15 + difficulty * 2; // Было 10 + difficulty * 3
    const hit = distance < hitThreshold;

    if (hit) {
      const accuracyBonus = Math.floor(aimAccuracy / 10);
      setTotalScore(prev => prev + 40 + accuracyBonus);
      setPerfectHits(prev => prev + (aimAccuracy > 80 ? 1 : 0));
      setGamePhase('harvest');
      setMessage('🎯 Отличный выстрел! Собирайте добычу.');
    } else {
      setMessage('💨 Промах! Добыча убежала...');
      setTimeout(() => onComplete(false, totalScore, perfectHits, false), 1500);
    }
  }, [gamePhase, preyPosition, crosshairPosition, aimAccuracy, difficulty, totalScore, perfectHits, onComplete]);

  // PHASE 5: HARVEST
  const handleHarvest = useCallback(() => {
    if (gamePhase !== 'harvest') return;

    // Quick-time event для качества
    const harvestQuality = 70 + Math.random() * 30;
    const finalScore = totalScore + Math.floor(harvestQuality);

    setGamePhase('result');
    setTimeout(() => onComplete(true, finalScore, perfectHits, trapPlaced), 500);
  }, [gamePhase, totalScore, perfectHits, trapPlaced, onComplete]);

  // Рендер фаз
  const renderPhase = () => {
    switch (gamePhase) {
      case 'preparation':
        return (
          <Div>
            <Title level="2">🦌 Подготовка к охоте</Title>
            
            <Text style={{ marginTop: 12, marginBottom: 16 }}>
              Погодные условия:<br/>
              Ветер: {weatherConditions.windSpeed.toFixed(1)} м/с, направление {weatherConditions.windDirection}°<br/>
              Видимость: {(weatherConditions.visibility * 100).toFixed(0)}%<br/>
              Время: {weatherConditions.time}:00
            </Text>

            {echoZone && (
              <div style={{ 
                padding: 12, 
                background: 'rgba(255, 51, 71, 0.1)', 
                borderRadius: 8,
                marginBottom: 16 
              }}>
                <Text weight="2">⚠️ Эхо-Зона обнаружена!</Text>
                <Text style={{ fontSize: 14 }}>
                  Интенсивность: {echoZone.intensity}/5<br/>
                  Резидуальная Аура: {(echoZone.residual_aura * 100).toFixed(0)}%
                </Text>
              </div>
            )}

            {trapsAvailable.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text weight="2" style={{ marginBottom: 8 }}>Доступные ловушки:</Text>
                {trapsAvailable.map(trap => (
                  <Button
                    key={trap.id}
                    size="m"
                    mode={selectedTrap?.id === trap.id ? 'primary' : 'secondary'}
                    onClick={() => setSelectedTrap(trap)}
                    stretched
                    style={{ marginBottom: 4 }}
                  >
                    {trap.name}
                  </Button>
                ))}
                <Text style={{ fontSize: 12, color: 'var(--text_secondary)', marginTop: 4 }}>
                  Ловушка будет расходована при использовании
                </Text>
              </div>
            )}

            <Button size="l" onClick={handleStartTracking} stretched>
              Начать выслеживание
            </Button>
            <Button size="m" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 8 }}>
              Отменить
            </Button>
          </Div>
        );

      case 'tracking':
        return (
          <Div>
            <Title level="2">🐾 Выслеживание</Title>
            
            <Text style={{ marginBottom: 16 }}>{message}</Text>

            <Progress value={trackingProgress} style={{ marginBottom: 16 }} />

            {currentTrack && (
              <div style={{ textAlign: 'center', fontSize: 48, margin: '24px 0' }}>
                {currentTrack === 'up' && '⬆️'}
                {currentTrack === 'down' && '⬇️'}
                {currentTrack === 'left' && '⬅️'}
                {currentTrack === 'right' && '➡️'}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div />
              <Button size="l" onClick={() => handleDirectionClick('up')}>⬆️</Button>
              <div />
              <Button size="l" onClick={() => handleDirectionClick('left')}>⬅️</Button>
              <div />
              <Button size="l" onClick={() => handleDirectionClick('right')}>➡️</Button>
              <div />
              <Button size="l" onClick={() => handleDirectionClick('down')}>⬇️</Button>
              <div />
            </div>
          </Div>
        );

      case 'approach':
        return (
          <Div>
            <Title level="2">🤫 Скрытное приближение</Title>
            
            <Text style={{ marginBottom: 12 }}>{message}</Text>

            <div style={{ marginBottom: 12 }}>
              <Text>Уровень тревоги добычи:</Text>
              <Progress value={preyAlert} style={{ background: preyAlert > 70 ? '#FF3347' : undefined }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <Text>Уровень шума:</Text>
              <Progress value={noiseLevel} />
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              height: '250px',
              background: 'linear-gradient(to bottom, #8BC34A 0%, #558B2F 100%)',
              borderRadius: 8,
              marginBottom: 16,
              overflow: 'hidden'
            }}>
              {/* Ветер */}
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                fontSize: 12,
                background: 'rgba(255,255,255,0.8)',
                padding: 4,
                borderRadius: 4
              }}>
                🌬️ {weatherConditions.windSpeed.toFixed(1)} м/с
              </div>

              {/* Игрок */}
              <div style={{
                position: 'absolute',
                left: `${playerPosition.x}%`,
                top: `${playerPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: 24
              }}>
                🏹
              </div>

              {/* Добыча */}
              <div style={{
                position: 'absolute',
                left: `${preyPosition.x}%`,
                top: `${preyPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: 32,
                opacity: preyAlert > 70 ? 0.5 : 1
              }}>
                🦌
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div />
              <Button size="m" onClick={() => movePlayer('up')}>⬆️</Button>
              <div />
              <Button size="m" onClick={() => movePlayer('left')}>⬅️</Button>
              {selectedTrap && !trapPlaced && (
                <Button size="m" mode="primary" onClick={placeTrap}>
                  🪤 Ловушка
                </Button>
              )}
              {(!selectedTrap || trapPlaced) && <div />}
              <Button size="m" onClick={() => movePlayer('right')}>➡️</Button>
              <div />
              <Button size="m" onClick={() => movePlayer('down')}>⬇️</Button>
              <div />
            </div>

            <Text style={{ fontSize: 12, textAlign: 'center', color: 'var(--text_secondary)' }}>
              Двигайтесь осторожно! Учитывайте направление ветра.
            </Text>
          </Div>
        );

      case 'engagement':
        return (
          <Div>
            <Title level="2">🎯 Прицеливание</Title>
            
            <Text style={{ marginBottom: 12 }}>{message}</Text>

            <div style={{ marginBottom: 12 }}>
              <Text>Точность: {Math.round(aimAccuracy)}%</Text>
              <Progress value={aimAccuracy} />
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              height: '300px',
              background: 'linear-gradient(to bottom, #8BC34A 0%, #558B2F 100%)',
              borderRadius: 8,
              marginBottom: 16,
              overflow: 'hidden'
            }}>
              {/* Добыча */}
              <div style={{
                position: 'absolute',
                left: `${preyPosition.x}%`,
                top: `${preyPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: 40
              }}>
                🦌
              </div>

              {/* Прицел */}
              <div style={{
                position: 'absolute',
                left: `${crosshairPosition.x}%`,
                top: `${crosshairPosition.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: 48,
                color: aimAccuracy > 80 ? '#4BB34B' : aimAccuracy > 50 ? '#FFA726' : '#FF3347'
              }}>
                ⊕
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div />
              <Button size="m" onClick={() => moveCrosshair('up')}>⬆️</Button>
              <div />
              <Button size="m" onClick={() => moveCrosshair('left')}>⬅️</Button>
              <div />
              <Button size="m" onClick={() => moveCrosshair('right')}>➡️</Button>
              <div />
              <Button size="m" onClick={() => moveCrosshair('down')}>⬇️</Button>
              <div />
            </div>

            <Button size="l" mode="primary" onClick={shoot} stretched>
              🎯 ВЫСТРЕЛ!
            </Button>
          </Div>
        );

      case 'harvest':
        return (
          <Div>
            <Title level="2">🔪 Сбор добычи</Title>
            
            <Text style={{ marginBottom: 16 }}>{message}</Text>

            <div style={{ textAlign: 'center', fontSize: 64, margin: '24px 0' }}>
              🦌
            </div>

            <Text style={{ marginBottom: 16, textAlign: 'center' }}>
              Нажмите для сбора материалов с добычи
            </Text>

            <Button size="l" onClick={handleHarvest} stretched>
              Собрать добычу
            </Button>
          </Div>
        );

      case 'result':
        return (
          <Div>
            <Title level="2" style={{ color: '#4BB34B' }}>✓ Охота завершена!</Title>
            <div style={{ textAlign: 'center', fontSize: 64, margin: '24px 0' }}>
              🏆
            </div>
            <Text style={{ textAlign: 'center' }}>
              Очки: {totalScore}<br/>
              Точных действий: {perfectHits}
            </Text>
          </Div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Card mode="shadow" style={{ margin: 16, padding: 16, position: 'relative' }}>
        <Button 
          mode="tertiary" 
          size="s"
          onClick={() => setShowTutorial(true)}
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
        >
          ❓ Обучение
        </Button>
        {renderPhase()}
      </Card>

      <ModalRoot activeModal={showTutorial ? 'tutorial' : null}>
        <TutorialModal 
          id="tutorial"
          gameType="hunting_ground"
          onClose={() => setShowTutorial(false)}
        />
      </ModalRoot>
    </>
  );
};

export default GroundHuntingMinigameV2;

