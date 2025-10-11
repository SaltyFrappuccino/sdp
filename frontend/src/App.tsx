import { useState, useEffect, ReactNode } from 'react';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ScreenSpinner, ModalRoot, ModalPage, ModalPageHeader, Div, Group, Panel } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

import { Home, Anketa, AnketaList, AnketaDetail, AdminLogin, AdminPanel, UserAnketaEditor, AdminAnketaEditor, Calculator, MarketPanel, MyAnketasPanel, ActivityRequestsPanel, AdminActivityRequestsPanel, Handbook, MarketExchangePanel, AdminMarketPanel, CasinoPanel, PokerPanel, HorseStatsPanel, NewEventsPanel, NewAdminEventsPanel, BulkCharacterManagement, CryptoExchangePanel, PurchasesPanel, CollectionsPanel, FactionsList, FactionsCreate, AdminFactions, AdminCryptoPanel, AdminPurchasesPanel, AdminCollectionsPanel, BestiaryPanel, AdminBestiaryPanel, FishingPanel, HuntingPanel, AdminActivitiesPanel, FishingPanelV2, HuntingPanelV2, MaterialsPanel, CraftingPanel, JournalPanel } from './panels';
import { DEFAULT_VIEW_PANELS } from './routes';
import { API_URL } from './api';
import UpdateViewer from './panels/UpdateViewer';

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
            <AdminAnketaEditor id="admin_anketa_edit" setModal={setModal} fetchedUser={fetchedUser} />
            <UserAnketaEditor id="anketa-editor" setModal={setModal} fetchedUser={fetchedUser} />
            <Calculator id="calculator" />
            <MarketPanel id="market" fetchedUser={fetchedUser} />
            <MyAnketasPanel id="my_anketas" fetchedUser={fetchedUser} />
            <ActivityRequestsPanel id="activity_requests" fetchedUser={fetchedUser} isAdmin={false} />
            <AdminActivityRequestsPanel id="admin_activity_requests" />
            <Handbook id="handbook" />
            <MarketExchangePanel id="market_exchange" fetchedUser={fetchedUser} />
            <AdminMarketPanel id="admin_market" />
            <CasinoPanel id="casino" fetchedUser={fetchedUser} />
            <PokerPanel id="poker" fetchedUser={fetchedUser} />
            <HorseStatsPanel id="horse_stats" goBack={() => window.history.back()} />
            <NewEventsPanel id="events" fetchedUser={fetchedUser} />
            <NewAdminEventsPanel id="admin_events" />
            <BulkCharacterManagement id="bulk_characters" />
            <CryptoExchangePanel id="crypto_exchange" fetchedUser={fetchedUser} />
            <PurchasesPanel id="purchases" fetchedUser={fetchedUser} />
            <CollectionsPanel id="collections" fetchedUser={fetchedUser} />
        <FactionsList id="factions_list" />
        <FactionsCreate id="factions_create" />
        <AdminFactions id="admin_factions" />
        <AdminCryptoPanel id="admin_crypto" />
        <AdminPurchasesPanel id="admin_purchases" />
        <AdminCollectionsPanel id="admin_collections" />
        <BestiaryPanel id="bestiary" />
        <AdminBestiaryPanel id="admin_bestiary" />
            <FishingPanel id="fishing" fetchedUser={fetchedUser} />
            <HuntingPanel id="hunting" fetchedUser={fetchedUser} />
            <AdminActivitiesPanel id="admin_activities" />
            <FishingPanelV2 id="fishing_v2" fetchedUser={fetchedUser} />
            <HuntingPanelV2 id="hunting_v2" fetchedUser={fetchedUser} />
            <MaterialsPanel id="materials" fetchedUser={fetchedUser} />
            <CraftingPanel id="crafting" fetchedUser={fetchedUser} />
            <JournalPanel id="journal" fetchedUser={fetchedUser} />
        <UpdateViewer id="update_viewer" />
          </View>
        ) : (
          <View activePanel="placeholder">
            <Panel id="placeholder" />
          </View>
        )}
      </SplitCol>
    </SplitLayout>
  );
};
