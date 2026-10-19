import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorStateComponent } from '@shared/ui';
import { GlobalErrorState } from './app-error-handler';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (errors.error(); as error) {
      <div class="global-error">
        <app-error-state [error]="error" [retryable]="true" (retry)="reload()" />
      </div>
    }
    <router-outlet />
  `,
})
export class App {
  protected readonly errors = inject(GlobalErrorState);

  protected reload(): void {
    this.errors.dismiss();
    globalThis.location.reload();
  }
}
