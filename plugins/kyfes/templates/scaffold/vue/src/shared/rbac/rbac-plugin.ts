import { abilitiesPlugin, useAbility as useCaslAbility } from '@casl/vue'
import { hashKey, type QueryClient } from '@tanstack/vue-query'
import type { Plugin } from 'vue'
import { sessionKeys, type Session } from '@/shared/auth'
import { buildAbility, updateAbility, type AppAbility } from './ability'

export type RbacPlugin = Plugin & { readonly ability: AppAbility }

/**
 * Provides the app-wide Ability and keeps it in sync with the session query:
 * whenever /auth/me is fetched, invalidated or cleared (logout), the rules are updated.
 */
export function createRbacPlugin(queryClient: QueryClient): RbacPlugin {
  const ability = buildAbility()
  const sessionHash = hashKey(sessionKeys.me())
  const sync = () => {
    const session = queryClient.getQueryData<Session>(sessionKeys.me())
    updateAbility(ability, session?.rules ?? [])
  }
  sync()
  queryClient.getQueryCache().subscribe((event) => {
    if (event.query.queryHash === sessionHash) sync()
  })
  return {
    ability,
    install(app) {
      app.use(abilitiesPlugin, ability)
    },
  }
}

/** Reactive ability for components: `const ability = useAbility(); ability.can('update', subject('Order', o))`. */
export function useAbility(): AppAbility {
  return useCaslAbility<AppAbility>()
}
