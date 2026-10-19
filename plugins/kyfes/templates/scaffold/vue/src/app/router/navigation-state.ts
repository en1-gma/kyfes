import { shallowRef } from 'vue'
import type { Router } from 'vue-router'

export type FailedNavigation = { error: unknown; target: string }

/** Last navigation that threw in a guard (e.g. /auth/me 5xx or invalid): App renders it with "Retry". */
export const failedNavigation = shallowRef<FailedNavigation | null>(null)

let pendingTarget: string | null = null

/** Tracks the navigation in progress and the failed ones. Register before any other guard. */
export function trackNavigation(router: Router): void {
  router.beforeEach((to) => {
    pendingTarget = to.fullPath
  })
  router.afterEach((_to, _from, failure) => {
    pendingTarget = null
    if (!failure) failedNavigation.value = null
  })
  router.onError((error: unknown, to) => {
    pendingTarget = null
    failedNavigation.value = { error, target: to.fullPath }
  })
}

/** Where the user is going: the navigation in progress if any (e.g. the first one), else the current URL. */
export function navigationTarget(): string {
  return pendingTarget ?? `${window.location.pathname}${window.location.search}${window.location.hash}`
}
