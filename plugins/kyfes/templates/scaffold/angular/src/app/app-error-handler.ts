import { type ErrorHandler, Injectable, inject, signal } from '@angular/core';

/** Ultimo errore non gestito: mostrato dal componente radice ("error boundary" globale). */
@Injectable({ providedIn: 'root' })
export class GlobalErrorState {
  readonly error = signal<unknown>(null);

  report(error: unknown): void {
    this.error.set(error);
  }

  dismiss(): void {
    this.error.set(null);
  }
}

@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly state = inject(GlobalErrorState);

  handleError(error: unknown): void {
    this.state.report(error);
    // Solo diagnostica locale: nessun dato personale, il dettaglio non arriva all'utente.
    console.error(error);
  }
}
