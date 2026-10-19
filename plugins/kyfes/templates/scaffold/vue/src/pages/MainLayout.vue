<script setup lang="ts">
import { useRoute, RouterLink, RouterView } from 'vue-router'
import { useLogout, useSession } from '@/shared/auth'
import { currentLocale, isLocale, setLocale, SUPPORTED_LOCALES, useT } from '@/shared/i18n'
import { ACTION, useAbility } from '@/shared/rbac'
import { AppButton, ErrorBoundary } from '@/shared/ui'
import { ORDER_ROUTE, ORDER_SUBJECT } from '@/features/orders'

const { t } = useT()
const route = useRoute()
const ability = useAbility()
const { user } = useSession()
const logout = useLogout()

function onLocaleChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (isLocale(value)) void setLocale(value)
}
</script>

<template>
  <a class="skip-link" href="#main">{{ t('common.app.skipToContent') }}</a>
  <header class="app-header">
    <span class="app-header__brand">{{ t('common.app.name') }}</span>
    <nav :aria-label="t('common.app.mainNav')">
      <ul>
        <li v-if="ability.can(ACTION.read, ORDER_SUBJECT)">
          <RouterLink :to="{ name: ORDER_ROUTE.list }">{{ t('common.nav.orders') }}</RouterLink>
        </li>
      </ul>
    </nav>
    <div class="app-header__tools">
      <label>
        <span class="visually-hidden">{{ t('common.app.language') }}</span>
        <select :value="currentLocale()" @change="onLocaleChange">
          <option v-for="l in SUPPORTED_LOCALES" :key="l" :value="l" :lang="l">
            {{ t(`common.locales.${l}`) }}
          </option>
        </select>
      </label>
      <span v-if="user" class="app-header__user">{{ t('common.app.signedInAs', { name: user.name }) }}</span>
      <AppButton @click="logout()">{{ t('common.app.logout') }}</AppButton>
    </div>
  </header>
  <main id="main" class="app-main" tabindex="-1">
    <ErrorBoundary :reset-key="route.fullPath">
      <RouterView />
    </ErrorBoundary>
  </main>
</template>

<style scoped>
.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.app-header__brand {
  font-weight: 700;
}
.app-header nav ul {
  display: flex;
  gap: var(--space-3);
  list-style: none;
  margin: 0;
  padding: 0;
}
.app-header__tools {
  margin-inline-start: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.app-main {
  padding: var(--space-4);
  max-width: 72rem;
  margin: 0 auto;
}
</style>
