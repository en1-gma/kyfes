import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ORDER_SUBJECT, orderPaths } from '@features/orders';
import { AuthService, injectSession } from '@shared/auth';
import { I18nService, TranslocoPipe } from '@shared/i18n';
import { Action, CanDirective } from '@shared/rbac';
import { ButtonComponent } from '@shared/ui';

/** Layout autenticato: navigazione (voci solo con permesso `read`), lingua, logout. */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe, CanDirective, ButtonComponent],
  templateUrl: './app-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);
  protected readonly session = injectSession();
  protected readonly i18n = inject(I18nService);
  protected readonly Action = Action;
  protected readonly orderSubject = ORDER_SUBJECT;
  protected readonly orderPaths = orderPaths;

  protected onLangChange(event: Event): void {
    this.i18n.setLang((event.target as HTMLSelectElement).value);
  }

  protected logout(): void {
    void this.auth.logout();
  }
}
