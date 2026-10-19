import { DOCUMENT, Injectable, inject } from '@angular/core';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { API_OPTIONS, ApiClient } from '@shared/api';
import { safeRedirect } from '@shared/lib';
import type { Session } from './session.schema';
import { sessionQueryOptions } from './session';

/** Navigazione "piena" del browser (login/logout passano dal BFF). Sostituibile nei test. */
@Injectable({ providedIn: 'root' })
export class BrowserLocation {
  private readonly document = inject(DOCUMENT);

  assign(url: string): void {
    this.document.location.assign(url);
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly baseUrl = inject(API_OPTIONS).baseUrl;
  private readonly queryClient = inject(QueryClient);
  private readonly location = inject(BrowserLocation);

  /** Sessione dalla cache o dal server; rigetta con ApiError (401 se non autenticato). */
  ensureSession(): Promise<Session> {
    return this.queryClient.ensureQueryData(sessionQueryOptions(this.api));
  }

  /** Login OIDC gestito dal BFF: il browser non vede mai token. */
  login(returnTo = '/'): void {
    const target = encodeURIComponent(safeRedirect(returnTo));
    this.location.assign(`${this.baseUrl}/auth/login?returnTo=${target}`);
  }

  async logout(): Promise<void> {
    try {
      await this.api.send('/auth/logout');
    } finally {
      this.queryClient.clear();
      this.location.assign('/');
    }
  }
}
