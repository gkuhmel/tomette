/**
 * Tous les paramètres réglables du jeu. L'objet `config` est muté en direct
 * par le panneau de debug ; la logique le relit à chaque tick.
 */
export const defaultConfig = {
  columns: 8,
  rows: 11,
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
  /** Losange : 4 tuiles d'une couleur en losange disparaissent (1 = activé) et la voisine la plus haute devient un joker. */
  losange: 1,
  losangeBonus: 200,
  /** Commandes de motifs (modes Classique, Contre-la-montre, Mosaïque, Express) : bonus et pause de la pile. */
  orderBonus: 400,
  orderPauseS: 2,
  /** Cartes d'Expédition (0 = désactivé) : feu d'artifice sur les chaînes ×3, mistral, rosaces qui créent des jokers. */
  fireworks: 0,
  mistralEveryS: 0,
  rosaceJokers: 0,
  /** Thème graphique : 0 = terre cuite, 1 = pastel clair, 2 = pastel sombre. */
  /** Tuiles spéciales dans les nouvelles rangées (probabilité par tuile, 0 = jamais). */
  crackedChance: 0.05,
  sealedChance: 0.03,
  jokerChance: 0.015,
  /** Dalles de mortier : une dalle tombe du haut environ toutes les `mortarEveryS` secondes (0 = jamais). */
  mortarEveryS: 35,
  /** Niveau à partir duquel les dalles tombent. */
  mortarFromLevel: 3,
  /** Largeur des dalles (en tuiles), tirée entre min et max. */
  mortarMinW: 2,
  mortarMaxW: 4,
  /** Éboulement : une pile plus haute que sa voisine glisse en biais (1 = activé). */
  slide: 1,
  /** Différence de hauteur (en cases) à partir de laquelle une pile s'éboule. */
  slideMinDrop: 2,
  /** Durée du glissement (ms). */
  slideMs: 140,
  /** Durées et niveau de départ des modes. */
  timeAttackS: 120,
  mosaicS: 180,
  expressLevel: 8,
  theme: 3,
  /** Jeu de pictogrammes des tuiles : 0 = classique, puis Provence, Mer, Jardin, Étoiles. */
  glyphs: 0,
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
