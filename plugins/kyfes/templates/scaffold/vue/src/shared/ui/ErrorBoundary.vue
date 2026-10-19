<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import ErrorState from './ErrorState.vue'

/** Catches render/setup errors of the subtree (one per route); `resetKey` change clears it. */
const props = defineProps<{ resetKey?: string }>()
const error = ref<unknown>(null)

onErrorCaptured((err) => {
  error.value = err
  console.error(err)
  return false
})

watch(
  () => props.resetKey,
  () => {
    error.value = null
  },
)
</script>

<template>
  <ErrorState v-if="error" :error="error" />
  <slot v-else />
</template>
