/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEFAULT_LOCALE?: string
  readonly VITE_API_MOCKS?: string
  /** Dev mocks only: manager | viewer */
  readonly VITE_MOCK_USER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
