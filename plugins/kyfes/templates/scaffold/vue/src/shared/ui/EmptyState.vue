<script setup lang="ts">
import { useT } from '@/shared/i18n'

defineProps<{ message?: string }>()
const { t } = useT()
</script>

<template>
  <div class="empty">
    <p>{{ message ?? t('common.state.empty') }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  padding: var(--space-4);
  color: var(--color-muted);
  text-align: center;
}
</style>
