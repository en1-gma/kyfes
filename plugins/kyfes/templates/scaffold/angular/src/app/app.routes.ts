import type { Routes } from '@angular/router';
import { provideOrdersI18n } from '@features/orders';
import { authGuard } from '@shared/auth';
import { FORBIDDEN_PATH, permissionGuard } from '@shared/rbac';
import { AppLayoutComponent } from './pages/layout/app-layout.component';

/** Il `title` è una chiave i18n (I18nTitleStrategy). Pagine caricate in lazy (code splitting per rotta). */
export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      {
        path: 'orders',
        canActivate: [permissionGuard('read', 'Order')],
        providers: [provideOrdersI18n()],
        children: [
          {
            path: '',
            title: 'common.nav.orders',
            loadComponent: () =>
              import('./pages/orders/orders-page.component').then((m) => m.OrdersPageComponent),
          },
          {
            path: 'new',
            title: 'common.nav.orders',
            canActivate: [permissionGuard('create', 'Order')],
            loadComponent: () =>
              import('./pages/orders/new-order-page.component').then((m) => m.NewOrderPageComponent),
          },
          {
            path: ':id',
            title: 'common.nav.orders',
            loadComponent: () =>
              import('./pages/orders/order-detail-page.component').then((m) => m.OrderDetailPageComponent),
          },
          {
            path: ':id/edit',
            title: 'common.nav.orders',
            canActivate: [permissionGuard('update', 'Order')],
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
