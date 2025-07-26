import { useState, useEffect, ReactNode } from 'react';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ScreenSpinner } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Persik, Home, Anketa, AnketaList, AnketaDetail, AdminLogin, AdminPanel } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';

export const App = () => {
  const { panel: activePanel = DEFAULT_VIEW_PANELS.HOME } = useActiveVkuiLocation();
  const [fetchedUser, setUser] = useState<UserInfo | undefined>();
  const [popout, setPopout] = useState<ReactNode | null>(<ScreenSpinner />);

  useEffect(() => {
    async function fetchData() {
      try {
        await bridge.send('VKWebAppInit');
        const user = await bridge.send('VKWebAppGetUserInfo');
        setUser(user);
      } catch (error) {
        console.error("Failed to get user info:", error);
        setUser(undefined); // Устанавливаем undefined при ошибке
      } finally {
        setPopout(null);
      }
    }
    fetchData();
  }, []);

  return (
    <SplitLayout>
      <SplitCol>
        <View activePanel={activePanel}>
          <Home id="home" fetchedUser={fetchedUser} />
          <Persik id="persik" />
          <Anketa id="anketa" fetchedUser={fetchedUser} />
          <AnketaList id="anketa_list" />
          <AnketaDetail id="anketa_detail" fetchedUser={fetchedUser} />
          <AdminLogin id="admin_login" />
          <AdminPanel id="admin_panel" />
        </View>
      </SplitCol>
      {popout}
    </SplitLayout>
  );
};
