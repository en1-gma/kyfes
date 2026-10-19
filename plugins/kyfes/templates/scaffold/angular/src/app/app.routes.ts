import type { Routes } from '@angular/router';
import { ORDER_ROUTE_PATHS, ORDER_SUBJECT, provideOrdersI18n } from '@features/orders';
import { authGuard } from '@shared/auth';
import { Action, FORBIDDEN_PATH, permissionGuard } from '@shared/rbac';
import { AppLayoutComponent } from './pages/layout/app-layout.component';

/**
 * Il `title` è una chiave i18n (I18nTitleStrategy) e vale anche per le rotte figlie che non ne
 * dichiarano una propria. Pagine caricate in lazy (code splitting per rotta).
 */
export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: ORDER_ROUTE_PATHS.root },
      {
        path: ORDER_ROUTE_PATHS.root,
        title: 'common.nav.orders',
        canActivate: [permissionGuard(Action.Read, ORDER_SUBJECT)],
        providers: [provideOrdersI18n()],
        children: [
          {
            path: ORDER_ROUTE_PATHS.list,
            loadComponent: () =>
              import('./pages/orders/orders-page.component').then((m) => m.OrdersPageComponent),
          },
          {
            path: ORDER_ROUTE_PATHS.new,
            canActivate: [permissionGuard(Action.Create, ORDER_SUBJECT)],
            loadComponent: () =>
              import('./pages/orders/new-order-page.component').then((m) => m.NewOrderPageComponent),
          },
          {
            path: ORDER_ROUTE_PATHS.detail,
            loadComponent: () =>
              import('./pages/orders/order-detail-page.component').then((m) => m.OrderDetailPageComponent),
          },
          {
            path: ORDER_ROUTE_PATHS.edit,
            canActivate: [permissionGuard(Action.Update, ORDER_SUBJECT)],
            loadComponent: () =>
              import('./pages/orders/order-edit-page.component').then((m) => m.OrderEditPageComponent),
          },
        ],
      },
      {
        path: FORBIDDEN_PATH.slice(1),
        title: 'common.pages.forbidden.title',
        loadComponent: () =>
          import('./pages/forbidden/forbidden-page.component').then((m) => m.ForbiddenPageComponent),
      },
      {
        path: '**',
        title: 'common.pages.notFound.title',
        loadComponent: () =>
          import('./pages/not-found/not-found-page.component').then((m) => m.NotFoundPageComponent),
      },
    ],
  },
];
