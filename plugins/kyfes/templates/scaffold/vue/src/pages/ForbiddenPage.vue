<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useT } from '@/shared/i18n'
import { ForbiddenState } from '@/shared/ui'

const { t } = useT()
</script>

<template>
  <ForbiddenState>
    <RouterLink to="/">{{ t('common.errors.goHome') }}</RouterLink>
  </ForbiddenState>
</template>
