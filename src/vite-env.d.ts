/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth2 access token организатора Timepad. */
  readonly VITE_TIMEPAD_TOKEN?: string;
  /** client_id приложения Timepad. */
  readonly VITE_TIMEPAD_CLIENT_ID?: string;
  /** id события, участников которого контролируем на входе. */
  readonly VITE_TIMEPAD_EVENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
