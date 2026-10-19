<script setup lang="ts">
import { computed } from 'vue'
import { isApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import AppButton from './AppButton.vue'

const props = defineProps<{ error: unknown; retry?: boolean }>()
defineEmits<{ retry: [] }>()
const { t } = useT()

/** Generic message only: backend details never reach the user, the correlationId does. 403 says "not authorized". */
const correlationId = computed(() => (isApiError(props.error) ? props.error.correlationId : undefined))
const forbidden = computed(() => isApiError(props.error) && props.error.status === 403)
</script>

<template>
  <div class="error" role="alert">
    <p>{{ forbidden ? t('common.state.forbidden') : t('common.state.error') }}</p>
    <p v-if="correlationId" class="error__ref">
      {{ t('common.state.correlationId', { id: correlationId }) }}
    </p>
    <AppButton v-if="retry" @click="$emit('retry')">{{ t('common.actions.retry') }}</AppButton>
  </div>
</template>

<style scoped>
.error {
  padding: var(--space-4);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  background: var(--color-danger-soft);
}
.error__ref {
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
}
</style>
