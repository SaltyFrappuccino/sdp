import { useState, useEffect, ReactNode } from 'react';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ScreenSpinner, ModalRoot, ModalPage, ModalPageHeader, Div, Group, Panel } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Home, Anketa, AnketaList, AnketaDetail, AdminLogin, AdminPanel, AnketaEditor, Calculator, MarketPanel } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';
import { API_URL } from './api';

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();
  const [fetchedUser, setUser] = useState<UserInfo | undefined>();
  const [popout, setPopout] = useState<ReactNode | null>(<ScreenSpinner />);
  const [serverStatus, setServerStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [modal, setModal] = useState<ReactNode | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Сначала проверяем доступность сервера
        const healthCheckResponse = await fetch(`${API_URL}/health-check`);
        if (!healthCheckResponse.ok) {
          throw new Error('Server health check failed');
        }
        setServerStatus('ok');

        // Если сервер доступен, продолжаем инициализацию
        await bridge.send('VKWebAppInit');
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
      } catch (error) {
        console.error("Initialization failed:", error);
        setServerStatus('error');
        setModal(
          <ModalRoot activeModal="maintenance">
            <ModalPage
              id="maintenance"
              settlingHeight={100}
              header={<ModalPageHeader>Техническое обслуживание</ModalPageHeader>}
            >
              <Group>
                <Div>
                  <p>SDP Mini App находится на обновлении.</p>
                  <p>Пожалуйста, попробуйте зайти позже.</p>
                </Div>
              </Group>
            </ModalPage>
          </ModalRoot>
        );
        setUser(undefined);
      } finally {
        setPopout(null);
      }
    }
    fetchData();
  }, []);


  if (serverStatus === 'loading') {
    return <ScreenSpinner />;
  }

  return (
    <SplitLayout popout={popout} modal={modal}>
      <SplitCol>
        {serverStatus === 'ok' ? (
          <View activePanel={activePanel}>
            <Home id="home" fetchedUser={fetchedUser} />
            <Anketa id="anketa" fetchedUser={fetchedUser} />
            <AnketaList id="anketa_list" />
            <AnketaDetail id="anketa_detail" fetchedUser={fetchedUser} />
            <AdminLogin id="admin_login" />
            <AdminPanel id="admin_panel" />
            <AnketaEditor id="admin_anketa_edit" setModal={setModal} fetchedUser={fetchedUser} />
            <Calculator id="calculator" />
            <MarketPanel id="market" fetchedUser={fetchedUser} />
          </View>
        ) : (
          // Можно показать пустой View или дополнительную заглушку здесь,
          // если модальное окно не перекрывает все
          <View activePanel="placeholder">
            <Panel id="placeholder" />
          </View>
        )}
      </SplitCol>
    </SplitLayout>
  );
};
