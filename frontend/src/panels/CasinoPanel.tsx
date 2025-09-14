import React, { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Button, Card, Div, Text, Input, Select, Snackbar, ModalRoot, ModalPage, ModalPageHeader } from '@vkontakte/vkui';
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

  const handleGameEnd = async (gameType: string, result: any) => {
    try {
      const response = await fetch(`${API_URL}/casino/${gameType}`, {
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
        await fetchGameHistory(selectedCharacter!); // Обновляем историю
        showResultSnackbar(
          result.result === 'win' ? `Выигрыш! +${result.winAmount} 💰` :
          result.result === 'push' ? `Ничья! Возврат ${result.winAmount} 💰` :
          `Проигрыш! -${betAmount} 💸`, 
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
        <ModalPage id="blackjack" onClose={() => setActiveModal(null)}>
          <ModalPageHeader>
            <Button onClick={() => setActiveModal(null)}>✕</Button>
          </ModalPageHeader>
          {selectedCharacter && (
            <BlackjackGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameEnd={(result) => handleGameEnd('blackjack', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>

        <ModalPage id="slots" onClose={() => setActiveModal(null)}>
          <ModalPageHeader>
            <Button onClick={() => setActiveModal(null)}>✕</Button>
          </ModalPageHeader>
          {selectedCharacter && (
            <SlotsGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameEnd={(result) => handleGameEnd('slots', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>

        <ModalPage id="dice" onClose={() => setActiveModal(null)}>
          <ModalPageHeader>
            <Button onClick={() => setActiveModal(null)}>✕</Button>
          </ModalPageHeader>
          {selectedCharacter && (
            <DiceGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameEnd={(result) => handleGameEnd('dice', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>
      </ModalRoot>
    </Panel>
  );
};
