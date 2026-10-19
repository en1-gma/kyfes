<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { useT } from '@/shared/i18n'
import AppButton from './AppButton.vue'

const props = defineProps<{ open: boolean; title: string; message: string; confirmLabel?: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useT()
const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()

watch(
  () => props.open,
  (open) => {
    const el = dialog.value
    if (!el) return
    if (open && !el.open) el.showModal?.()
    if (!open && el.open) el.close()
  },
  { flush: 'post' },
)
</script>

<template>
  <dialog ref="dialog" class="dialog" :aria-labelledby="titleId" @cancel.prevent="emit('cancel')">
    <h2 :id="titleId">{{ title }}</h2>
    <p>{{ message }}</p>
    <div class="dialog__actions">
      <AppButton @click="emit('cancel')">{{ t('common.actions.cancel') }}</AppButton>
      <AppButton variant="danger" @click="emit('confirm')">
        {{ confirmLabel ?? t('common.actions.confirm') }}
      </AppButton>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  max-width: 28rem;
}
.dialog::backdrop {
  background: rgb(0 0 0 / 40%);
}
.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
