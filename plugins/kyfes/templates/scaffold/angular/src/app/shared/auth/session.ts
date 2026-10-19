import { Injectable, computed, inject } from '@angular/core';
import { injectQuery, queryOptions } from '@tanstack/angular-query-experimental';
import { AUTH_ENDPOINTS, ApiClient } from '@shared/api';
import { SessionSchema } from './session.schema';

export const sessionKeys = {
  all: ['session'] as const,
  me: () => [...sessionKeys.all, 'me'] as const,
};

/** GET /auth/me → `{ user, rules, locale }`: unica fonte di verità di utente e permessi. */
export function sessionQueryOptions(api: ApiClient) {
  return queryOptions({
    queryKey: sessionKeys.me(),
    queryFn: ({ signal }) => api.get(AUTH_ENDPOINTS.me, SessionSchema, undefined, { signal }),
    staleTime: 5 * 60_000,
  });
}

/** Sessione corrente come signal (si aggiorna quando la query viene invalidata/ricaricata). */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(ApiClient);
  readonly query = injectQuery(() => sessionQueryOptions(this.api));
  readonly session = computed(() => this.query.data() ?? null);
  readonly user = computed(() => this.session()?.user ?? null);
  readonly rules = computed(() => this.session()?.rules ?? []);
  readonly locale = computed(() => this.session()?.locale ?? null);
}

/** Lettura della sessione nei componenti/servizi (contesto di iniezione). */
export function injectSession(): SessionStore {
  return inject(SessionStore);
}
