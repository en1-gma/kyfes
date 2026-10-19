import type { ReactElement, ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { createQueryClient } from '@/shared/api';
import type { RawRule } from '@/shared/auth';
import { TIME_ZONE } from '@/shared/i18n';
import commonIt from '@/shared/i18n/locales/it.json';
import ordersIt from '@/features/orders/locales/it.json';
import { StaticAbilityProvider, buildAbility } from '@/shared/rbac';
import { sessions, type MockUser } from '@/mocks/data';

export function createTestQueryClient(): QueryClient {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: { retry: false, staleTime: Infinity },
    mutations: { retry: false },
  });
  return client;
}

export interface RenderOptions {
  user?: MockUser;
  rules?: RawRule[];
  queryClient?: QueryClient;
}

/** Renders with QueryClient, next-intl (it, common + orders) and an Ability for the user. */
export function renderWithProviders(ui: ReactElement, options: RenderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const rules = options.rules ?? sessions[options.user ?? 'manager'].rules;
  const ability = buildAbility(rules);
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider
          locale="it"
          timeZone={TIME_ZONE}
          messages={{ common: commonIt, orders: ordersIt }}
        >
          <StaticAbilityProvider ability={ability}>{children}</StaticAbilityProvider>
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  }
  return { queryClient, ability, ...render(ui, { wrapper: Wrapper }) };
}
