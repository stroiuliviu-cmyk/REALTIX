/// <reference types="vite/client" />

// Variabilele de mediu expuse de Vite către client (prefix VITE_).
interface ImportMetaEnv {
  /** 'false' → transportul SSE real al asistentului; orice altceva → MockTransport */
  readonly VITE_ASSISTANT_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
