import {
  createHashRouter,
  createPanel,
  createRoot,
  createView,
  RoutesConfig,
} from '@vkontakte/vk-mini-apps-router';

export const DEFAULT_ROOT = 'default_root';

export const DEFAULT_VIEW = 'default_view';

export const DEFAULT_VIEW_PANELS = {
  HOME: 'home',
  PERSIK: 'persik',
  ANKETA: 'anketa',
  ANKETA_LIST: 'anketa_list',
  ANKETA_DETAIL: 'anketa_detail',
  ADMIN_LOGIN: 'admin_login',
  ADMIN_PANEL: 'admin_panel',
} as const;

export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    createView(DEFAULT_VIEW, [
      createPanel(DEFAULT_VIEW_PANELS.HOME, '/', []),
      createPanel(DEFAULT_VIEW_PANELS.PERSIK, `/${DEFAULT_VIEW_PANELS.PERSIK}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ANKETA, `/${DEFAULT_VIEW_PANELS.ANKETA}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ANKETA_LIST, `/${DEFAULT_VIEW_PANELS.ANKETA_LIST}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ANKETA_DETAIL, `/${DEFAULT_VIEW_PANELS.ANKETA_DETAIL}/:id`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_LOGIN, `/${DEFAULT_VIEW_PANELS.ADMIN_LOGIN}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_PANEL, `/${DEFAULT_VIEW_PANELS.ADMIN_PANEL}`, []),
    ]),
  ]),
]);

export const router = createHashRouter(routes.getRoutes());
