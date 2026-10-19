<script setup lang="ts">
import { useT } from '@/shared/i18n'
import AppButton from './AppButton.vue'

/** Footer of a cursor-paginated list: loaded count (announced) + "load more" while `nextCursor` is present. */
defineProps<{
  /** Already translated "N items" text, announced to screen readers. */
  summary: string
  hasNextPage: boolean
  loading: boolean
}>()
defineEmits<{ more: [] }>()
const { t } = useT()
</script>

<template>
  <div class="load-more">
    <p class="load-more__summary" aria-live="polite">{{ summary }}</p>
    <AppButton v-if="hasNextPage" :loading="loading" @click="$emit('more')">
      {{ t('common.actions.loadMore') }}
    </AppButton>
  </div>
</template>

<style scoped>
.load-more {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-2);
}
.load-more__summary {
  color: var(--color-muted);
  margin: 0;
}
</style>
