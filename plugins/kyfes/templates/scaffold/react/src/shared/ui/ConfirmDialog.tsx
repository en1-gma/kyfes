import { useEffect, useId, useRef } from 'react';
import { useTranslation } from '@/shared/i18n';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible modal confirm based on the native <dialog> (focus trap and Esc handled by the browser). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      {open && (
        <>
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          <p id={messageId}>{message}</p>
          <div className="dialog__actions">
            <Button onClick={onCancel} autoFocus>
              {t('actions.cancel')}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} busy={busy} onClick={onConfirm}>
              {confirmLabel ?? t('actions.confirm')}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
