import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ConfirmDialogComponent } from './confirm-dialog.component';

export interface ConfirmDeleteLabels {
  title: string;
  message: string;
  confirm: string;
}

/** Conferma distruttiva legata a un record: `item` null = chiuso; confermando emette `confirmed(item)` e chiude. */
@Component({
  selector: 'app-confirm-delete-dialog',
  imports: [ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-confirm-dialog
      [open]="item() !== null"
      [title]="labels().title"
      [message]="labels().message"
      [confirmLabel]="labels().confirm"
      (confirmed)="confirm()"
      (cancelled)="closed.emit()"
    />
  `,
})
export class ConfirmDeleteDialogComponent<T> {
  readonly item = input.required<T | null>();
  /** Testi già tradotti. */
  readonly labels = input.required<ConfirmDeleteLabels>();
  readonly confirmed = output<T>();
  readonly closed = output<void>();

  protected confirm(): void {
    const item = this.item();
    if (item !== null) this.confirmed.emit(item);
    this.closed.emit();
  }
}
