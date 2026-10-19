<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useSession } from '@/shared/auth'
import { resolveInitialLocale, setLocale } from '@/shared/i18n'
import { ErrorState } from '@/shared/ui'
import { failedNavigation } from './router/navigation-state'

const router = useRouter()
const { data: session } = useSession()

/** Retries the navigation that failed (the session query has no data, so the guards fetch it again). */
function retryNavigation() {
  const target = failedNavigation.value?.target
  failedNavigation.value = null
  if (target) void router.replace(target)
}

// Initial language: session → browser → config default (only once: later the user picks it).
let initialized = false
watch(
  session,
  (value) => {
    if (!value || initialized) return
    initialized = true
    void setLocale(resolveInitialLocale(value.locale))
  },
  { immediate: true },
)
</script>

<template>
  <main v-if="failedNavigation" class="app-error">
    <ErrorState :error="failedNavigation.error" retry @retry="retryNavigation" />
  </main>
  <RouterView v-else />
</template>

<style scoped>
.app-error {
  padding: var(--space-4);
  max-width: 72rem;
  margin: 0 auto;
}
</style>
