import React, { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Div,
  Spinner
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import CraftingStation from '../components/CraftingStation';

interface NavIdProps {
  id: string;
  fetchedUser?: any;
}

const CraftingPanel: React.FC<NavIdProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [characterRank, setCharacterRank] = useState<string>('F');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharacter();
  }, []);

  const loadCharacter = async () => {
    if (!fetchedUser?.id) return;
    
    try {
      const response = await fetch(`${API_URL}/characters/user/${fetchedUser.id}`);
      const data = await response.json();
      
      if (data.success && data.characters.length > 0) {
        const char = data.characters[0];
        setCharacterId(char.id);
        setCharacterRank(char.rank || 'F');
      }
    } catch (error) {
      console.error('Ошибка загрузки персонажа:', error);
    }
    setLoading(false);
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        🔨 Крафт
      </PanelHeader>

      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="l" />
        </Div>
      ) : characterId ? (
        <CraftingStation characterId={characterId} characterRank={characterRank} />
      ) : (
        <Div style={{ textAlign: 'center', padding: 32 }}>
          Персонаж не найден
        </Div>
      )}
    </Panel>
  );
};

export default CraftingPanel;

