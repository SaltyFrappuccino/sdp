import {
  Panel,
  PanelHeader,
  NavIdProps,
  Group,
  FormItem,
  Input,
  Button,
  Div,
  Snackbar,
  ScreenSpinner,
  PanelHeaderBack
} from '@vkontakte/vkui';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { FC, useState, ReactNode } from 'react';
import { Icon24ErrorCircle } from '@vkontakte/icons';
import { API_URL } from '../api';

export const AdminLogin: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [password, setPassword] = useState('');
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const handleLogin = async () => {
    setPopout(<ScreenSpinner />);
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      setPopout(null);

      if (data.success) {
        localStorage.setItem('adminId', data.adminId);
        routeNavigator.replace('/admin_panel');
      } else {
        throw new Error(data.error || 'Неверный пароль');
      }
    } catch (error) {
      setPopout(null);
      const errorMessage = error instanceof Error ? error.message : 'Сетевая ошибка';
      setSnackbar(
        <Snackbar
          onClose={() => setSnackbar(null)}
          before={<Icon24ErrorCircle fill="var(--vkui--color_icon_negative)" />}
        >
          {errorMessage}
        </Snackbar>
      );
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Вход для администратора
      </PanelHeader>
      <Group>
        <FormItem top="Пароль">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormItem>
        <Div>
          <Button size="l" stretched onClick={handleLogin}>
            Войти
          </Button>
        </Div>
      </Group>
      {snackbar}
      {popout}
    </Panel>
  );
};