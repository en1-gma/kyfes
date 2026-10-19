import { inject } from '@angular/core';
import { type CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { AuthService } from '@shared/auth';
import { FORBIDDEN_PATH } from '@shared/config/constants';
import { buildAbility } from './ability';
import type { Actions, SubjectName } from './subjects';

export { FORBIDDEN_PATH } from '@shared/config/constants';

/**
 * Richiede `can(action, subject)`. Senza permesso mostra la pagina 403 mantenendo l'URL
 * richiesto (skipLocationChange): niente redirect silenzioso altrove.
 * Va dopo `authGuard` (la sessione è già in cache).
 */
export function permissionGuard(action: Actions, subject: SubjectName): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const session = await auth.ensureSession();
    if (buildAbility(session.rules).can(action, subject)) return true;
    return new RedirectCommand(router.parseUrl(FORBIDDEN_PATH), { skipLocationChange: true });
  };
}
