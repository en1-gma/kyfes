import { type EnvironmentProviders, type Provider, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { QueryClient, provideTanStackQuery } from '@tanstack/angular-query-experimental';
import ordersEn from '@features/orders/locales/en.json';
import ordersIt from '@features/orders/locales/it.json';
import { provideApi } from '@shared/api';
import { BrowserLocation, provideAuth } from '@shared/auth';
import commonEn from '@shared/i18n/locales/en.json';
import commonIt from '@shared/i18n/locales/it.json';
import { provideRbac } from '@shared/rbac';

export class FakeBrowserLocation {
  readonly visited: string[] = [];
  assign(url: string): void {
    this.visited.push(url);
  }
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
}

/** Provider dell'app per i test di componente/integrazione (rete simulata con MSW). */
export function provideTestApp(
  queryClient: QueryClient = createTestQueryClient(),
): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter([]),
    provideApi(),
    provideTanStackQuery(queryClient),
    provideAuth(),
    provideRbac(),
    { provide: BrowserLocation, useClass: FakeBrowserLocation },
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { it: { common: commonIt, orders: ordersIt }, en: { common: commonEn, orders: ordersEn } },
        translocoConfig: {
          availableLangs: ['it', 'en'],
          defaultLang: 'it',
          scopes: { autoPrefixKeys: false },
        },
        preloadLangs: true,
      }),
    ),
  ];
}
