<script setup lang="ts" generic="T">
import ConfirmDialog from './ConfirmDialog.vue'

/** Destructive confirm bound to a record: `item` null keeps it closed, confirming emits `confirm(item)`. */
const props = defineProps<{
  item: T | null
  labels: { title: string; message: string; confirm: string }
}>()
const emit = defineEmits<{ confirm: [item: T]; close: [] }>()

function onConfirm() {
  const item = props.item
  emit('close')
  if (item !== null) emit('confirm', item)
}
</script>

<template>
  <ConfirmDialog
    :open="item !== null"
    :title="labels.title"
    :message="labels.message"
    :confirm-label="labels.confirm"
    @confirm="onConfirm"
    @cancel="emit('close')"
  />
</template>
