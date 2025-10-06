import React, { useState } from 'react';
import {
  Panel,
  PanelHeader,
  PanelHeaderBack,
  Group,
  FormLayoutGroup,
  FormItem,
  Input,
  Textarea,
  Button,
  ScreenSpinner,
  Snackbar,
  NavIdProps,
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { API_URL } from '../api';
import { Icon28CheckCircleOutline } from '@vkontakte/icons';

export const FactionsCreate: React.FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<React.ReactNode | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) {
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>Название и описание не могут быть пустыми.</Snackbar>);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/factions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Произошла ошибка');
      }

      setSnackbar(
        <Snackbar
          before={<Icon28CheckCircleOutline />}
          onClose={() => setSnackbar(null)}
        >
          Фракция отправлена на рассмотрение!
        </Snackbar>
      );
      setName('');
      setDescription('');
    } catch (error: any) {
      console.error('Error creating faction:', error);
      setSnackbar(<Snackbar onClose={() => setSnackbar(null)}>{error.message}</Snackbar>);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Создать фракцию
      </PanelHeader>

      {loading && <ScreenSpinner />}

      <Group>
        <FormLayoutGroup onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSubmit(); }}>
          <FormItem top="Название фракции" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormItem>
          <FormItem top="Описание" required>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormItem>
          <FormItem>
            <Button size="l" stretched onClick={handleSubmit} disabled={loading}>
              Отправить на рассмотрение
            </Button>
          </FormItem>
        </FormLayoutGroup>
      </Group>

      {snackbar}
    </Panel>
  );
};
