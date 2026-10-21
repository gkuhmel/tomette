/**
 * Tous les paramètres réglables du jeu. L'objet `config` est muté en direct
 * par le panneau de debug ; la logique le relit à chaque tick.
 */
export const defaultConfig = {
  columns: 8,
  rows: 12,
  colors: 6,
  initialRows: 4,
  baseSecondsPerRow: 16,
  speedFactor: 0.88,
  minSecondsPerRow: 1.5,
  levelDurationS: 30,
  manualRiseSecondsPerRow: 0.25,
  chainPauseBaseS: 1,
  chainPausePerLinkS: 0.5,
  comboPausePerExtraTileS: 0.3,
  graceS: 3,
  /** Zone d'attention : nombre de rangées du haut surveillées (0 = désactivée). */
  warnRows: 3,
  swapDurationMs: 100,
  hoverMs: 120,
  fallCellsPerSecond: 20,
  clearDurationMs: 600,
  pointsPerTile: 10,
  comboBonusPerExtraTile: 30,
  /** Rosace : 6 tuiles de même couleur autour d'une autre (1 = activée, 0 = désactivée). */
  rosace: 1,
  /** Nombre de voisines de même couleur nécessaires (5 ou 6). */
  rosaceMin: 5,
  rosaceBonus: 500,
  rosacePauseS: 3,
  /** Thème graphique : 0 = terre cuite, 1 = pastel clair, 2 = pastel sombre. */
  /** Tuiles spéciales dans les nouvelles rangées (probabilité par tuile, 0 = jamais). */
  crackedChance: 0.05,
  sealedChance: 0.03,
  jokerChance: 0.015,
  /** Durées et niveau de départ des modes. */
  timeAttackS: 120,
  mosaicS: 180,
  expressLevel: 8,
  theme: 3,
  /** Réglages du joueur : effets sonores et musique (1 = activés). */
  sound: 1,
  music: 1,
  /** Effets visuels (éclats, écrasement, bandeau de niveau…) : 1 = activés. */
  animations: 1,
  /** Tremblement d'écran sur les grosses chaînes : 1 = activé. */
  screenShake: 1,
};

export type Config = typeof defaultConfig;
export type ConfigKey = keyof Config;

/** Paramètres structurels : appliqués au prochain redémarrage seulement. */
export const structuralKeys: ConfigKey[] = ['columns', 'rows', 'colors', 'initialRows'];

export const config: Config = { ...defaultConfig };
