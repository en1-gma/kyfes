<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useSession } from '@/shared/auth'
import { resolveInitialLocale, setLocale } from '@/shared/i18n'

const { data: session } = useSession()

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
  <RouterView />
</template>
