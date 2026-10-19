import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@shared/i18n';

/** Stato "non autorizzato" dentro una pagina (es. record che l'utente non può modificare). */
@Component({
  selector: 'app-forbidden-state',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state state--error" role="alert">
      <p class="state__title">{{ 'common.states.forbidden.title' | transloco }}</p>
      <p>{{ message() ?? ('common.states.forbidden.message' | transloco) }}</p>
    </div>
  `,
})
export class ForbiddenStateComponent {
  /** Testo già tradotto; default `common.states.forbidden.message`. */
  readonly message = input<string>();
}
