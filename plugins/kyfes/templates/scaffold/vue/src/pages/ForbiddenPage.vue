<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useT } from '@/shared/i18n'

const { t } = useT()
</script>

<template>
  <section class="page page--status">
    <h1>{{ t('common.errors.forbiddenTitle') }}</h1>
    <p>{{ t('common.errors.forbiddenText') }}</p>
    <RouterLink to="/">{{ t('common.errors.goHome') }}</RouterLink>
  </section>
</template>
