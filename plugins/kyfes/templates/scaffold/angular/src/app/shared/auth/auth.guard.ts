import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { isApiError } from '@shared/api';
import { AuthService } from './auth.service';

/** Richiede una sessione valida; altrimenti login via BFF con ritorno alla rotta richiesta. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  try {
    await auth.ensureSession();
    return true;
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      auth.login(state.url);
      return false;
    }
    throw error;
  }
};
