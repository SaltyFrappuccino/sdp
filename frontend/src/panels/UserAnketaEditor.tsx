import React, { useState, useEffect, ReactNode } from 'react';
import { useRouteNavigator, useParams } from '@vkontakte/vk-mini-apps-router';
import { UserInfo } from '@vkontakte/vk-bridge';
import { AnketaEditor } from './AnketaEditor';
import { API_URL } from '../api';

// Используем тот же тип, что и в AnketaEditor
interface CharacterData {
  id?: number;
  character_name: string;
  nickname: string;
  age: number | string;
  rank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
  faction: string;
  faction_position: string;
  home_island: string;
  appearance: { text: string };
  character_images: string[];
  personality: string;
  biography: string;
  archetypes: string[];
  attributes: { [key: string]: string };
  contracts: any[];
  inventory: any[];
  currency: number;
  admin_note: string;
  status: string;
  life_status: 'Жив' | 'Мёртв';
}

export const UserAnketaEditor: React.FC<{ 
  id: string; 
  setModal: (modal: ReactNode | null) => void; 
  fetchedUser?: UserInfo; 
}> = ({ id, setModal, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams();
  const characterId = params?.id;
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  useEffect(() => {
    if (characterId) {
      fetchCharacter();
    }
  }, [characterId]);

  const fetchCharacter = async () => {
    try {
      const response = await fetch(`${API_URL}/characters/${characterId}`);
      if (response.ok) {
        const data = await response.json();
        setCharacter(data);
      } else {
        throw new Error('Не удалось загрузить анкету');
      }
    } catch (error) {
      console.error('Failed to fetch character:', error);
      setSnackbar(
        <div style={{ color: 'red' }}>
          Не удалось загрузить анкету
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!character || !fetchedUser) return;

    try {
      const response = await fetch(`${API_URL}/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-vk-id': fetchedUser.id.toString(),
        },
        body: JSON.stringify(character),
      });

      if (response.ok) {
        const data = await response.json();
        setSnackbar(
          <div style={{ color: 'green' }}>
            {data.message || 'Запрос на изменение отправлен на рассмотрение!'}
          </div>
        );
        setTimeout(() => {
          routeNavigator.push('/my_anketas');
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при сохранении');
      }
    } catch (error) {
      console.error('Failed to save character:', error);
      setSnackbar(
        <div style={{ color: 'red' }}>
          {error instanceof Error ? error.message : 'Ошибка при сохранении'}
        </div>
      );
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!character) {
    return <div>Анкета не найдена</div>;
  }

  return (
    <AnketaEditor
      id={id}
      setModal={setModal}
      fetchedUser={fetchedUser}
      isAdminEditor={false}
      character={character}
      onCharacterChange={(newCharacter) => setCharacter(newCharacter)}
      onSave={handleSave}
      snackbar={snackbar}
    />
  );
};
