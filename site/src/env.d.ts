/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** `1` includes draft case studies in a production build (used by the e2e tests). */
  readonly SHOW_DRAFTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
