import { t } from '../i18n';
import { el } from './dom';
import { logoSvg } from './home-bg';
import { Screen } from './screens';

/** Mesure d'audience ou remontée d'erreurs configurées pour ce déploiement ? */
export const telemetryEnabled = !!(import.meta.env.VITE_UMAMI_ID || import.meta.env.VITE_SENTRY_DSN);

/** Écran « À propos » : version, crédits, confidentialité. */
export function aboutScreen(onBack: () => void): Screen {
  const logo = el('div', { class: 'logo-wrap' });
  logo.innerHTML = logoSvg(72);
  const back = el('button', { type: 'button', class: 'btn primary' }, [t('common.back')]);
  back.addEventListener('click', onBack);
  const email = import.meta.env.VITE_CONTACT_EMAIL;
  return new Screen('screen-about', [
    el('div', { class: 'panel about' }, [
      logo,
      el('h2', {}, ['Tomettes']),
      el('p', { class: 'about-tagline' }, [t('about.tagline')]),
      el('p', { class: 'about-version' }, [t('about.version', { v: __APP_VERSION__ })]),
      el('p', {}, [t('about.made')]),
      ...(email ? [el('p', {}, [t('about.contact', { email })])] : []),
      el('h3', {}, [t('about.privacyTitle')]),
      el('p', {}, [t('about.privacy1')]),
      ...(telemetryEnabled ? [el('p', {}, [t('about.privacy2')])] : []),
      el('p', {}, [t('about.privacy3')]),
      el('div', { class: 'home-buttons' }, [back]),
    ]),
  ]);
}
