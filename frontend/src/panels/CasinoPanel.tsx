import React, { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Button, Card, Div, Text, Input, Select, Snackbar } from '@vkontakte/vkui';
import { Icon28GameOutline, Icon28Dice1Outline, Icon28Cards2Outline } from '@vkontakte/icons';

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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>('100');
  const [dicePrediction, setDicePrediction] = useState<number>(1);
  const [gameResult, setGameResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [gameHistory, setGameHistory] = useState<CasinoGame[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/characters/by-vk/${fetchedUser?.id}`);
      const data = await response.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  };

  const fetchGameHistory = async (characterId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/casino/history/${characterId}`);
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

  const playBlackjack = async () => {
    if (!selectedCharacter || !betAmount) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/casino/blackjack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          bet_amount: parseInt(betAmount)
        })
      });

      const result = await response.json();
      if (response.ok) {
        setGameResult(result);
        await fetchCharacters(); // Обновляем валюту
        showResultSnackbar(
          result.result === 'win' ? `Выигрыш! +${result.winAmount} 💰` :
          result.result === 'push' ? `Ничья! Возврат ${result.winAmount} 💰` :
          `Проигрыш! -${betAmount} 💸`, 
          result.result !== 'lose'
        );
      } else {
        showResultSnackbar(result.error || 'Ошибка игры', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const playSlots = async () => {
    if (!selectedCharacter || !betAmount) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/casino/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          bet_amount: parseInt(betAmount)
        })
      });

      const result = await response.json();
      if (response.ok) {
        setGameResult(result);
        await fetchCharacters();
        showResultSnackbar(
          result.result === 'win' ? `Выигрыш! +${result.winAmount} 💰` : `Проигрыш! -${betAmount} 💸`, 
          result.result === 'win'
        );
      } else {
        showResultSnackbar(result.error || 'Ошибка игры', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const playDice = async () => {
    if (!selectedCharacter || !betAmount) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/casino/dice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          bet_amount: parseInt(betAmount),
          prediction: dicePrediction
        })
      });

      const result = await response.json();
      if (response.ok) {
        setGameResult(result);
        await fetchCharacters();
        showResultSnackbar(
          result.result === 'win' ? `Выигрыш! +${result.winAmount} 💰` : `Проигрыш! -${betAmount} 💸`, 
          result.result === 'win'
        );
      } else {
        showResultSnackbar(result.error || 'Ошибка игры', false);
      }
    } catch (error) {
      showResultSnackbar('Ошибка соединения', false);
    } finally {
      setLoading(false);
    }
  };

  const selectedCharacterData = characters.find(c => c.id === selectedCharacter);

  return (
    <Panel id={id}>
      <PanelHeader>🎰 Казино</PanelHeader>
      
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
                    disabled={loading || !betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                    loading={loading}
                  >
                    🃏 Блэкджек
                  </Button>
                  
                  <Button
                    size="l"
                    before={<Icon28GameOutline />}
                    onClick={playSlots}
                    disabled={loading || !betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                    loading={loading}
                  >
                    🎰 Слоты (777)
                  </Button>
                  
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button
                      size="l"
                      before={<Icon28Dice1Outline />}
                      onClick={playDice}
                      disabled={loading || !betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                      loading={loading}
                      style={{ flex: 1 }}
                    >
                      🎲 Кости
                    </Button>
                    <Select
                      value={dicePrediction.toString()}
                      onChange={(e) => setDicePrediction(parseInt(e.target.value))}
                      options={[1,2,3,4,5,6].map(num => ({
                        label: num.toString(),
                        value: num.toString()
                      }))}
                      style={{ width: 60 }}
                    />
                  </div>
                </div>
              </Div>
            </Card>

            {gameResult && (
              <Card style={{ marginTop: 16, backgroundColor: gameResult.result === 'win' ? '#e8f5e8' : gameResult.result === 'lose' ? '#ffeaea' : '#fff3cd' }}>
                <Div>
                  <Text weight="2" style={{ marginBottom: 8 }}>
                    {gameResult.result === 'win' ? '🎉 Поздравляем!' : 
                     gameResult.result === 'lose' ? '😔 Не повезло' : '🤝 Ничья'}
                  </Text>
                  
                  {gameResult.gameData && (
                    <div style={{ marginBottom: 8 }}>
                      {gameResult.game_type === 'blackjack' && (
                        <Text>
                          Ваши карты: {gameResult.gameData.playerCards.join(', ')} ({gameResult.gameData.playerValue})<br/>
                          Карты дилера: {gameResult.gameData.dealerCards.join(', ')} ({gameResult.gameData.dealerValue})
                        </Text>
                      )}
                      {gameResult.game_type === 'slots' && (
                        <Text>
                          Результат: {gameResult.gameData.reels.join(' | ')}
                        </Text>
                      )}
                      {gameResult.game_type === 'dice' && (
                        <Text>
                          Кости: {gameResult.gameData.dice1} + {gameResult.gameData.dice2} = {gameResult.gameData.total}<br/>
                          Предсказание: {gameResult.gameData.prediction * 2}
                        </Text>
                      )}
                    </div>
                  )}
                  
                  <Text>
                    Ставка: {gameResult.bet_amount} 💰<br/>
                    {gameResult.win_amount > 0 && `Выигрыш: ${gameResult.win_amount} 💰`}<br/>
                    Новый баланс: {gameResult.newCurrency} 💰
                  </Text>
                </Div>
              </Card>
            )}

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
    </Panel>
  );
};
