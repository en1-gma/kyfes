import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DIALOG_OPEN_ATTRIBUTE } from '@shared/config/constants';
import { TranslocoPipe } from '@shared/i18n';

/** Dialog modale nativo (focus trap e Esc del browser). Testi già tradotti in input. */
@Component({
  selector: 'app-confirm-dialog',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="dialog" aria-labelledby="confirm-dialog-title" (cancel)="cancelled.emit()">
      <h2 id="confirm-dialog-title">{{ title() }}</h2>
      <p>{{ message() }}</p>
      <div class="dialog__actions">
        <button type="button" class="btn btn--secondary" (click)="cancelled.emit()">
          {{ 'common.actions.cancel' | transloco }}
        </button>
        <button type="button" class="btn btn--danger" (click)="confirmed.emit()">
          {{ confirmLabel() ?? ('common.actions.confirm' | transloco) }}
        </button>
      </div>
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input<string>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) {
        if (typeof el.showModal === 'function') el.showModal();
        else el.setAttribute(DIALOG_OPEN_ATTRIBUTE, '');
      } else if (!this.open() && el.open) {
        if (typeof el.close === 'function') el.close();
        else el.removeAttribute(DIALOG_OPEN_ATTRIBUTE);
      }
    });
  }
}
