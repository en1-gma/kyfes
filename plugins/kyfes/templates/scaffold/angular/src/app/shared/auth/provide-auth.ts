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
        // Non si cancella una lettura di /auth/me in corso (es. quella di authGuard): fallirà con il 401.
        if (queryClient.isFetching({ queryKey: sessionKeys.all }) === 0) {
          queryClient.removeQueries({ queryKey: sessionKeys.all });
        }
        // returnTo = destinazione della navigazione in corso (es. authGuard alla prima navigazione),
        // altrimenti la rotta corrente. AuthService.login fa un solo location.assign.
        const navigation = router.currentNavigation();
        const returnTo = navigation
          ? router.serializeUrl(navigation.finalUrl ?? navigation.extractedUrl)
          : router.url;
        auth.login(returnTo);
      });
      events.onForbidden(() => {
        void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      });
    }),
  ]);
}
