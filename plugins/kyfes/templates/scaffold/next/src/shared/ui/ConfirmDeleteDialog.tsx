'use client';

import { ConfirmDialog } from './ConfirmDialog';

export interface ConfirmDeleteDialogProps<T> {
  /** Record waiting for confirmation; `null` keeps the dialog closed. */
  item: T | null;
  /** Already translated. */
  labels: { title: string; message: string; confirm: string };
  onConfirm: (item: T) => void;
  onClose: () => void;
}

/** Destructive confirm bound to a record: confirming calls `onConfirm(item)` and closes. */
export function ConfirmDeleteDialog<T>({
  item,
  labels,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps<T>) {
  return (
    <ConfirmDialog
      open={item !== null}
      destructive
      title={labels.title}
      message={labels.message}
      confirmLabel={labels.confirm}
      onCancel={onClose}
      onConfirm={() => {
        if (item !== null) onConfirm(item);
        onClose();
      }}
    />
  );
}
