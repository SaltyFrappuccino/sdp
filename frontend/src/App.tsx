import { useState, useEffect, ReactNode, lazy, Suspense } from 'react';
import bridge, { UserInfo } from '@vkontakte/vk-bridge';
import { View, SplitLayout, SplitCol, ScreenSpinner, ModalRoot, ModalPage, ModalPageHeader, Div, Group, Panel } from '@vkontakte/vkui';
import { useActiveVkuiLocation } from '@vkontakte/vk-mini-apps-router';

// Lazy load panels
const Home = lazy(() => import('./panels/Home').then(module => ({ default: module.Home })));
const Anketa = lazy(() => import('./panels/Anketa').then(module => ({ default: module.Anketa })));
const AnketaList = lazy(() => import('./panels/AnketaList').then(module => ({ default: module.AnketaList })));
const AnketaDetail = lazy(() => import('./panels/AnketaDetail').then(module => ({ default: module.AnketaDetail })));
const AdminLogin = lazy(() => import('./panels/AdminLogin').then(module => ({ default: module.AdminLogin })));
const AdminPanel = lazy(() => import('./panels/AdminPanel').then(module => ({ default: module.AdminPanel })));
const UserAnketaEditor = lazy(() => import('./panels/UserAnketaEditor').then(module => ({ default: module.UserAnketaEditor })));
const AdminAnketaEditor = lazy(() => import('./panels/AdminAnketaEditor').then(module => ({ default: module.AdminAnketaEditor })));
const Calculator = lazy(() => import('./panels/Calculator').then(module => ({ default: module.Calculator })));
const MarketPanel = lazy(() => import('./panels/MarketPanel').then(module => ({ default: module.MarketPanel })));
const MyAnketasPanel = lazy(() => import('./panels/MyAnketasPanel').then(module => ({ default: module.MyAnketasPanel })));
const ActivityRequestsPanel = lazy(() => import('./panels/ActivityRequestsPanel').then(module => ({ default: module.ActivityRequestsPanel })));
const AdminActivityRequestsPanel = lazy(() => import('./panels/AdminActivityRequestsPanel').then(module => ({ default: module.AdminActivityRequestsPanel })));
const Handbook = lazy(() => import('./panels/Handbook').then(module => ({ default: module.Handbook })));
const MarketExchangePanel = lazy(() => import('./panels/MarketExchangePanel').then(module => ({ default: module.MarketExchangePanel })));
const AdminMarketPanel = lazy(() => import('./panels/AdminMarketPanel').then(module => ({ default: module.AdminMarketPanel })));
const CasinoPanel = lazy(() => import('./panels/CasinoPanel').then(module => ({ default: module.CasinoPanel })));
const PokerPanel = lazy(() => import('./panels/PokerPanel').then(module => ({ default: module.PokerPanel })));
const HorseStatsPanel = lazy(() => import('./panels/HorseStatsPanel').then(module => ({ default: module.HorseStatsPanel })));
const NewEventsPanel = lazy(() => import('./panels/NewEventsPanel').then(module => ({ default: module.NewEventsPanel })));
const NewAdminEventsPanel = lazy(() => import('./panels/NewAdminEventsPanel').then(module => ({ default: module.NewAdminEventsPanel })));
const BulkCharacterManagement = lazy(() => import('./panels/BulkCharacterManagement').then(module => ({ default: module.BulkCharacterManagement })));
const CollectionsPanel = lazy(() => import('./panels/AdminCollectionsPanel').then(module => ({ default: module.AdminCollectionsPanel })));
const PurchasesPanel = lazy(() => import('./panels/AdminPurchasesPanel').then(module => ({ default: module.AdminPurchasesPanel })));
const BlockchainExchangePanel = lazy(() => import('./panels/BlockchainExchangePanel').then(module => ({ default: module.BlockchainExchangePanel })));
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
    <>
      <SplitLayout popout={popout} modal={modal}>
        <SplitCol>
          {serverStatus === 'ok' ? (
            <Suspense fallback={<ScreenSpinner />}>
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
                <UpdateViewer id="update_viewer" />
                <CollectionsPanel id="collections" />
                <PurchasesPanel id="purchases" />
                <BlockchainExchangePanel id="blockchain" fetchedUser={fetchedUser} />
              </View>
            </Suspense>
          ) : (
            <View activePanel="placeholder">
              <Panel id="placeholder" />
            </View>
          )}
        </SplitCol>
      </SplitLayout>

      <ModalRoot activeModal={null}>
        <ModalPage
          id="transfer"
          onClose={() => {}}
          settlingHeight={100}
          header={
            <ModalPageHeader>
              Перевод средств
            </ModalPageHeader>
          }
        >
          <div>Модальное окно перевода</div>
        </ModalPage>

        <ModalPage
          id="create_token"
          onClose={() => {}}
          settlingHeight={100}
          header={
            <ModalPageHeader>
              Создать токен
            </ModalPageHeader>
          }
        >
          <div>Модальное окно создания токена</div>
        </ModalPage>
      </ModalRoot>
    </>
  );
};
