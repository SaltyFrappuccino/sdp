import React, { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Button, Card, Div, Text, Input, Select, Snackbar, ModalRoot, ModalPage, ModalPageHeader, PanelHeaderBack } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { Icon28GameOutline, Icon28Dice1Outline, Icon28Cards2Outline } from '@vkontakte/icons';
import { BlackjackGame } from '../components/BlackjackGame';
import { SlotsGame } from '../components/SlotsGame';
import { DiceGame } from '../components/DiceGame';

interface NavIdProps {
  id: string;
}

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface CasinoGame {
  id: number;
  game_type: string;
  bet_amount: number;
  win_amount: number;
  result: string;
  game_data: any;
  created_at: string;
}

interface CasinoPanelProps extends NavIdProps {
  fetchedUser?: any;
}

export const CasinoPanel: FC<CasinoPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>('100');
  const [dicePrediction] = useState<number>(1);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [gameHistory, setGameHistory] = useState<CasinoGame[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [fetchedUser]);

  const fetchCharacters = async () => {
    if (!fetchedUser) return;
    try {
      const response = await fetch(`${API_URL}/characters/by-vk/${fetchedUser.id}`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  };

  const fetchGameHistory = async (characterId: number) => {
    try {
      const response = await fetch(`${API_URL}/casino/history/${characterId}`);
      const data = await response.json();
      setGameHistory(data);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }
  };

  const showResultSnackbar = (message: string, _isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon28GameOutline />}
      >
        {message}
      </Snackbar>
    );
  };

  const playBlackjack = () => {
    if (!selectedCharacter || !betAmount) return;
    setActiveModal('blackjack');
  };

  const playSlots = () => {
    if (!selectedCharacter || !betAmount) return;
    setActiveModal('slots');
  };

  const playDice = () => {
    if (!selectedCharacter || !betAmount) return;
    setActiveModal('dice');
  };

  const handleGameStart = async (gameType: string) => {
    try {
      // Списываем ставку при начале игры
      const response = await fetch(`${API_URL}/casino/${gameType}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          bet_amount: parseInt(betAmount),
          ...(gameType === 'dice' && { prediction: dicePrediction })
        })
      });

      if (response.ok) {
        await fetchCharacters(); // Обновляем валюту
        showResultSnackbar(`Ставка ${parseInt(betAmount)} 💰 списана. Игра началась!`, true);
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка начала игры', false);
      }
    } catch (error) {
      console.error('Game start error:', error);
      showResultSnackbar('Ошибка при начале игры', false);
    }
  };

  const handleGameEnd = async (gameType: string, result: any) => {
    try {
      const response = await fetch(`${API_URL}/casino/${gameType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          bet_amount: parseInt(betAmount),
          result: result.result,
          winAmount: result.winAmount,
          gameData: result.gameData,
          ...(gameType === 'dice' && { prediction: dicePrediction })
        })
      });

      if (response.ok) {
        await response.json(); // Получаем ответ, но не используем
        await fetchCharacters(); // Обновляем валюту
        await fetchGameHistory(selectedCharacter!); // Обновляем историю
        const netChange = result.winAmount - parseInt(betAmount);
        showResultSnackbar(
          result.result === 'win' ? `Выигрыш! +${netChange} 💰 (чистый)` :
          result.result === 'push' ? `Ничья! 0 💰 (возврат ставки)` :
          `Проигрыш! -${parseInt(betAmount)} 💸`, 
          result.result !== 'lose'
        );
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка игры', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    }
    
    setActiveModal(null);
  };

  const selectedCharacterData = characters.find(c => c.id === selectedCharacter);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        🎰 Казино
      </PanelHeader>
      
      <Div>
        <Card>
          <Div>
            <Text weight="2" style={{ marginBottom: 16 }}>
              Выберите персонажа для игры
            </Text>
            <Select
              placeholder="Выберите персонажа"
              value={selectedCharacter?.toString() || ''}
              onChange={(e) => {
                const charId = parseInt(e.target.value);
                setSelectedCharacter(charId);
                if (charId) {
                  fetchGameHistory(charId);
                }
              }}
              options={characters.map(char => ({
                label: `${char.character_name} (${char.currency} 💰)`,
                value: char.id.toString()
              }))}
            />
          </Div>
        </Card>

        {selectedCharacterData && (
          <>
            <Card style={{ marginTop: 16 }}>
              <Div>
                <Text weight="2" style={{ marginBottom: 16 }}>
                  💰 Ставка
                </Text>
                <Input
                  type="number"
                  placeholder="Сумма ставки"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="1"
                  max={selectedCharacterData.currency}
                />
                <Text style={{ marginTop: 8, color: '#666' }}>
                  Доступно: {selectedCharacterData.currency} 💰
                </Text>
              </Div>
            </Card>

            {showHistory && gameHistory.length > 0 && (
              <Card style={{ marginTop: 16 }}>
                <Div>
                  <Text weight="2" style={{ marginBottom: 16 }}>
                    📈 История игр
                  </Text>
                  
                  {(() => {
                    const totalBet = gameHistory.reduce((sum, game) => sum + game.bet_amount, 0);
                    const totalWin = gameHistory.reduce((sum, game) => sum + game.win_amount, 0);
                    const netBalance = totalWin - totalBet;
                    const isProfit = netBalance > 0;
                    
                    return (
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: isProfit ? '#1a4f1a' : '#4f1a1a', 
                        borderRadius: '8px', 
                        marginBottom: '16px',
                        border: `2px solid ${isProfit ? '#28a745' : '#dc3545'}`
                      }}>
                        <Text weight="2" style={{ color: '#fff' }}>
                          💰 Общий баланс: {isProfit ? '+' : ''}{netBalance.toLocaleString()} 💰
                        </Text>
                        <div style={{ fontSize: '14px', color: '#ccc', marginTop: '4px' }}>
                          Поставлено: {totalBet.toLocaleString()} | Выиграно: {totalWin.toLocaleString()} | Игр: {gameHistory.length}
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {gameHistory.slice(0, 10).map((game, index) => {
                      const netChange = game.win_amount - game.bet_amount;
                      const isWin = netChange > 0;
                      const gameTypeEmoji = game.game_type === 'blackjack' ? '🃏' : 
                                           game.game_type === 'slots' ? '🎰' : '🎲';
                      
                      return (
                        <div key={game.id} style={{ 
                          padding: '8px 12px', 
                          marginBottom: '8px', 
                          backgroundColor: isWin ? '#1f4a1f' : '#4a1f1f',
                          borderRadius: '6px',
                          borderLeft: `4px solid ${isWin ? '#28a745' : '#dc3545'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <Text style={{ color: '#fff', fontSize: '14px' }}>
                                {gameTypeEmoji} {game.game_type === 'blackjack' ? 'Блэкджек' : 
                                                game.game_type === 'slots' ? 'Слоты' : 'Кости'}
                              </Text>
                              <div style={{ fontSize: '12px', color: '#ccc' }}>
                                Ставка: {game.bet_amount} | Выигрыш: {game.win_amount}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ 
                                color: isWin ? '#28a745' : '#dc3545', 
                                fontWeight: 'bold',
                                fontSize: '14px'
                              }}>
                                {isWin ? '+' : ''}{netChange}
                              </div>
                              <div style={{ fontSize: '11px', color: '#999' }}>
                                {new Date(game.created_at).toLocaleDateString('ru-RU', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {gameHistory.length > 10 && (
                    <Text style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: '8px' }}>
                      Показаны последние 10 игр из {gameHistory.length}
                    </Text>
                  )}
                </Div>
              </Card>
            )}

            <Card style={{ marginTop: 16 }}>
              <Div>
                <Text weight="2" style={{ marginBottom: 16 }}>
                  🎮 Игры
                </Text>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Button
                    size="l"
                    before={<Icon28Cards2Outline />}
                    onClick={playBlackjack}
                    disabled={!betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                  >
                    🃏 Блэкджек
                  </Button>
                  
                  <Button
                    size="l"
                    before={<Icon28GameOutline />}
                    onClick={playSlots}
                    disabled={!betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                  >
                    🎰 Слоты (777)
                  </Button>
                  
                  <Button
                    size="l"
                    before={<Icon28Dice1Outline />}
                    onClick={playDice}
                    disabled={!betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                  >
                    🎲 Кости
                  </Button>
                  
                  <Button
                    size="m"
                    mode="secondary"
                    onClick={() => setShowHistory(!showHistory)}
                    disabled={gameHistory.length === 0}
                  >
                    📈 {showHistory ? 'Скрыть историю' : 'Показать историю'} ({gameHistory.length})
                  </Button>
                </div>
              </Div>
            </Card>


            <Card style={{ marginTop: 16 }}>
              <Div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text weight="2">📊 История игр</Text>
                  <Button
                    size="s"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? 'Скрыть' : 'Показать'}
                  </Button>
                </div>
                
                {showHistory && (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {gameHistory.length === 0 ? (
                      <Text style={{ color: '#666' }}>История игр пуста</Text>
                    ) : (
                      gameHistory.map((game) => (
                        <div key={game.id} style={{ 
                          padding: 8, 
                          borderBottom: '1px solid #eee',
                          backgroundColor: game.result === 'win' ? '#f0f8f0' : game.result === 'lose' ? '#fff0f0' : '#fff8f0'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text weight="2">
                              {game.game_type === 'blackjack' ? '🃏' : 
                               game.game_type === 'slots' ? '🎰' : '🎲'} 
                              {game.game_type === 'blackjack' ? 'Блэкджек' : 
                               game.game_type === 'slots' ? 'Слоты' : 'Кости'}
                            </Text>
                            <Text style={{ color: game.result === 'win' ? 'green' : game.result === 'lose' ? 'red' : 'orange' }}>
                              {game.result === 'win' ? '+' : game.result === 'lose' ? '-' : '='}
                              {game.win_amount > 0 ? game.win_amount : game.bet_amount}
                            </Text>
                          </div>
                          <Text style={{ fontSize: 12, color: '#666' }}>
                            {new Date(game.created_at).toLocaleString()}
                          </Text>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Div>
            </Card>
          </>
        )}
      </Div>

      {snackbar}

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage 
          id="blackjack" 
          onClose={() => setActiveModal(null)}
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <ModalPageHeader style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text weight="2" style={{ color: '#fff' }}>🃏 Блэкджек</Text>
              <Button 
                size="s" 
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: '#444', color: '#fff' }}
              >
                ✕
              </Button>
            </div>
          </ModalPageHeader>
          {selectedCharacter && (
            <BlackjackGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameStart={() => handleGameStart('blackjack')}
              onGameEnd={(result) => handleGameEnd('blackjack', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>

        <ModalPage 
          id="slots" 
          onClose={() => setActiveModal(null)}
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <ModalPageHeader style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text weight="2" style={{ color: '#fff' }}>🎰 Слоты</Text>
              <Button 
                size="s" 
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: '#444', color: '#fff' }}
              >
                ✕
              </Button>
            </div>
          </ModalPageHeader>
          {selectedCharacter && (
            <SlotsGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameStart={() => handleGameStart('slots')}
              onGameEnd={(result) => handleGameEnd('slots', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>

        <ModalPage 
          id="dice" 
          onClose={() => setActiveModal(null)}
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <ModalPageHeader style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text weight="2" style={{ color: '#fff' }}>🎲 Кости</Text>
              <Button 
                size="s" 
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: '#444', color: '#fff' }}
              >
                ✕
              </Button>
            </div>
          </ModalPageHeader>
          {selectedCharacter && (
            <DiceGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameStart={() => handleGameStart('dice')}
              onGameEnd={(result) => handleGameEnd('dice', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>
      </ModalRoot>
    </Panel>
  );
};
