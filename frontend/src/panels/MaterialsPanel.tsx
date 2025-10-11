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
import MaterialsInventory from '../components/MaterialsInventory';

interface NavIdProps {
  id: string;
  fetchedUser?: any;
}

const MaterialsPanel: React.FC<NavIdProps> = ({ id, fetchedUser }) => {
  const routeNavigator = useRouteNavigator();
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharacter();
  }, []);

  const loadCharacter = async () => {
    if (!fetchedUser?.id) return;
    
    try {
      const response = await fetch(`${API_URL}/my-anketas/${fetchedUser.id}`);
      const data = await response.json();
      
      const acceptedChars = data.filter((char: any) => 
        char.status === 'Принято' && 
        (char.life_status === 'Жив' || char.life_status === 'Жива')
      );
      
      if (acceptedChars.length > 0) {
        setCharacterId(acceptedChars[0].id);
      }
    } catch (error) {
      console.error('Ошибка загрузки персонажа:', error);
    }
    setLoading(false);
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        📦 Материалы
      </PanelHeader>

      {loading ? (
        <Div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Spinner size="l" />
        </Div>
      ) : characterId ? (
        <MaterialsInventory characterId={characterId} />
      ) : (
        <Div style={{ textAlign: 'center', padding: 32 }}>
          Персонаж не найден
        </Div>
      )}
    </Panel>
  );
};

export default MaterialsPanel;

