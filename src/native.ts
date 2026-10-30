import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Application native (Capacitor, voir docs/NATIF-CAPACITOR.md). Dans le navigateur, tout
 * ce qui suit est sans effet : la version web reste la même.
 */
export const isNative = Capacitor.isNativePlatform();

/**
 * Adresse publique du jeu. Dans l'appli, la page n'est pas servie par le site : le duel en
 * ligne et les liens d'invitation passent par cette adresse.
 */
export const SITE_ORIGIN = 'https://tomettes.calanquesunited.com';

/** Origine du site (serveur du duel, liens à partager). */
export function siteOrigin(): string {
  return isNative ? SITE_ORIGIN : location.origin;
}

/** Début des adresses WebSocket du serveur (« wss://hôte »). */
export function socketBase(): string {
  const o = new URL(siteOrigin());
  return `${o.protocol === 'https:' ? 'wss:' : 'ws:'}//${o.host}`;
}

/** Page du jeu, pour un lien à partager (dans l'appli : la page d'accueil du site). */
export function sitePage(): string {
  return isNative ? `${SITE_ORIGIN}/` : `${location.origin}${location.pathname}`;
}

/*
 * Sauvegardes : iOS peut vider le stockage d'une vue web quand l'appareil manque de place.
 * En natif, chaque écriture est doublée dans les Préférences de l'appli (stockage natif,
 * conservé), et rechargée au lancement si le stockage de la vue web a été vidé.
 */
const PREFIX = 'tomettes.';

/** Recopie une écriture du stockage local dans les Préférences (`null` : suppression). */
export function mirror(key: string, value: string | null): void {
  if (!isNative || !key.startsWith(PREFIX)) return;
  (value === null ? Preferences.remove({ key }) : Preferences.set({ key, value })).catch(() => {
    /* ignoré : la copie locale reste */
  });
}

/**
 * Au lancement : remet dans le stockage local les sauvegardes qui n'y sont plus.
 * Renvoie true si quelque chose a été restauré (il faut alors recharger la page,
 * la langue et les réglages ayant déjà été lus).
 */
export async function restoreSaves(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const { keys } = await Preferences.keys();
    let restored = false;
    for (const key of keys) {
      if (!key.startsWith(PREFIX) || localStorage.getItem(key) !== null) continue;
      const { value } = await Preferences.get({ key });
      if (value === null) continue;
      localStorage.setItem(key, value);
      restored = true;
    }
    // Première version avec ce mécanisme : les sauvegardes existantes sont recopiées.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX) && !keys.includes(key)) mirror(key, localStorage.getItem(key));
    }
    return restored;
  } catch {
    return false;
  }
}

/** Barre d'état (heure, batterie) lisible sur le haut de la page : texte foncé sur fond clair. */
export function statusBarFor(background: string): void {
  if (!isNative) return;
  const m = /^#?([0-9a-f]{6})$/i.exec(background.trim());
  if (!m) return;
  const n = parseInt(m[1], 16);
  const lum = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  StatusBar.setStyle({ style: lum > 140 ? Style.Light : Style.Dark }).catch(() => {});
}

/** Écran de démarrage retiré dès que le jeu est affiché. */
export function hideSplash(): void {
  if (isNative) SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
}

/** Vibrations (iPhone : moteur haptique) : impossibles dans Safari, possibles dans l'appli. */
export type Buzz = 'light' | 'medium' | 'heavy' | 'warning' | 'success' | 'error';

const IMPACT: Partial<Record<Buzz, ImpactStyle>> = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
const NOTIFY: Partial<Record<Buzz, NotificationType>> = { warning: NotificationType.Warning, success: NotificationType.Success, error: NotificationType.Error };
let lastBuzz = 0;

/** Une vibration ; plusieurs dans la même image n'en font qu'une (la première). */
export function buzz(kind: Buzz): void {
  if (!isNative) return;
  const now = performance.now();
  if (now - lastBuzz < 60) return;
  lastBuzz = now;
  const impact = IMPACT[kind];
  const done = impact !== undefined ? Haptics.impact({ style: impact }) : Haptics.notification({ type: NOTIFY[kind]! });
  done.catch(() => {});
}
