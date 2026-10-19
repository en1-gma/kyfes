<script setup lang="ts">
import { useT } from '@/shared/i18n'

/** "Not authorized" for a page or a record (the URL stays the same, no silent redirect). */
const { t } = useT()
</script>

<template>
  <section class="page page--status">
    <h1>{{ t('common.errors.forbiddenTitle') }}</h1>
    <p>{{ t('common.errors.forbiddenText') }}</p>
    <slot />
  </section>
</template>
