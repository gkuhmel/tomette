/**
 * Mesure d'audience (Umami, sans cookie) et remontée d'erreurs (Sentry).
 * Les deux ne s'activent que si leurs identifiants sont fournis au build
 * (variables de build Cloudflare) ; sinon rien n'est chargé ni envoyé.
 */

type UmamiData = Record<string, string | number | boolean>;
declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiData) => void };
  }
}

const UMAMI_ID = import.meta.env.VITE_UMAMI_ID;
const UMAMI_SRC = import.meta.env.VITE_UMAMI_SRC || 'https://cloud.umami.is/script.js';
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initTelemetry(): void {
  if (UMAMI_ID) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = UMAMI_SRC;
    s.dataset.websiteId = UMAMI_ID;
    // Pas de suivi des paramètres d'adresse (ex. ?dev=1).
    s.dataset.excludeSearch = 'true';
    document.head.append(s);
  }
  if (SENTRY_DSN) {
    import('@sentry/browser')
      .then((Sentry) => {
        Sentry.init({
          dsn: SENTRY_DSN,
          release: `tomettes@${__APP_VERSION__}`,
          tracesSampleRate: 0,
        });
      })
      .catch(() => {
        /* hors ligne : pas de remontée d'erreurs */
      });
  }
}

/** Évènement anonyme (mode joué, fin de partie…). Sans effet si Umami n'est pas configuré. */
export function track(event: string, data?: UmamiData): void {
  try {
    window.umami?.track(event, data);
  } catch {
    /* ignoré */
  }
}

/** Arrondit une valeur en tranche, pour ne jamais envoyer de valeur exacte. */
export function bucket(n: number, steps: number[]): string {
  for (let i = 0; i < steps.length; i++) if (n < steps[i]) return i === 0 ? `<${steps[0]}` : `${steps[i - 1]}-${steps[i]}`;
  return `${steps[steps.length - 1]}+`;
}
