import { createApp } from 'vue'
import { configureHttp } from '@/shared/api'
import { env } from '@/shared/config/env'
import App from './App.vue'
import {
  createAppQueryClient,
  createUnauthorizedHandler,
  installProviders,
  registerFeatureNamespaces,
} from './providers'
import { createAppRouter } from './router'
import './styles.css'

async function enableMocking(): Promise<void> {
  // Dev only: the MSW code is tree-shaken out of production builds.
  if (!import.meta.env.DEV || !env.API_MOCKS) return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

async function bootstrap(): Promise<void> {
  await enableMocking()
  const queryClient = createAppQueryClient()
  configureHttp({
    // Single-flight POST /auth/refresh before giving up (disable if the BFF has no refresh endpoint).
    refresh: true,
    onUnauthorized: createUnauthorizedHandler(queryClient),
  })
  registerFeatureNamespaces()

  const app = createApp(App)
  const router = createAppRouter(queryClient)
  installProviders(app, queryClient)
  app.use(router)
  app.config.errorHandler = (error) => console.error(error)
  // A failed first navigation (e.g. /auth/me 5xx) must not leave a blank page: App renders the error
  // with "Retry" (failedNavigation), so mount anyway.
  await router.isReady().catch(() => undefined)
  app.mount('#app')
}

void bootstrap()
