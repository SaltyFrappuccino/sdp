import { FC, useState, useEffect } from 'react';
import {
  FormItem,
  Select,
  Button,
  Group,
  Header,
  Text,
  Div,
  Spinner
} from '@vkontakte/vkui';
import { API_URL } from '../api';

interface Character {
  id: number;
  character_name: string;
  nickname: string;
  rank: string;
  faction: string;
  vk_id: number;
}

interface ActivityRequestFormProps {
  vkId?: number;
  onRequestCreated: () => void;
  onCancel: () => void;
}

const rankOptions = [
  { label: 'F', value: 'F' },
  { label: 'E', value: 'E' },
  { label: 'D', value: 'D' },
  { label: 'C', value: 'C' },
  { label: 'B', value: 'B' },
  { label: 'A', value: 'A' },
  { label: 'S', value: 'S' },
  { label: 'SS', value: 'SS' },
  { label: 'SSS', value: 'SSS' },
];

export const ActivityRequestForm: FC<ActivityRequestFormProps> = ({ vkId, onRequestCreated, onCancel }) => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [requestType, setRequestType] = useState<'quest' | 'gate'>('quest');
  const [questRank, setQuestRank] = useState('');
  const [gateRank, setGateRank] = useState('');
  const [teamMembers, setTeamMembers] = useState<number[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Character[]>([]);
  const [currentRank, setCurrentRank] = useState('');
  const [targetRank, setTargetRank] = useState('');
  const [loading, setLoading] = useState(false);
  const [charactersLoading, setCharactersLoading] = useState(true);

  useEffect(() => {
    fetchCharacters();
  }, [vkId]);

  const fetchCharacters = async () => {
    if (!vkId) {
      console.error('VK ID is not available');
      setMyCharacters([]);
      setAllCharacters([]);
      return;
    }

    try {
      setCharactersLoading(true);
      
      // Получаем своих персонажей для выбора персонажа заявки
      const myResponse = await fetch(`${API_URL}/my-anketas/${vkId}`);
      if (myResponse.ok) {
        const myData = await myResponse.json();
        const acceptedMyCharacters = Array.isArray(myData) 
          ? myData.filter((char: any) => char.status === 'Принято' && (char.life_status === 'Жив' || char.life_status === 'Жива'))
          : [];
        setMyCharacters(acceptedMyCharacters);
      }

      // Получаем всех персонажей для выбора команды
      const allResponse = await fetch(`${API_URL}/characters?status=Принято&rank=&faction=&home_island=`);
      if (allResponse.ok) {
        const allData = await allResponse.json();
        setAllCharacters(Array.isArray(allData) ? allData : []);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      setMyCharacters([]);
      setAllCharacters([]);
    } finally {
      setCharactersLoading(false);
    }
  };

  const handleCharacterSelect = (characterId: string) => {
    const character = Array.isArray(myCharacters) ? myCharacters.find(c => c.id === parseInt(characterId)) : null;
    setSelectedCharacter(character || null);
    
    // Автоматически устанавливаем текущий ранг персонажа
    if (character) {
      setCurrentRank(character.rank);
    }
  };

  const handleTeamMemberToggle = (character: Character) => {
    const isSelected = selectedTeamMembers.some(member => member.id === character.id);
    
    if (isSelected) {
      setSelectedTeamMembers(prev => prev.filter(member => member.id !== character.id));
      setTeamMembers(prev => prev.filter(id => id !== character.id));
    } else {
      setSelectedTeamMembers(prev => [...prev, character]);
      setTeamMembers(prev => [...prev, character.id]);
    }
  };

  const removeTeamMember = (characterId: number) => {
    setSelectedTeamMembers(prev => prev.filter(member => member.id !== characterId));
    setTeamMembers(prev => prev.filter(id => id !== characterId));
  };

  const handleSubmit = async () => {
    if (!selectedCharacter) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/activity-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character_id: selectedCharacter.id,
          vk_id: selectedCharacter.vk_id,
          request_type: requestType,
          quest_rank: requestType === 'quest' ? questRank : null,
          gate_rank: requestType === 'gate' ? gateRank : null,
          character_rank: selectedCharacter.rank,
          faction: selectedCharacter.faction,
          team_members: teamMembers,
          rank_promotion: currentRank && targetRank ? `Повышение Ранга ${currentRank} -> ${targetRank}` : null,
        }),
      });

      if (response.ok) {
        onRequestCreated();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create activity request:', error);
      alert('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Group>
      <Header>Создать заявку на активность</Header>
      
      <FormItem top="Выберите персонажа">
        {charactersLoading ? (
          <Spinner />
        ) : (
          <Select
            placeholder="Выберите персонажа"
            value={selectedCharacter?.id.toString() || ''}
            onChange={(e) => handleCharacterSelect(e.target.value)}
            options={Array.isArray(myCharacters) ? myCharacters.map(char => ({
              label: `${char.character_name}${char.nickname ? ` (${char.nickname})` : ''} - ${char.rank} ${char.faction}`,
              value: char.id.toString()
            })) : []}
          />
        )}
      </FormItem>

      {selectedCharacter && (
        <>
          <FormItem top="Тип активности">
            <Select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as 'quest' | 'gate')}
              options={[
                { label: 'Квест', value: 'quest' },
                { label: 'Врата', value: 'gate' }
              ]}
            />
          </FormItem>

          {requestType === 'quest' && (
            <FormItem top="Ранг квеста">
              <Select
                value={questRank}
                onChange={(e) => setQuestRank(e.target.value)}
                options={rankOptions}
              />
            </FormItem>
          )}

          {requestType === 'gate' && (
            <FormItem top="Ранг врат">
              <Select
                value={gateRank}
                onChange={(e) => setGateRank(e.target.value)}
                options={rankOptions}
              />
            </FormItem>
          )}

          <FormItem top="Команда">
            <Text style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
              Выберите участников команды (опционально):
            </Text>
            
            {/* Выбранные участники команды */}
            {selectedTeamMembers.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <Text style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
                  Выбранные участники:
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedTeamMembers.map(member => (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        backgroundColor: 'var(--vkui--color_background_secondary)',
                        borderRadius: '16px',
                        fontSize: '12px'
                      }}
                    >
                      <span>{member.character_name} - {member.rank}</span>
                      <button
                        onClick={() => removeTeamMember(member.id)}
                        style={{
                          marginLeft: '4px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--vkui--color_text_secondary)',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Список доступных персонажей */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--vkui--color_field_border)', borderRadius: '8px', padding: '8px' }}>
              {Array.isArray(allCharacters) ? allCharacters
                .filter(char => char.id !== selectedCharacter.id && !selectedTeamMembers.some(member => member.id === char.id))
                .map(char => (
                  <div
                    key={char.id}
                    onClick={() => handleTeamMemberToggle(char)}
                    style={{
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      backgroundColor: 'var(--vkui--color_background_secondary)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--vkui--color_background_tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--vkui--color_background_secondary)';
                    }}
                  >
                    <Text style={{ fontSize: '14px' }}>
                      {char.character_name} - {char.rank} {char.faction}
                    </Text>
                  </div>
                )) : []}
            </div>
          </FormItem>

          <FormItem top="Повышение ранга (опционально)">
            <Text style={{ marginBottom: '8px', color: 'var(--vkui--color_text_secondary)' }}>
              Если хотите повысить ранг персонажа, выберите текущий и целевой ранги:
            </Text>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--vkui--color_text_secondary)' }}>
                  Текущий ранг:
                </Text>
                <Select
                  placeholder="Выберите текущий ранг"
                  value={currentRank}
                  onChange={(e) => setCurrentRank(e.target.value)}
                  options={rankOptions}
                />
              </div>
              <Text style={{ fontSize: '16px', color: 'var(--vkui--color_text_secondary)' }}>→</Text>
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--vkui--color_text_secondary)' }}>
                  Целевой ранг:
                </Text>
                <Select
                  placeholder="Выберите целевой ранг"
                  value={targetRank}
                  onChange={(e) => setTargetRank(e.target.value)}
                  options={rankOptions}
                />
              </div>
            </div>
            {currentRank && targetRank && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px', 
                backgroundColor: 'var(--vkui--color_background_accent)', 
                borderRadius: '8px',
                border: '1px solid var(--vkui--color_field_border)'
              }}>
                <Text style={{ fontSize: '14px', color: 'var(--vkui--color_text_accent)' }}>
                  🎯 Повышение Ранга {currentRank} → {targetRank}
                </Text>
              </div>
            )}
          </FormItem>

          <Div>
            <Button 
              size="l" 
              stretched 
              onClick={handleSubmit}
              disabled={loading || (requestType === 'quest' && !questRank) || (requestType === 'gate' && !gateRank)}
            >
              {loading ? 'Создание...' : 'Создать заявку'}
            </Button>
            <Button 
              size="l" 
              mode="secondary" 
              stretched 
              onClick={onCancel}
              style={{ marginTop: '8px' }}
            >
              Отмена
            </Button>
          </Div>
        </>
      )}
    </Group>
  );
};
