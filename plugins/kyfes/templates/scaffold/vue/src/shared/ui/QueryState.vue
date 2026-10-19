<script setup lang="ts">
import EmptyState from './EmptyState.vue'
import ErrorState from './ErrorState.vue'
import LoadingState from './LoadingState.vue'

/** Loading → error (with retry) → empty → content: the same sequence for every query of the UI. */
withDefaults(
  defineProps<{ pending: boolean; error: unknown; empty?: boolean; emptyMessage?: string | undefined }>(),
  { empty: false, emptyMessage: undefined },
)
defineEmits<{ retry: [] }>()
</script>

<template>
  <LoadingState v-if="pending" />
  <ErrorState v-else-if="error" :error="error" retry @retry="$emit('retry')" />
  <EmptyState v-else-if="empty" :message="emptyMessage" />
  <slot v-else />
</template>
