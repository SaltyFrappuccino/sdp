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
  ANKETA: 'anketa',
  ANKETA_LIST: 'anketa_list',
  ANKETA_DETAIL: 'anketa_detail',
  ADMIN_LOGIN: 'admin_login',
  ADMIN_PANEL: 'admin_panel',
  ADMIN_ANKETA_EDIT: 'admin_anketa_edit',
  CALCULATOR: 'calculator',
  MARKET: 'market',
  MY_ANKETAS: 'my_anketas',
  ANKETA_EDITOR: 'anketa-editor',
  UPDATE_VIEWER: 'update_viewer',
} as const;

export const routes = RoutesConfig.create([
  createRoot(DEFAULT_ROOT, [
    createView(DEFAULT_VIEW, [
      createPanel(DEFAULT_VIEW_PANELS.HOME, '/', []),
      createPanel(DEFAULT_VIEW_PANELS.ANKETA, `/${DEFAULT_VIEW_PANELS.ANKETA}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ANKETA_LIST, `/${DEFAULT_VIEW_PANELS.ANKETA_LIST}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ANKETA_DETAIL, `/${DEFAULT_VIEW_PANELS.ANKETA_DETAIL}/:id`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_LOGIN, `/${DEFAULT_VIEW_PANELS.ADMIN_LOGIN}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_PANEL, `/${DEFAULT_VIEW_PANELS.ADMIN_PANEL}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ADMIN_ANKETA_EDIT, `/${DEFAULT_VIEW_PANELS.ADMIN_ANKETA_EDIT}/:id`, []),
      createPanel(DEFAULT_VIEW_PANELS.CALCULATOR, `/${DEFAULT_VIEW_PANELS.CALCULATOR}`, []),
      createPanel(DEFAULT_VIEW_PANELS.MARKET, `/${DEFAULT_VIEW_PANELS.MARKET}`, []),
      createPanel(DEFAULT_VIEW_PANELS.MY_ANKETAS, `/${DEFAULT_VIEW_PANELS.MY_ANKETAS}`, []),
      createPanel(DEFAULT_VIEW_PANELS.ANKETA_EDITOR, `/${DEFAULT_VIEW_PANELS.ANKETA_EDITOR}/:id`, []),
      createPanel(DEFAULT_VIEW_PANELS.UPDATE_VIEWER, `/${DEFAULT_VIEW_PANELS.UPDATE_VIEWER}/:update_id`, []),
    ]),
  ]),
]);

export const router = createHashRouter(routes.getRoutes());
