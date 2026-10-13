import type { GameStats } from './game';
import type { ModeId } from './modes';

/** Statistiques cumulées sur toutes les parties. */
export interface Totals {
  games: number;
  timeS: number;
  tiles: number;
  rosaces: number;
  gold: number;
  repairs: number;
  alertSaves: number;
  bestChain: number;
  bestCombo: number;
  bestLevel: number;
  bestRosaces: number;
  gamesByMode: Partial<Record<ModeId, number>>;
}

/** Ce qu'on sait d'une partie (en cours ou finie). */
export interface Snapshot {
  mode: ModeId;
  score: number;
  elapsed: number;
  rosaces: number;
  stats: GameStats;
}

export function emptyTotals(): Totals {
  return {
    games: 0, timeS: 0, tiles: 0, rosaces: 0, gold: 0, repairs: 0, alertSaves: 0,
    bestChain: 1, bestCombo: 0, bestLevel: 1, bestRosaces: 0, gamesByMode: {},
  };
}

/** Totaux en comptant la partie `g` (finie : `finished` incrémente le nombre de parties). */
export function withGame(t: Totals, g: Snapshot, finished: boolean): Totals {
  const s = g.stats;
  return {
    games: t.games + (finished ? 1 : 0),
    timeS: t.timeS + g.elapsed,
    tiles: t.tiles + s.tilesCleared,
    rosaces: t.rosaces + g.rosaces,
    gold: t.gold + s.goldUsed,
    repairs: t.repairs + s.repairs,
    alertSaves: t.alertSaves + s.alertSaves,
    bestChain: Math.max(t.bestChain, s.maxChain),
    bestCombo: Math.max(t.bestCombo, s.maxCombo),
    bestLevel: Math.max(t.bestLevel, s.maxLevel),
    bestRosaces: Math.max(t.bestRosaces, g.rosaces),
    gamesByMode: finished ? { ...t.gamesByMode, [g.mode]: (t.gamesByMode[g.mode] ?? 0) + 1 } : t.gamesByMode,
  };
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  /** `t` inclut déjà la partie `g` (en cours ou finie). */
  check: (t: Totals, g: Snapshot | null) => boolean;
}

const inMode = (g: Snapshot | null, mode: ModeId) => g !== null && g.mode === mode;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', name: 'Premier pas', desc: 'Terminer une première partie.', check: (t) => t.games >= 1 },
  { id: 'chain2', name: 'En chaîne', desc: 'Faire une chaîne ×2.', check: (t) => t.bestChain >= 2 },
  { id: 'chain3', name: 'Réaction en chaîne', desc: 'Faire une chaîne ×3.', check: (t) => t.bestChain >= 3 },
  { id: 'chain4', name: 'Cascade', desc: 'Faire une chaîne ×4.', check: (t) => t.bestChain >= 4 },
  { id: 'chain5', name: 'Avalanche', desc: 'Faire une chaîne ×5.', check: (t) => t.bestChain >= 5 },
  { id: 'combo5', name: 'Grand ménage', desc: 'Faire disparaître 5 tuiles d\'un coup.', check: (t) => t.bestCombo >= 5 },
  { id: 'combo7', name: 'Coup de balai', desc: 'Faire disparaître 7 tuiles d\'un coup.', check: (t) => t.bestCombo >= 7 },
  { id: 'rosace1', name: 'Première rosace', desc: 'Réaliser une rosace.', check: (t) => t.rosaces >= 1 },
  { id: 'rosace5', name: 'Mosaïste', desc: '5 rosaces dans une même partie.', check: (t) => t.bestRosaces >= 5 },
  { id: 'rosace25', name: 'Maître carreleur', desc: '25 rosaces au total.', check: (t) => t.rosaces >= 25 },
  { id: 'gold', name: 'Pépite', desc: 'Utiliser une tomette d\'or.', check: (t) => t.gold >= 1 },
  { id: 'repair10', name: 'Restaurateur', desc: 'Réparer ou libérer 10 tuiles.', check: (t) => t.repairs >= 10 },
  { id: 'save', name: 'Sang-froid', desc: 'Faire un alignement pendant l\'alerte.', check: (t) => t.alertSaves >= 1 },
  { id: 'score5k', name: 'Bien parti', desc: '5 000 points dans une partie.', check: (_t, g) => !!g && g.score >= 5000 },
  { id: 'score20k', name: 'Belle série', desc: '20 000 points dans une partie.', check: (_t, g) => !!g && g.score >= 20000 },
  { id: 'score50k', name: 'Virtuose', desc: '50 000 points dans une partie.', check: (_t, g) => !!g && g.score >= 50000 },
  { id: 'level10', name: 'À toute vitesse', desc: 'Atteindre le niveau 10.', check: (t) => t.bestLevel >= 10 },
  { id: 'survive5', name: 'Endurant', desc: 'Tenir 5 minutes en Classique.', check: (_t, g) => inMode(g, 'endless') && g!.elapsed >= 300 },
  { id: 'express3', name: 'Train express', desc: 'Tenir 3 minutes en Express.', check: (_t, g) => inMode(g, 'express') && g!.elapsed >= 180 },
  { id: 'chrono3k', name: 'Chrono maîtrisé', desc: '3 000 points en Contre-la-montre.', check: (_t, g) => inMode(g, 'timeAttack') && g!.score >= 3000 },
  { id: 'games25', name: 'Habitué', desc: 'Jouer 25 parties.', check: (t) => t.games >= 25 },
  { id: 'games100', name: 'Passionné', desc: 'Jouer 100 parties.', check: (t) => t.games >= 100 },
];

/** Succès nouvellement obtenus. */
export function newlyUnlocked(t: Totals, g: Snapshot | null, unlocked: ReadonlySet<string>): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.check(t, g));
}
