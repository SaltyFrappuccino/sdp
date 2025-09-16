import React, { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Button, Card, Div, Text, Input, Select, Snackbar, ModalRoot, ModalPage, ModalPageHeader, PanelHeaderBack } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { Icon28GameOutline, Icon28Dice1Outline, Icon28Cards2Outline } from '@vkontakte/icons';
import { BlackjackGame } from '../components/BlackjackGame';
import { SlotsGame } from '../components/SlotsGame';
import { DiceGame } from '../components/DiceGame';
import { RouletteGame } from '../components/RouletteGame';
import { HorseRacingGame } from '../components/HorseRacingGame';

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

  const playRoulette = () => {
    if (!selectedCharacter || !betAmount) return;
    setActiveModal('roulette');
  };

  const playHorseRacing = () => {
    if (!selectedCharacter || !betAmount) return;
    setActiveModal('horseracing');
  };

  const handleGameStart = async (gameType: string) => {
    if (!selectedCharacter) return;
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
    if (!selectedCharacter) return;
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
                    size="l"
                    onClick={playRoulette}
                    disabled={!betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                  >
                    🎰 Рулетка
                  </Button>

                  <Button
                    size="l"
                    onClick={playHorseRacing}
                    disabled={!betAmount || parseInt(betAmount) > selectedCharacterData.currency}
                  >
                    🐎 Скачки
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

        <ModalPage 
          id="roulette" 
          onClose={() => setActiveModal(null)}
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <ModalPageHeader style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text weight="2" style={{ color: '#fff' }}>🎰 Рулетка</Text>
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
            <RouletteGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameStart={() => handleGameStart('roulette')}
              onGameEnd={(result) => handleGameEnd('roulette', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>

        <ModalPage 
          id="horseracing" 
          onClose={() => setActiveModal(null)}
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <ModalPageHeader style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text weight="2" style={{ color: '#fff' }}>🐎 Скачки</Text>
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
            <HorseRacingGame
              characterId={selectedCharacter}
              betAmount={parseInt(betAmount)}
              onGameStart={() => handleGameStart('horseracing')}
              onGameEnd={(result) => handleGameEnd('horseracing', result)}
              onClose={() => setActiveModal(null)}
            />
          )}
        </ModalPage>
      </ModalRoot>
    </Panel>
  );
};
