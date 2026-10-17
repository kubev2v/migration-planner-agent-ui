/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_BASEPATH: string;
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
