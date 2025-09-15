import { FC, useState, useEffect } from 'react';
import { Card, Div, Text, Button, Spinner } from '@vkontakte/vkui';
import { Icon28AddOutline, Icon28ChecksOutline } from '@vkontakte/icons';

interface BlackjackGameProps {
  characterId: number;
  betAmount: number;
  onGameStart: () => void;
  onGameEnd: (result: any) => void;
  onClose: () => void;
}

interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface GameState {
  playerCards: Card[];
  dealerCards: Card[];
  playerValue: number;
  dealerValue: number;
  gameStatus: 'waiting' | 'playing' | 'playerBust' | 'dealerTurn' | 'finished';
  result?: 'win' | 'lose' | 'push';
  winAmount?: number;
}

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const BlackjackGame: FC<BlackjackGameProps> = ({ betAmount, onGameStart, onGameEnd, onClose }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    // Инициализируем игру в состоянии ожидания
    setGameState({
      playerCards: [],
      dealerCards: [],
      playerValue: 0,
      dealerValue: 0,
      gameStatus: 'waiting'
    });
  }, []);

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    for (let suit = 0; suit < 4; suit++) {
      for (let rank = 0; rank < 13; rank++) {
        deck.push({
          suit: SUITS[suit],
          rank: RANKS[rank],
          value: Math.min(rank + 1, 10)
        });
      }
    }
    return shuffleDeck(deck);
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const calculateHandValue = (cards: Card[]): number => {
    let value = cards.reduce((sum, card) => sum + card.value, 0);
    const aces = cards.filter(card => card.rank === 'A').length;
    
    for (let i = 0; i < aces && value + 10 <= 21; i++) {
      value += 10;
    }
    
    return value;
  };

  const startNewGame = async () => {
    setLoading(true);
    setAnimating(true);
    setGameStarted(true);
    
    // Уведомляем родительский компонент о начале игры (для списания ставки)
    onGameStart();
    
    // Создаем колоду и раздаем карты
    const deck = createDeck();
    const playerCards = [deck.pop()!, deck.pop()!];
    const dealerCards = [deck.pop()!, deck.pop()!];
    
    const playerValue = calculateHandValue(playerCards);
    const dealerValue = calculateHandValue(dealerCards);
    
    // Проверяем на блэкджек (менее выгодно для игрока)
    let gameStatus: 'playing' | 'playerBust' | 'dealerTurn' | 'finished' = 'playing';
    let result: 'win' | 'lose' | 'push' | undefined;
    let winAmount = 0;
    
    if (playerValue === 21 && dealerValue === 21) {
      gameStatus = 'finished';
      result = 'push';
      winAmount = betAmount; // возврат ставки
    } else if (playerValue === 21) {
      gameStatus = 'finished';
      result = 'win';
      winAmount = Math.floor(betAmount * 2.2); // уменьшили с 2.5 до 2.2
    }
    
    setGameState({
      playerCards,
      dealerCards,
      playerValue,
      dealerValue,
      gameStatus,
      result,
      winAmount
    });
    
    setTimeout(() => {
      setAnimating(false);
      setLoading(false);
      
      // Если игра сразу закончилась (блэкджек), завершаем ее
      if (gameStatus === 'finished') {
        setTimeout(() => {
          onGameEnd({ result, winAmount, gameData: { playerCards, dealerCards, playerValue, dealerValue } });
        }, 1500);
      }
    }, 1000);
  };

  const hit = () => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    
    setAnimating(true);
    
    // Добавляем карту игроку
    const deck = createDeck();
    const newCard = deck[Math.floor(Math.random() * deck.length)];
    const newPlayerCards = [...gameState.playerCards, newCard];
    const newPlayerValue = calculateHandValue(newPlayerCards);
    
    let newGameStatus: 'playing' | 'playerBust' | 'dealerTurn' | 'finished' = gameState.gameStatus;
    let result: 'win' | 'lose' | 'push' | undefined;
    let winAmount = 0;
    
    if (newPlayerValue > 21) {
      newGameStatus = 'playerBust';
      result = 'lose';
    } else if (newPlayerValue === 21) {
      newGameStatus = 'finished';
      result = 'win';
      winAmount = Math.floor(betAmount * 1.8); // уменьшили с 2 до 1.8
    }
    
    setGameState({
      ...gameState,
      playerCards: newPlayerCards,
      playerValue: newPlayerValue,
      gameStatus: newGameStatus,
      result,
      winAmount
    });
    
    setTimeout(() => {
      setAnimating(false);
      if (newGameStatus === 'playerBust') {
        setTimeout(() => {
          onGameEnd({ result, winAmount, gameData: { playerCards: newPlayerCards, dealerCards: gameState.dealerCards, playerValue: newPlayerValue, dealerValue: gameState.dealerValue } });
        }, 1000);
      }
    }, 1000);
  };

  const stand = async () => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    
    setLoading(true);
    setAnimating(true);
    
    // Дилер добирает карты
    let dealerCards = [...gameState.dealerCards];
    let dealerValue = calculateHandValue(dealerCards);
    
    // Анимация добирания карт дилером
    while (dealerValue < 17) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const deck = createDeck();
      const newCard = deck[Math.floor(Math.random() * deck.length)];
      dealerCards.push(newCard);
      dealerValue = calculateHandValue(dealerCards);
      
      setGameState(prev => prev ? {
        ...prev,
        dealerCards,
        dealerValue,
        gameStatus: 'dealerTurn'
      } : null);
    }
    
    // Определяем результат
    let result: 'win' | 'lose' | 'push';
    let winAmount = 0;
    
    if (dealerValue > 21) {
      result = 'win';
      winAmount = Math.floor(betAmount * 1.8); // уменьшили с 2 до 1.8
    } else if (dealerValue > gameState.playerValue) {
      result = 'lose';
    } else if (dealerValue === gameState.playerValue) {
      result = 'push';
      winAmount = betAmount; // возврат ставки
    } else {
      result = 'win';
      winAmount = Math.floor(betAmount * 1.8); // уменьшили с 2 до 1.8
    }
    
    setGameState(prev => prev ? {
      ...prev,
      dealerCards,
      dealerValue,
      gameStatus: 'finished',
      result,
      winAmount
    } : null);
    
    setTimeout(() => {
      setAnimating(false);
      setLoading(false);
      onGameEnd({ result, winAmount, gameData: { playerCards: gameState.playerCards, dealerCards, playerValue: gameState.playerValue, dealerValue } });
    }, 1000);
  };

  const renderCard = (card: Card, index: number, hideSecond = false) => (
    <div
      key={index}
      style={{
        width: 60,
        height: 84,
        border: '2px solid #333',
        borderRadius: 8,
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 4,
        margin: 2,
        fontSize: 12,
        fontWeight: 'bold',
        color: card.suit === '♥️' || card.suit === '♦️' ? '#d32f2f' : '#333',
        transform: hideSecond ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s ease',
        opacity: animating ? 0.7 : 1,
        animation: animating ? 'cardDeal 0.5s ease' : 'none'
      }}
    >
      <div>{card.rank}</div>
      <div style={{ fontSize: 16, textAlign: 'center' }}>{card.suit}</div>
      <div style={{ transform: 'rotate(180deg)' }}>{card.rank}</div>
    </div>
  );

  if (!gameState) {
    return (
      <Card>
        <Div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner size="l" />
          <Text style={{ marginTop: 16 }}>Загрузка игры...</Text>
        </Div>
      </Card>
    );
  }

  // Экран ожидания начала игры
  if (gameState.gameStatus === 'waiting') {
    return (
      <Card style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
        <Div style={{ backgroundColor: '#2a2a2a', textAlign: 'center', padding: 40 }}>
          <Text weight="2" style={{ fontSize: 24, color: '#fff', marginBottom: 16 }}>
            🃏 Блэкджек
          </Text>
          <Text style={{ color: '#ccc', marginBottom: 24 }}>
            Ставка: {betAmount} 💰
          </Text>
          <Text style={{ color: '#ccc', marginBottom: 32 }}>
            Готовы начать игру? После начала игры ставка будет списана и вы не сможете выйти без завершения.
          </Text>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button
              size="l"
              onClick={startNewGame}
              disabled={loading}
              style={{ backgroundColor: '#4caf50', color: '#fff' }}
            >
              Начать игру
            </Button>
            <Button
              size="l"
              onClick={onClose}
              style={{ backgroundColor: '#444', color: '#fff' }}
            >
              Отмена
            </Button>
          </div>
        </Div>
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
      <Div style={{ backgroundColor: '#2a2a2a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text weight="2" style={{ fontSize: 18, color: '#fff' }}>🃏 Блэкджек</Text>
          {gameState.gameStatus === 'finished' && (
            <Button 
              size="s" 
              onClick={onClose}
              style={{ backgroundColor: '#444', color: '#fff' }}
            >
              ✕
            </Button>
          )}
        </div>

        {/* Карты дилера */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8, color: '#fff' }}>
            Дилер {gameState.gameStatus === 'dealerTurn' || gameState.gameStatus === 'finished' ? 
              `(${gameState.dealerValue})` : '(?)'}
          </Text>
          <div style={{ display: 'flex', gap: 4 }}>
            {gameState.dealerCards.map((card, index) => 
              renderCard(card, index, gameState.gameStatus === 'playing' && index === 1)
            )}
          </div>
        </div>

        {/* Карты игрока */}
        <div style={{ marginBottom: 20 }}>
          <Text weight="2" style={{ marginBottom: 8, color: '#fff' }}>
            Ваши карты ({gameState.playerValue})
          </Text>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {gameState.playerCards.map((card, index) => 
              renderCard(card, index)
            )}
          </div>
        </div>

        {/* Статус игры */}
        {gameState.gameStatus === 'playerBust' && (
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: '#ffebee', 
            borderRadius: 8, 
            marginBottom: 16 
          }}>
            <Text weight="2" style={{ color: '#d32f2f' }}>Перебор! Вы проиграли</Text>
          </div>
        )}

        {gameState.gameStatus === 'finished' && (
          <div style={{ 
            textAlign: 'center', 
            padding: 16, 
            backgroundColor: gameState.result === 'win' ? '#e8f5e8' : 
                           gameState.result === 'lose' ? '#ffebee' : '#fff3cd',
            borderRadius: 8, 
            marginBottom: 16 
          }}>
            <Text weight="2" style={{ 
              color: gameState.result === 'win' ? '#2e7d32' : 
                     gameState.result === 'lose' ? '#d32f2f' : '#f57c00'
            }}>
              {gameState.result === 'win' ? '🎉 Поздравляем! Вы выиграли!' :
               gameState.result === 'lose' ? '😔 Вы проиграли' : '🤝 Ничья!'}
            </Text>
            {gameState.winAmount && gameState.winAmount > 0 && (
              <Text style={{ marginTop: 8, fontSize: 16 }}>
                Выигрыш: {gameState.winAmount} 💰
              </Text>
            )}
          </div>
        )}

        {/* Кнопки управления */}
        {gameState.gameStatus === 'playing' && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button
              size="l"
              before={<Icon28AddOutline />}
              onClick={hit}
              disabled={loading || animating}
            >
              Взять карту
            </Button>
            <Button
              size="l"
              before={<Icon28ChecksOutline />}
              onClick={stand}
              disabled={loading || animating}
            >
              Остановиться
            </Button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16, color: '#ccc' }}>
          <Text style={{ fontSize: 14 }}>
            Ставка: {betAmount} 💰
          </Text>
        </div>
      </Div>

      <style>{`
        @keyframes cardDeal {
          0% { transform: translateY(-20px) rotate(10deg); opacity: 0; }
          100% { transform: translateY(0) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </Card>
  );
};
