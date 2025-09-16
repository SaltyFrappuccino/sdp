import React, { FC, useState, useEffect } from 'react';
import { Panel, PanelHeader, Button, Card, Div, Text, Input, Select, Snackbar, ModalRoot, ModalPage, ModalPageHeader, PanelHeaderBack, Group, Header, SimpleCell } from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { Icon28GameOutline, Icon28Users3Outline, Icon28AddOutline } from '@vkontakte/icons';
import { PokerTable } from '../components/PokerTable';

interface NavIdProps {
  id: string;
}

interface Character {
  id: number;
  character_name: string;
  currency: number;
}

interface PokerRoom {
  id: number;
  room_name: string;
  creator_id: number;
  creator_name: string;
  current_players: number;
  max_players: number;
  buy_in: number;
  small_blind: number;
  big_blind: number;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
}

interface PokerPanelProps extends NavIdProps {
  fetchedUser?: any;
}

export const PokerPanel: FC<PokerPanelProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [pokerRooms, setPokerRooms] = useState<PokerRoom[]>([]);
  const [snackbar, setSnackbar] = useState<React.ReactNode>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Состояние для игрового стола
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
  const [showTable, setShowTable] = useState<boolean>(false);
  
  // Состояние для создания комнаты
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomBuyIn, setNewRoomBuyIn] = useState<string>('1000');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState<string>('6');

  useEffect(() => {
    fetchCharacters();
    fetchPokerRooms();
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

  const fetchPokerRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/poker/rooms`);
      const data = await response.json();
      setPokerRooms(data);
    } catch (error) {
      console.error('Failed to fetch poker rooms:', error);
    }
  };

  const showResultSnackbar = (message: string, isSuccess: boolean) => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={<Icon28GameOutline />}
      >
        {message}
      </Snackbar>
    );
  };

  const createRoom = async () => {
    if (!selectedCharacter || !newRoomName.trim() || !newRoomBuyIn) {
      showResultSnackbar('Заполните все поля', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/poker/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter,
          room_name: newRoomName.trim(),
          buy_in: parseInt(newRoomBuyIn),
          max_players: parseInt(newRoomMaxPlayers)
        })
      });

      if (response.ok) {
        const data = await response.json();
        showResultSnackbar('Комната создана! Переход в комнату...', true);
        
        // Автоматически входим в созданную комнату
        if (data.room_id) {
          setCurrentRoomId(data.room_id);
          setCurrentPlayerId(selectedCharacter);
          setShowTable(true);
        }
        
        setActiveModal(null);
        setNewRoomName('');
        setNewRoomBuyIn('1000');
        setNewRoomMaxPlayers('6');
        await fetchCharacters();
        await fetchPokerRooms();
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка создания комнаты', false);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const deleteRoom = async (roomId: number) => {
    if (!selectedCharacter) {
      showResultSnackbar('Сначала выберите персонажа', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/poker/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter
        })
      });

      if (response.ok) {
        showResultSnackbar('Комната успешно удалена', true);
        await fetchPokerRooms();
        await fetchCharacters(); // Обновляем баланс после возврата buy-in
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка удаления комнаты', false);
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const joinRoom = async (roomId: number) => {
    if (!selectedCharacter) {
      showResultSnackbar('Выберите персонажа', false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/poker/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: selectedCharacter
        })
      });

      if (response.ok) {
        const data = await response.json();
        showResultSnackbar('Успешно присоединились к комнате!', true);
        
        // Получаем ID игрока в этой комнате
        const roomResponse = await fetch(`${API_URL}/poker/rooms/${roomId}`);
        const roomData = await roomResponse.json();
        const player = roomData.players.find((p: any) => p.character_id === selectedCharacter);
        
        if (player) {
          setCurrentRoomId(roomId);
          setCurrentPlayerId(player.id);
          setShowTable(true);
        }
        
        await fetchCharacters();
        await fetchPokerRooms();
      } else {
        const errorData = await response.json();
        showResultSnackbar(errorData.error || 'Ошибка присоединения', false);
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      showResultSnackbar('Ошибка соединения', false);
    }
  };

  const leaveTable = () => {
    setShowTable(false);
    setCurrentRoomId(null);
    setCurrentPlayerId(null);
    fetchCharacters();
    fetchPokerRooms();
  };

  const selectedCharacterData = characters.find(c => c.id === selectedCharacter);

  // Если показываем игровой стол
  if (showTable && currentRoomId && currentPlayerId && selectedCharacter) {
    return (
      <PokerTable
        roomId={currentRoomId}
        currentPlayerId={currentPlayerId}
        currentCharacterId={selectedCharacter}
        onLeaveRoom={leaveTable}
      />
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        🃏 Покер
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
              onChange={(e) => setSelectedCharacter(parseInt(e.target.value))}
              options={characters.map(char => ({
                label: `${char.character_name} (${char.currency} 💰)`,
                value: char.id.toString()
              }))}
            />
          </Div>
        </Card>

        {selectedCharacterData && (
          <Card style={{ marginTop: 16 }}>
            <Div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text weight="2">🎮 Покерные комнаты</Text>
                <Button
                  size="s"
                  before={<Icon28AddOutline />}
                  onClick={() => setActiveModal('create-room')}
                >
                  Создать комнату
                </Button>
              </div>
              
              {pokerRooms.length === 0 ? (
                <Text style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                  Пока нет активных комнат. Создайте первую!
                </Text>
              ) : (
                pokerRooms.map((room) => (
                  <Card key={room.id} style={{ marginBottom: 12, backgroundColor: '#333' }}>
                    <Div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text weight="2" style={{ color: '#fff' }}>{room.room_name}</Text>
                          <Text style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>
                            {room.creator_name} • Buy-in: {room.buy_in} 💰 • Блайнды: {room.small_blind}/{room.big_blind}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>
                            Игроки: {room.current_players}/{room.max_players} • {room.status === 'waiting' ? 'Ожидание' : 'Идет игра'}
                          </Text>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {room.creator_id === selectedCharacter && room.status === 'waiting' && (
                            <Button
                              size="s"
                              mode="secondary"
                              onClick={() => deleteRoom(room.id)}
                              style={{ backgroundColor: '#ff5c5c', color: '#fff' }}
                            >
                              Удалить
                            </Button>
                          )}
                          <Button
                            size="s"
                            onClick={() => joinRoom(room.id)}
                            disabled={room.current_players >= room.max_players || room.status !== 'waiting'}
                          >
                            {room.status === 'waiting' ? 'Войти' : 'Игра идёт'}
                          </Button>
                        </div>
                      </div>
                    </Div>
                  </Card>
                ))
              )}
            </Div>
          </Card>
        )}
      </Div>

      {snackbar}

      <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
        <ModalPage 
          id="create-room" 
          onClose={() => setActiveModal(null)}
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <ModalPageHeader style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text weight="2" style={{ color: '#fff' }}>🃏 Создать покерную комнату</Text>
              <Button 
                size="s" 
                onClick={() => setActiveModal(null)}
                style={{ backgroundColor: '#444', color: '#fff' }}
              >
                ✕
              </Button>
            </div>
          </ModalPageHeader>
          
          <Card style={{ backgroundColor: '#2a2a2a', border: 'none' }}>
            <Div style={{ backgroundColor: '#2a2a2a' }}>
              <div style={{ marginBottom: 16 }}>
                <Text weight="2" style={{ marginBottom: 8, color: '#fff' }}>Название комнаты</Text>
                <Input
                  placeholder="Введите название комнаты"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text weight="2" style={{ marginBottom: 8, color: '#fff' }}>Buy-in (стоимость входа)</Text>
                <Input
                  type="number"
                  placeholder="1000"
                  value={newRoomBuyIn}
                  onChange={(e) => setNewRoomBuyIn(e.target.value)}
                  min="100"
                  max={selectedCharacterData?.currency}
                />
                <Text style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>
                  Доступно: {selectedCharacterData?.currency} 💰
                </Text>
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <Text weight="2" style={{ marginBottom: 8, color: '#fff' }}>Максимум игроков</Text>
                <Select
                  value={newRoomMaxPlayers}
                  onChange={(e) => setNewRoomMaxPlayers(e.target.value)}
                  options={[
                    { label: '2 игрока', value: '2' },
                    { label: '3 игрока', value: '3' },
                    { label: '4 игрока', value: '4' },
                    { label: '5 игроков', value: '5' },
                    { label: '6 игроков', value: '6' }
                  ]}
                />
              </div>

              <div style={{ 
                padding: '12px', 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                borderRadius: '8px', 
                marginBottom: '16px' 
              }}>
                <Text style={{ fontSize: 12, color: '#ccc' }}>
                  📝 Блайнды будут установлены автоматически:<br/>
                  Малый блайнд: {Math.floor(parseInt(newRoomBuyIn || '1000') / 200)} 💰<br/>
                  Большой блайнд: {Math.floor(parseInt(newRoomBuyIn || '1000') / 100)} 💰
                </Text>
              </div>
              
              <Button
                size="l"
                onClick={createRoom}
                style={{ backgroundColor: '#4caf50', color: '#fff' }}
                stretched
              >
                Создать комнату
              </Button>
            </Div>
          </Card>
        </ModalPage>
      </ModalRoot>
    </Panel>
  );
};
