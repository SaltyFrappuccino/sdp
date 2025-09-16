import React, { FC, useState, useEffect, useCallback } from 'react';
import { Panel, PanelHeader, PanelHeaderBack, Div, Button, Group, Cell, FormItem, Input, Text, Placeholder, Spinner, Banner } from '@vkontakte/vkui';
import { PokerCard } from './PokerCard';
import { API_URL } from '../api';

interface Card {
  rank: string; // 'A', '2', '3', ..., 'K', 'T'
  suit: string; // 'c', 'd', 'h', 's'
}

interface PokerRoom {
  id: number;
  room_name: string;
  creator_id: number;
  creator_name: string;
  max_players: number;
  current_players: number;
  buy_in: number;
  small_blind: number;
  big_blind: number;
  status: 'waiting' | 'playing' | 'finished';
  current_hand_id: number | null;
}

interface PokerPlayer {
  id: number;
  room_id: number;
  character_id: number;
  character_name: string;
  seat_position: number;
  chips: number;
  status: 'active' | 'folded' | 'eliminated' | 'disconnected';
}

interface PokerHand {
  id: number;
  room_id: number;
  hand_number: number;
  dealer_position: number;
  small_blind_position: number;
  big_blind_position: number;
  community_cards: Card[];
  pot: number;
  current_bet: number;
  current_player_position: number;
  round_stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
  winner_id: number | null;
  side_pots: any[];
}

interface PokerTableProps {
  roomId: number;
  currentPlayerId: number;
  currentCharacterId: number;
  onLeaveRoom: () => void;
}

export const PokerTable: FC<PokerTableProps> = ({ roomId, currentPlayerId, currentCharacterId, onLeaveRoom }) => {
  const [room, setRoom] = useState<PokerRoom | null>(null);
  const [players, setPlayers] = useState<PokerPlayer[]>([]);
  const [currentHand, setCurrentHand] = useState<PokerHand | null>(null);
  const [myCards, setMyCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raiseAmount, setRaiseAmount] = useState<string>('');
  const [lastAction, setLastAction] = useState<string>('');
  const [lastUpdateHash, setLastUpdateHash] = useState<string>('');
  const [pauseUpdates, setPauseUpdates] = useState<boolean>(false);

  // Ищем игрока либо по ID игрока, либо по ID персонажа
  const currentPlayer = players.find(p => p.id === currentPlayerId || p.character_id === currentPlayerId);
  const isMyTurn = currentHand && currentPlayer && currentHand.current_player_position === currentPlayer.seat_position;
  const isCreator = room && room.creator_id === currentCharacterId;
  const canStartGame = room && room.status === 'waiting' && isCreator && players.length >= 2;

  const fetchRoomData = useCallback(async (forceUpdate = false) => {
    if (pauseUpdates && !forceUpdate) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/poker/rooms/${roomId}`);
      const data = await response.json();
      
      if (response.ok) {
        // Создаем хеш для проверки изменений
        const currentDataHash = JSON.stringify({
          room: data.room,
          players: data.players?.map((p: any) => ({ 
            id: p.id, 
            chips: p.chips, 
            status: p.status 
          })),
          currentHand: data.currentHand ? {
            id: data.currentHand.id,
            round_stage: data.currentHand.round_stage,
            pot: data.currentHand.pot,
            current_bet: data.currentHand.current_bet,
            current_player_position: data.currentHand.current_player_position,
            community_cards: data.currentHand.community_cards
          } : null
        });
        
        // Обновляем только если данные изменились
        if (currentDataHash !== lastUpdateHash || forceUpdate) {
          setRoom(data.room);
          setPlayers(data.players);
          setCurrentHand(data.currentHand);
          setError(null);
          setLastUpdateHash(currentDataHash);
        }
      } else {
        setError(data.error || 'Ошибка загрузки данных комнаты');
      }
    } catch (error) {
      console.error('Failed to fetch room data:', error);
      setError('Ошибка соединения');
    }
  }, [roomId, lastUpdateHash, pauseUpdates]);

  const fetchMyCards = useCallback(async () => {
    if (!currentHand || !currentPlayer) return;
    
    try {
      // Используем ID игрока, а не персонажа
      const response = await fetch(`${API_URL}/poker/hands/${currentHand.id}/cards/${currentPlayer.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setMyCards(data.cards || []);
      } else {
        setError(data.error || 'Ошибка загрузки карт');
      }
    } catch (error) {
      console.error('Failed to fetch my cards:', error);
      setError('Ошибка загрузки карт');
    }
  }, [currentHand, currentPlayer]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData]);

  useEffect(() => {
    fetchMyCards();
  }, [fetchMyCards]);

  // Умное автообновление каждые 5 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      // Обновляем данные комнаты только если не идет активное действие
      fetchRoomData();
      
      // Карты обновляем только если это необходимо
      if (currentHand && currentPlayerId && !pauseUpdates) {
        fetchMyCards();
      }
    }, 5000); // Увеличили интервал до 5 секунд

    return () => clearInterval(interval);
  }, [fetchRoomData, fetchMyCards, currentHand, currentPlayerId, pauseUpdates]);

  const handleStartGame = async () => {
    if (!room) return;
    
    setLoading(true);
    setPauseUpdates(true); // Приостанавливаем автообновления
    
    try {
      const response = await fetch(`${API_URL}/poker/rooms/${room.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await fetchRoomData(true); // Принудительное обновление
        setLastAction('Игра началась!');
        setError(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка при запуске игры');
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
      setPauseUpdates(false); // Возобновляем автообновления
    }
  };

  const handleAction = async (action: string, amount?: number) => {
    if (!currentHand || !currentPlayer) return;
    
    setLoading(true);
    setPauseUpdates(true); // Приостанавливаем автообновления во время действия
    
    try {
      const body: any = {
        player_id: currentPlayer.id,
        action: action
      };
      
      if (amount !== undefined) {
        body.amount = amount;
      }

      const response = await fetch(`${API_URL}/poker/hands/${currentHand.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        await fetchRoomData(true); // Принудительное обновление
        setLastAction(`Действие: ${action}${amount ? ` (${amount})` : ''}`);
        setRaiseAmount('');
        setError(null); // Очищаем предыдущие ошибки
        
        // Автоматически убираем сообщение о последнем действии через 3 секунды
        setTimeout(() => setLastAction(''), 3000);
      } else {
        const data = await response.json();
        
        // Улучшенное отображение ошибок в зависимости от типа
        let errorMessage = data.error || 'Ошибка при выполнении действия';
        
        if (data.type === 'validation_error') {
          // Для ошибок валидации используем более дружелюбный тон
          if (data.error.includes('Недостаточно фишек')) {
            errorMessage = '💰 ' + data.error;
          } else if (data.error.includes('Минимальный рейз')) {
            errorMessage = '📈 ' + data.error;
          } else if (data.error.includes('Нельзя чекать')) {
            errorMessage = '❌ ' + data.error;
          } else if (data.error.includes('Нет ставки')) {
            errorMessage = 'ℹ️ ' + data.error;
          } else {
            errorMessage = '⚠️ ' + data.error;
          }
        } else if (data.type === 'server_error') {
          errorMessage = '🔧 Техническая ошибка. Попробуйте еще раз через несколько секунд.';
        }
        
        setError(errorMessage);
        
        // Автоматически убираем ошибку через 5 секунд
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
      setError('🌐 Ошибка соединения. Проверьте интернет-подключение.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
      setPauseUpdates(false); // Возобновляем автообновления
    }
  };

  const handleLeaveRoom = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/poker/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: currentCharacterId })
      });
      
      if (response.ok) {
        onLeaveRoom();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка при выходе из комнаты');
      }
    } catch (error) {
      console.error('Failed to leave room:', error);
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerStatusText = (player: PokerPlayer) => {
    switch (player.status) {
      case 'folded': return 'Сбросил';
      case 'eliminated': return 'Выбыл';
      case 'disconnected': return 'Отключен';
      default: return '';
    }
  };

  const getPlayerPosition = (player: PokerPlayer) => {
    if (!currentHand) return '';
    
    if (currentHand.dealer_position === player.seat_position) return 'D';
    if (currentHand.small_blind_position === player.seat_position) return 'SB';
    if (currentHand.big_blind_position === player.seat_position) return 'BB';
    return '';
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'preflop': return 'Префлоп';
      case 'flop': return 'Флоп';
      case 'turn': return 'Терн';
      case 'river': return 'Ривер';
      case 'showdown': return 'Вскрытие';
      case 'finished': return 'Завершена';
      default: return stage;
    }
  };

  if (!room) {
    return (
      <Panel id="poker-table">
        <PanelHeader before={<PanelHeaderBack onClick={onLeaveRoom} />}>
          🃏 Загрузка...
        </PanelHeader>
        <Div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spinner size="l" />
        </Div>
      </Panel>
    );
  }

  return (
    <Panel id="poker-table">
      <PanelHeader before={<PanelHeaderBack onClick={handleLeaveRoom} />}>
        🃏 {room.room_name}
      </PanelHeader>

      {error && (
        <Banner mode="tint">
          ❌ {error}
        </Banner>
      )}

      {lastAction && (
        <Banner mode="tint">
          ✅ {lastAction}
        </Banner>
      )}

      <Group header={<Cell>Информация о комнате</Cell>}>
        <Cell subtitle={`Buy-in: ${room.buy_in} 💰 • Блайнды: ${room.small_blind}/${room.big_blind}`}>
          Статус: {room.status === 'waiting' ? 'Ожидание игроков' : room.status === 'playing' ? 'Игра идёт' : 'Завершена'}
        </Cell>
        
        {canStartGame && (
          <Div>
            <Button size="l" stretched onClick={handleStartGame} disabled={loading}>
              Начать игру
            </Button>
          </Div>
        )}
      </Group>

      <Group header={<Cell>Игроки ({players.length}/{room.max_players})</Cell>}>
        {players.map(player => (
          <Cell
            key={player.id}
            before={player.id === currentPlayerId ? '👤' : getPlayerPosition(player)}
            subtitle={`${player.chips} 💰 ${getPlayerStatusText(player)}`}
            style={{
              backgroundColor: isMyTurn && currentHand && currentHand.current_player_position === player.seat_position 
                ? 'var(--vkui--color_background_accent_themed)' 
                : 'transparent',
              borderRadius: isMyTurn && currentHand && currentHand.current_player_position === player.seat_position ? '8px' : '0'
            }}
          >
            {player.character_name}
          </Cell>
        ))}
      </Group>

      {currentHand && (
        <>
          <Group header={<Cell>Текущая раздача #{currentHand.hand_number}</Cell>}>
            <Cell subtitle={`Стадия: ${getStageText(currentHand.round_stage)}`}>
              Банк: {currentHand.pot} 💰
            </Cell>
            
            {currentHand.current_bet > 0 && (
              <Cell>Текущая ставка: {currentHand.current_bet} 💰</Cell>
            )}
          </Group>

          <Group header={<Cell>Общие карты</Cell>}>
            <Div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              {currentHand.community_cards.length > 0 ? (
                currentHand.community_cards.map((card, index) => (
                  <PokerCard key={index} card={card} size="medium" />
                ))
              ) : (
                <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>
                  Общие карты пока не открыты
                </Text>
              )}
            </Div>
          </Group>

          <Group header={<Cell>Ваши карты</Cell>}>
            <Div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
              {myCards.length > 0 ? (
                myCards.map((card, index) => (
                  <PokerCard key={index} card={card} size="large" />
                ))
              ) : (
                <PokerCard isHidden size="large" />
              )}
            </Div>
          </Group>

          {isMyTurn && currentPlayer && currentPlayer.status === 'active' && (
            <Group header={<Cell>Ваш ход</Cell>}>
              <Div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <Button
                    size="m"
                    mode="secondary"
                    onClick={() => handleAction('fold')}
                    disabled={loading}
                  >
                    Сброс
                  </Button>
                  
                  {currentHand.current_bet === 0 ? (
                    <Button
                      size="m"
                      onClick={() => handleAction('check')}
                      disabled={loading}
                    >
                      Чек
                    </Button>
                  ) : (
                    <Button
                      size="m"
                      onClick={() => handleAction('call', currentHand.current_bet)}
                      disabled={loading}
                    >
                      Колл ({currentHand.current_bet} 💰)
                    </Button>
                  )}
                  
                  <Button
                    size="m"
                    mode="secondary"
                    onClick={() => handleAction('all_in')}
                    disabled={loading}
                  >
                    Олл-ин ({currentPlayer.chips} 💰)
                  </Button>
                </div>
                
                <FormItem top="Рейз">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Input
                      type="number"
                      value={raiseAmount}
                      onChange={(e) => setRaiseAmount(e.target.value)}
                      placeholder={`Мин: ${Math.max(currentHand.current_bet * 2, room.big_blind)}`}
                      min={Math.max(currentHand.current_bet * 2, room.big_blind)}
                      max={currentPlayer.chips}
                    />
                    <Button
                      size="m"
                      onClick={() => handleAction('raise', parseInt(raiseAmount))}
                      disabled={loading || !raiseAmount || parseInt(raiseAmount) < Math.max(currentHand.current_bet * 2, room.big_blind)}
                    >
                      Рейз
                    </Button>
                  </div>
                </FormItem>
              </Div>
            </Group>
          )}
        </>
      )}

      {loading && (
        <Div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spinner size="s" />
        </Div>
      )}

      <Div style={{ paddingBottom: '20px' }}>
        <Button
          size="l"
          stretched
          mode="secondary"
          onClick={handleLeaveRoom}
          disabled={loading && room?.status === 'waiting'}
        >
          Покинуть комнату
        </Button>
      </Div>
    </Panel>
  );
};