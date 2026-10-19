import { Injectable } from '@angular/core';

type Listener = () => void;

/**
 * Callback registrabili sugli eventi del client HTTP (`onUnauthorized`, `onForbidden`).
 * shared/auth li registra all'avvio; i test li sostituiscono con spy.
 */
@Injectable({ providedIn: 'root' })
export class ApiEvents {
  private readonly unauthorized = new Set<Listener>();
  private readonly forbidden = new Set<Listener>();

  onUnauthorized(listener: Listener): () => void {
    this.unauthorized.add(listener);
    return () => this.unauthorized.delete(listener);
  }

  onForbidden(listener: Listener): () => void {
    this.forbidden.add(listener);
    return () => this.forbidden.delete(listener);
  }

  emitUnauthorized(): void {
    this.unauthorized.forEach((l) => l());
  }

  emitForbidden(): void {
    this.forbidden.forEach((l) => l());
  }
}
