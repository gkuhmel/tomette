import type { ModeId } from './modes';

/**
 * Version gratuite et version complète (achat intégré unique, « Tomettes complet »).
 *
 * Gratuit : Classique, campagne manches 1 à 10, duels (ordinateur et en ligne),
 * une expédition par jour, tous les thèmes gagnés en montant de niveau.
 * Complet : campagne 11 à 30, expédition sans limite, Contre-la-montre, Mosaïque,
 * Express, et le thème Tomettes (dès l'achat, sans attendre le niveau).
 */

/** Identifiant du produit dans App Store Connect (non consommable). */
export const FULL_PRODUCT = 'com.calanquesunited.tomettes.full';

/** Dernière manche de campagne jouable sans l'achat. */
export const FREE_STAGES = 10;

/** Modes réservés à la version complète. */
export const PREMIUM_MODES: readonly ModeId[] = ['timeAttack', 'mosaic', 'express'];

/** Thème réservé à la version complète (indice dans THEMES : les vraies tomettes). */
export const PREMIUM_THEME = 12;

/** Ce que demande le joueur quand l'écran d'achat s'ouvre (pour la phrase d'accroche). */
export type LockReason = 'mode' | 'stage' | 'expedition' | 'theme' | 'menu';

export function modeLocked(mode: ModeId, premium: boolean): boolean {
  return !premium && PREMIUM_MODES.includes(mode);
}

export function stageLocked(stage: number, premium: boolean): boolean {
  return !premium && stage > FREE_STAGES;
}

export function themeLocked(index: number, premium: boolean): boolean {
  return !premium && index === PREMIUM_THEME;
}

/** Jour local « AAAA-MM-JJ » (l'expédition gratuite revient chaque jour à minuit). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Une nouvelle expédition peut-elle commencer ? (`lastFreeDay` : jour de la dernière expédition gratuite) */
export function expeditionAllowed(premium: boolean, lastFreeDay: string, today: string): boolean {
  return premium || lastFreeDay !== today;
}
