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

export const AdminLogin: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [password, setPassword] = useState('');
  const [popout, setPopout] = useState<ReactNode | null>(null);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const handleLogin = async () => {
    setPopout(<ScreenSpinner />);
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/admin/login`, {
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
        routeNavigator.push('admin_panel');
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