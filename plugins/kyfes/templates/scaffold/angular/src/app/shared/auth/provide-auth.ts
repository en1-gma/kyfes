import {
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { ApiEvents } from '@shared/api';
import { AuthService } from './auth.service';
import { sessionKeys } from './session';

/**
 * Collega gli eventi del client HTTP alla sessione:
 * 401 → sessione rimossa + login; 403 → sessione invalidata (i permessi potrebbero essere cambiati).
 */
export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const events = inject(ApiEvents);
      const queryClient = inject(QueryClient);
      const auth = inject(AuthService);
      const router = inject(Router);
      events.onUnauthorized(() => {
        queryClient.removeQueries({ queryKey: sessionKeys.all });
        // Alla prima navigazione decide authGuard (conosce l'URL richiesto).
        if (router.navigated) auth.login(router.url);
      });
      events.onForbidden(() => {
        void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      });
    }),
  ]);
}
