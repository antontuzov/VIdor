/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_TURN_SERVER: string
  readonly VITE_TURN_USERNAME: string
  readonly VITE_TURN_PASSWORD: string
  readonly VITE_QWEN_API_KEY?: string
  readonly VITE_APP_MODE: 'development' | 'production' | 'test'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
