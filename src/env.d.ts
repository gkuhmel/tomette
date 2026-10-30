/// <reference types="vite/client" />

/** Version du jeu (package.json), injectée au build. */
declare const __APP_VERSION__: string;
/** Outils de développement compilés (voir vite.config.ts). */
declare const __DEV_TOOLS__: boolean;

interface ImportMetaEnv {
  /** Adresse de contact affichée dans « À propos » (optionnel). */
  readonly VITE_CONTACT_EMAIL?: string;
  /** Mesure d'audience Umami : identifiant du site et adresse du script (optionnels). */
  readonly VITE_UMAMI_ID?: string;
  readonly VITE_UMAMI_SRC?: string;
  /** Remontée d'erreurs Sentry : DSN du projet (optionnel). */
  readonly VITE_SENTRY_DSN?: string;
}
