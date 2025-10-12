import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Progress, Card, Title, Text, Div, Snackbar, ModalRoot } from '@vkontakte/vkui';
import TutorialModal from './TutorialModal';

type GamePhase = 'cast' | 'wait' | 'hook' | 'reel' | 'fight' | 'result';
type FishBehavior = 'calm' | 'aggressive' | 'fleeing' | 'mutated';

interface WaterConditions {
  depth: number;
  current: number;
  visibility: number;
  temperature: number;
}

interface FishingMinigameV2Props {
  difficulty: number;
  waterConditions: WaterConditions;
  echoZone: { intensity: number; residual_aura: number } | null;
  onComplete: (success: boolean, minigameScore: number, perfectHits: number) => void;
  onCancel: () => void;
}

const FishingMinigameV2: React.FC<FishingMinigameV2Props> = ({ 
  difficulty, 
  waterConditions,
  echoZone,
  onComplete, 
  onCancel 
}) => {
  // State
  const [gamePhase, setGamePhase] = useState<GamePhase>('cast');
  const [selectedDepth, setSelectedDepth] = useState(50);
  const [waitTime, setWaitTime] = useState(0);
  const [hookTiming, setHookTiming] = useState(0);
  const [tension, setTension] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [fishProgress, setFishProgress] = useState(0);
  const [fishBehavior, setFishBehavior] = useState<FishBehavior>('calm');
  const [isPulling, setIsPulling] = useState(false);
  const [perfectHits, setPerfectHits] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [message, setMessage] = useState('');
  const [fishPosition, setFishPosition] = useState(50);
  const [reelSpeed, setReelSpeed] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const phaseTimer = useRef<number>(0);
  const hookWindow = useRef<number>(0);

  // PHASE 1: CAST - выбор глубины
  const handleCast = useCallback(() => {
    setGamePhase('wait');
    setWaitTime(0);
    setMessage('Ожидайте поклёвки...');

    // Рассчитываем время ожидания на основе глубины и условий
    const baseWaitTime = 2000 + selectedDepth * 30;
    const currentModifier = waterConditions.current;
    const waitDuration = baseWaitTime * (1 + currentModifier * 0.5);

    setTimeout(() => {
      // Переход к подсечке
      setGamePhase('hook');
      hookWindow.current = 1500 + Math.random() * 1000; // 1.5-2.5 сек (было 0.8-1.2)
      setMessage('⚡ ПОДСЕЧКА! Нажмите кнопку!');
      
      setTimeout(() => {
        // Если не подсёк вовремя - провал
        if (gamePhase === 'hook') {
          setMessage('Рыба сорвалась...');
          setTimeout(() => onComplete(false, 0, 0), 1500);
        }
      }, hookWindow.current);
    }, waitDuration);
  }, [selectedDepth, waterConditions, gamePhase, onComplete]);

  // PHASE 3: HOOK - подсечка
  const handleHook = useCallback(() => {
    if (gamePhase !== 'hook') return;

    const timing = hookWindow.current - hookTiming;
    const perfect = timing > 200 && timing < 400; // Sweet spot

    if (perfect) {
      setPerfectHits(prev => prev + 1);
      setTotalScore(prev => prev + 20);
      setMessage('💥 ОТЛИЧНАЯ ПОДСЕЧКА!');
    } else if (timing > 100) {
      setTotalScore(prev => prev + 10);
      setMessage('✓ Подсечка удалась');
    } else {
      setMessage('Слабая подсечка...');
      setTotalScore(prev => prev + 5);
    }

    // Определяем поведение рыбы на основе мутации
    const behaviors: FishBehavior[] = echoZone 
      ? ['calm', 'aggressive', 'fleeing', 'mutated']
      : ['calm', 'aggressive', 'fleeing'];
    
    const selectedBehavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    setFishBehavior(selectedBehavior);

    setTimeout(() => {
      setGamePhase('reel');
      setFishProgress(0);
      setTension(30);
      setMessage('Подматывайте леску! Следите за натяжением!');
    }, 1000);
  }, [gamePhase, hookTiming, hookWindow, echoZone]);

  // PHASE 4: REEL - подматывание
  useEffect(() => {
    if (gamePhase !== 'reel' && gamePhase !== 'fight') return;

    const interval = setInterval(() => {
      // Рыба сопротивляется
      const fishStrength = difficulty * (fishBehavior === 'aggressive' ? 1.5 : 1.0);
      
      if (isPulling) {
        // Игрок подматывает
        setFishProgress(prev => {
          const newProgress = prev + (1.5 - difficulty * 0.2); // Было 1.0 - difficulty * 0.3
          if (newProgress >= 100) {
            // Победа!
            setGamePhase('result');
            const finalScore = totalScore + perfectHits * 10 + Math.floor(stamina);
            setTimeout(() => onComplete(true, finalScore, perfectHits), 500);
            return 100;
          }
          return newProgress;
        });

        // Натяжение увеличивается при подматывании
        setTension(prev => {
          const newTension = Math.min(100, prev + (fishStrength * 0.8)); // Было 1.5
          if (newTension >= 100) {
            // Леска порвалась!
            setMessage('💔 Леска порвалась!');
            setTimeout(() => onComplete(false, totalScore / 2, perfectHits), 1500);
            return 100;
          }
          return newTension;
        });

        // Выносливость уменьшается
        setStamina(prev => {
          const newStamina = Math.max(0, prev - (0.3 * difficulty)); // Было 0.5
          if (newStamina <= 0) {
            setMessage('😓 Силы кончились...');
            setTimeout(() => onComplete(false, totalScore / 2, perfectHits), 1500);
            return 0;
          }
          return newStamina;
        });

        setReelSpeed(2);
      } else {
        // Игрок отпустил - натяжение падает, но рыба уходит
        setTension(prev => Math.max(0, prev - 1.5));
        setFishProgress(prev => Math.max(0, prev - (fishStrength * 0.15))); // Было 0.3
        setReelSpeed(0);

        // Небольшое восстановление выносливости
        setStamina(prev => Math.min(100, prev + 0.2));
      }

      // Эхо-Зоны: случайные телепортации (мутированная рыба)
      if (fishBehavior === 'mutated' && Math.random() < 0.05) {
        setFishPosition(Math.random() * 100);
        setMessage('⚡ Рыба телепортировалась!');
        setTension(prev => Math.min(100, prev + 20));
      }

      // Агрессивное поведение: резкие рывки
      if (fishBehavior === 'aggressive' && Math.random() < 0.1) {
        setTension(prev => Math.min(100, prev + 15));
        setMessage('💢 Рыба делает рывок!');
      }

      // Убегающая рыба: постоянно пытается уплыть
      if (fishBehavior === 'fleeing') {
        setFishProgress(prev => Math.max(0, prev - 0.5));
      }

    }, 50);

    return () => clearInterval(interval);
  }, [gamePhase, isPulling, difficulty, fishBehavior, echoZone, stamina, totalScore, perfectHits, onComplete]);

  // Timer для hook phase
  useEffect(() => {
    if (gamePhase === 'hook') {
      const interval = setInterval(() => {
        setHookTiming(prev => prev + 50);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [gamePhase]);

  // Рендер различных фаз
  const renderPhase = () => {
    switch (gamePhase) {
      case 'cast':
        return (
          <Div>
            <Title level="2">🎣 Заброс удочки</Title>
            <Text style={{ marginTop: 12, marginBottom: 16 }}>
              Выберите глубину заброса. Глубже = реже рыба, но крупнее.
            </Text>

            <Text style={{ marginBottom: 8 }}>
              Глубина: {selectedDepth}м
            </Text>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedDepth}
              onChange={(e) => setSelectedDepth(parseInt(e.target.value))}
              style={{ width: '100%', marginBottom: 16 }}
            />

            <div style={{ 
              background: 'linear-gradient(to bottom, #4FC3F7 0%, #0277BD 100%)',
              height: '150px',
              position: 'relative',
              borderRadius: '8px',
              marginBottom: 16
            }}>
              <div style={{
                position: 'absolute',
                top: `${selectedDepth}%`,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '24px'
              }}>
                🪝
              </div>
            </div>

            <Text style={{ fontSize: 14, color: 'var(--text_secondary)', marginBottom: 16 }}>
              Температура: {waterConditions.temperature.toFixed(1)}°C<br/>
              Течение: {(waterConditions.current * 100).toFixed(0)}%<br/>
              Видимость: {(waterConditions.visibility * 100).toFixed(0)}%
            </Text>

            <Button size="l" onClick={handleCast} stretched>
              Забросить удочку
            </Button>
            <Button size="m" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 8 }}>
              Отменить
            </Button>
          </Div>
        );

      case 'wait':
        return (
          <Div>
            <Title level="2">🎣 Ожидание</Title>
            <Text style={{ marginTop: 12, marginBottom: 16 }}>
              {message}
            </Text>
            <div style={{ textAlign: 'center', fontSize: '48px', margin: '32px 0' }}>
              🌊
            </div>
            <Text style={{ textAlign: 'center', color: 'var(--text_secondary)' }}>
              Терпение - ключ к успеху...
            </Text>
          </Div>
        );

      case 'hook':
        return (
          <Div>
            <Title level="2" style={{ color: '#FF3347' }}>⚡ ПОДСЕЧКА!</Title>
            <Text style={{ marginTop: 12, marginBottom: 24, fontSize: 18, fontWeight: 'bold' }}>
              {message}
            </Text>
            
            <div style={{ 
              textAlign: 'center', 
              fontSize: '72px', 
              margin: '32px 0',
              animation: 'pulse 0.5s infinite'
            }}>
              🐟
            </div>

            <Button 
              size="l" 
              mode="primary"
              onClick={handleHook}
              stretched
              style={{ 
                background: '#FF3347',
                fontSize: 20,
                padding: '20px'
              }}
            >
              🪝 ПОДСЕЧЬ!
            </Button>
          </Div>
        );

      case 'reel':
      case 'fight':
        return (
          <Div>
            <Title level="2">🎣 Вываживание рыбы</Title>
            
            {message && (
              <Text style={{ 
                marginTop: 8, 
                marginBottom: 12,
                color: message.includes('💔') || message.includes('😓') ? '#FF3347' : 'inherit',
                fontWeight: message.includes('⚡') || message.includes('💢') ? 'bold' : 'normal'
              }}>
                {message}
              </Text>
            )}

            <Text style={{ marginTop: 12 }}>Прогресс вываживания:</Text>
            <Progress value={fishProgress} style={{ marginBottom: 12 }} />

            <Text>Натяжение лески:</Text>
            <Progress 
              value={tension} 
              style={{ 
                marginBottom: 12,
                background: tension > 80 ? '#FF3347' : tension > 60 ? '#FFA726' : undefined
              }} 
            />

            <Text>Выносливость:</Text>
            <Progress 
              value={stamina} 
              style={{ marginBottom: 16 }}
            />

            <Text style={{ fontSize: 14, color: 'var(--text_secondary)', marginBottom: 12 }}>
              Поведение рыбы: {
                fishBehavior === 'calm' ? '😌 Спокойная' :
                fishBehavior === 'aggressive' ? '😠 Агрессивная' :
                fishBehavior === 'fleeing' ? '🏃 Убегающая' :
                '⚡ Мутированная'
              }
            </Text>

            <div style={{
              position: 'relative',
              height: '100px',
              background: '#0277BD',
              borderRadius: '8px',
              marginBottom: 16,
              overflow: 'hidden'
            }}>
              {/* Рыба */}
              <div style={{
                position: 'absolute',
                left: `${fishPosition}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '32px',
                transition: fishBehavior === 'mutated' ? 'none' : 'left 0.3s'
              }}>
                🐟
              </div>

              {/* Леска */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: '2px',
                height: '100%',
                background: tension > 80 ? '#FF3347' : '#FFF',
                transform: `translateX(-50%) scaleY(${1 + tension / 100})`
              }} />
            </div>

            <Button 
              size="l" 
              mode={isPulling ? 'primary' : 'secondary'}
              onMouseDown={() => setIsPulling(true)}
              onMouseUp={() => setIsPulling(false)}
              onMouseLeave={() => setIsPulling(false)}
              onTouchStart={() => setIsPulling(true)}
              onTouchEnd={() => setIsPulling(false)}
              stretched
            >
              {isPulling ? '🎣 Подматываю! (↑)' : '🎣 Удерживайте для подматывания'}
            </Button>

            <Text style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--text_secondary)' }}>
              Подматывайте, когда натяжение низкое. Отпускайте при высоком!
            </Text>

            <Button size="m" mode="secondary" onClick={onCancel} stretched style={{ marginTop: 8 }}>
              Сдаться
            </Button>
          </Div>
        );

      case 'result':
        return (
          <Div>
            <Title level="2" style={{ color: '#4BB34B' }}>✓ Успех!</Title>
            <div style={{ textAlign: 'center', fontSize: '64px', margin: '24px 0' }}>
              🐟
            </div>
            <Text style={{ textAlign: 'center', marginBottom: 16 }}>
              Рыба поймана!<br/>
              Очки: {totalScore}<br/>
              Идеальных действий: {perfectHits}
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
          gameType="fishing"
          onClose={() => setShowTutorial(false)}
        />
      </ModalRoot>
    </>
  );
};

export default FishingMinigameV2;

