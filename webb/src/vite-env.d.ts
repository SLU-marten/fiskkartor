/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** CARTO:s webbläsarnyckel, satt vid bygget (GitHub-variabeln CARTO_NYCKEL). */
  readonly VITE_CARTO_NYCKEL?: string;
}
