import { ConfirmDialog } from './ConfirmDialog';

interface ConfirmDeleteDialogProps<T> {
  /** Record waiting for confirmation; `null` keeps the dialog closed. */
  item: T | null;
  labels: { title: string; message: string; confirm: string };
  busy?: boolean | undefined;
  onConfirm: (item: T) => void;
  onClose: () => void;
}

/** Destructive confirm bound to a record: confirming calls `onConfirm(item)` and closes. */
export function ConfirmDeleteDialog<T>({
  item,
  labels,
  busy,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps<T>) {
  return (
    <ConfirmDialog
      open={item !== null}
      danger
      title={labels.title}
      message={labels.message}
      confirmLabel={labels.confirm}
      busy={busy ?? false}
      onCancel={onClose}
      onConfirm={() => {
        if (item !== null) onConfirm(item);
        onClose();
      }}
    />
  );
}
