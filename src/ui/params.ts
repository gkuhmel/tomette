import type { ConfigKey } from '../config';

export interface ParamMeta {
  key: ConfigKey;
  label: string;
  help: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  /** Liste de choix (affichée en menu déroulant). */
  options?: string[];
  /** Interrupteur 0/1. */
  toggle?: boolean;
}

export interface ParamSection {
  title: string;
  params: ParamMeta[];
}

/** Description de chaque réglage du panneau de debug, regroupés par section. */
export const PARAM_SECTIONS: ParamSection[] = [
  {
    title: 'Grille',
    params: [
      { key: 'columns', label: 'Colonnes', help: 'Nombre de colonnes de la grille.', min: 5, max: 11, step: 1 },
      { key: 'rows', label: 'Rangées', help: 'Hauteur de la grille (rangées visibles).', min: 8, max: 16, step: 1 },
      { key: 'colors', label: 'Couleurs', help: 'Nombre de couleurs de tuiles. Moins de couleurs = plus facile.', min: 3, max: 6, step: 1 },
      { key: 'initialRows', label: 'Rangées au départ', help: 'Rangées déjà remplies en début de partie.', min: 1, max: 10, step: 1 },
    ],
  },
  {
    title: 'Vitesse de la pile',
    params: [
      { key: 'baseSecondsPerRow', label: 'Vitesse de départ', help: 'Temps pour monter d\'une rangée au niveau 1. Plus grand = plus lent.', unit: 's/rangée', min: 2, max: 30, step: 0.5 },
      { key: 'speedFactor', label: 'Accélération', help: 'À chaque niveau, le temps par rangée est multiplié par ce facteur. 0,80 accélère vite, 0,95 doucement, 1 jamais.', min: 0.7, max: 1, step: 0.01 },
      { key: 'minSecondsPerRow', label: 'Vitesse max', help: 'Plancher : la pile ne monte jamais plus vite que ça.', unit: 's/rangée', min: 0.5, max: 10, step: 0.1 },
      { key: 'levelDurationS', label: 'Durée d\'un niveau', help: 'Temps de jeu entre deux niveaux.', unit: 's', min: 10, max: 120, step: 5 },
      { key: 'manualRiseSecondsPerRow', label: 'Montée manuelle', help: 'Vitesse quand on maintient « Monter » (ou Espace).', unit: 's/rangée', min: 0.05, max: 2, step: 0.05 },
    ],
  },
  {
    title: 'Éboulement',
    params: [
      { key: 'slide', label: 'Éboulement activé', help: 'Le sommet d\'une pile nettement plus haute que sa voisine glisse en biais vers elle. Évite les piles sur les côtés et le creux au milieu.', min: 0, max: 1, step: 1, toggle: true },
      { key: 'slideMinDrop', label: 'Écart minimal', help: 'Nombre de cases vides sous la case en biais pour que la tuile glisse. 1 = très fluide (tout s\'aplanit), 3 = seulement les grosses piles.', unit: 'cases', min: 1, max: 4, step: 1 },
      { key: 'slideMs', label: 'Durée du glissement', help: 'Durée de l\'animation de glissement.', unit: 'ms', min: 60, max: 400, step: 20 },
    ],
  },
  {
    title: 'Pauses et danger',
    params: [
      { key: 'chainPauseBaseS', label: 'Pause de chaîne', help: 'Arrêt de la pile pour une chaîne ×2.', unit: 's', min: 0, max: 5, step: 0.1 },
      { key: 'chainPausePerLinkS', label: 'Pause par maillon', help: 'Ajouté à la pause pour chaque maillon de chaîne (×2, ×3…).', unit: 's', min: 0, max: 3, step: 0.1 },
      { key: 'comboPausePerExtraTileS', label: 'Pause de combo', help: 'Arrêt de la pile par tuile au-delà de 3 dans un même clear.', unit: 's', min: 0, max: 2, step: 0.05 },
      { key: 'warnRows', label: 'Zone d\'attention', help: 'Bord orange quand une tuile entre dans ces rangées du haut. 0 = désactivée.', unit: 'rangées', min: 0, max: 6, step: 1 },
      { key: 'graceS', label: 'Délai de grâce', help: 'Quand une tuile touche le haut : temps pour faire un alignement avant de perdre.', unit: 's', min: 0.5, max: 8, step: 0.5 },
    ],
  },
  {
    title: 'Score',
    params: [
      { key: 'pointsPerTile', label: 'Points par tuile', help: 'Points pour chaque tuile qui disparaît.', min: 1, max: 100, step: 1 },
      { key: 'comboBonusPerExtraTile', label: 'Bonus de combo', help: 'Bonus par tuile au-delà de 3 dans un même clear.', min: 0, max: 200, step: 5 },
    ],
  },
  {
    title: 'Rosace',
    params: [
      { key: 'rosace', label: 'Rosace activée', help: 'Active la rosace et la tomette d\'or.', min: 0, max: 1, step: 1, toggle: true },
      { key: 'rosaceMin', label: 'Voisines nécessaires', help: 'Nombre de voisines de même couleur autour du centre (5 ou 6).', min: 5, max: 6, step: 1 },
      { key: 'rosaceBonus', label: 'Bonus de rosace', help: 'Points en plus pour une rosace (multipliés par la chaîne).', min: 0, max: 2000, step: 50 },
      { key: 'rosacePauseS', label: 'Pause de rosace', help: 'Arrêt de la pile après une rosace.', unit: 's', min: 0, max: 10, step: 0.5 },
    ],
  },
  {
    title: 'Gestes et animations',
    params: [
      { key: 'swapDurationMs', label: 'Durée d\'échange', help: 'Durée de l\'animation d\'échange ; on ne peut pas ré-échanger pendant ce temps.', unit: 'ms', min: 30, max: 300, step: 10 },
      { key: 'hoverMs', label: 'Suspension', help: 'Temps pendant lequel une tuile sans support flotte avant de tomber (laisse le temps de glisser dessous).', unit: 'ms', min: 0, max: 500, step: 10 },
      { key: 'fallCellsPerSecond', label: 'Vitesse de chute', help: 'Vitesse à laquelle les tuiles tombent.', unit: 'cases/s', min: 5, max: 60, step: 1 },
      { key: 'clearDurationMs', label: 'Durée de disparition', help: 'Temps de clignotement avant qu\'un alignement disparaisse (la pile est arrêtée pendant ce temps).', unit: 'ms', min: 200, max: 1500, step: 50 },
    ],
  },
  {
    title: 'Tuiles spéciales',
    params: [
      { key: 'crackedChance', label: 'Tomettes fêlées', help: 'Probabilité qu\'une tuile d\'une nouvelle rangée soit fêlée : elle ne s\'aligne pas tant qu\'un alignement voisin ne l\'a pas réparée. 0 = jamais.', min: 0, max: 0.3, step: 0.01 },
      { key: 'sealedChance', label: 'Tuiles scellées', help: 'Probabilité d\'une tuile scellée : impossible à déplacer tant qu\'un alignement voisin ne l\'a pas libérée. 0 = jamais.', min: 0, max: 0.3, step: 0.01 },
      { key: 'farandole', label: 'Farandole', help: '5 tuiles d\'une même couleur qui se suivent en file, sans embranchement, formées par le joueur : elles disparaissent ; 5 tuiles donnent un joker à la voisine la plus haute, 6 et plus une cigale (qui efface sa rangée quand elle disparaît).', min: 0, max: 1, step: 1, toggle: true },
      { key: 'farandoleBonus', label: 'Bonus de farandole', help: 'Points d\'une farandole de 5 (multipliés par la chaîne en cours), +50 % par tuile en plus.', min: 0, max: 1500, step: 50 },
      { key: 'farandoleCicadaMin', label: 'Farandole à cigale', help: 'Longueur de farandole qui donne une cigale au lieu d\'un joker (5 avec la carte Cigale de l\'Expédition).', min: 5, max: 8, step: 1 },
      { key: 'farandolePauseS', label: 'Pause de farandole', help: 'Pause de la pile après une farandole.', unit: 's', min: 0, max: 6, step: 0.5 },
      { key: 'orderBonus', label: 'Bonus de commande', help: 'Points gagnés quand on réalise le motif commandé (affiché sous le score).', min: 0, max: 2000, step: 50 },
      { key: 'orderPauseS', label: 'Pause de commande', help: 'Pause de la pile quand une commande est réalisée.', unit: 's', min: 0, max: 6, step: 0.5 },
      { key: 'fireworks', label: 'Feu d\'artifice', help: 'Une chaîne ×3 ou plus fait aussi exploser les tuiles autour de la série (carte d\'Expédition).', min: 0, max: 1, step: 1, toggle: true },
      { key: 'mistralEveryS', label: 'Mistral', help: 'Toutes les N secondes, le vent souffle la tuile du haut de chaque colonne (carte d\'Expédition). 0 = jamais.', unit: 's', min: 0, max: 60, step: 5 },
      { key: 'rosaceJokers', label: 'Rosace arc-en-ciel', help: 'Nombre de tuiles voisines d\'une rosace transformées en jokers (carte d\'Expédition).', min: 0, max: 6, step: 1 },
      { key: 'mortarEveryS', label: 'Dalles de mortier', help: 'Intervalle moyen entre deux dalles de mortier qui tombent du haut. Une dalle ne bouge pas et ne s\'aligne pas ; un alignement qui la touche la transforme en tuiles normales (qui peuvent prolonger une chaîne). 0 = jamais.', unit: 's', min: 0, max: 120, step: 5 },
      { key: 'mortarFromLevel', label: 'Mortier dès le niveau', help: 'Niveau à partir duquel les dalles de mortier commencent à tomber.', min: 1, max: 15, step: 1 },
      { key: 'mortarMinW', label: 'Largeur min. des dalles', help: 'Largeur minimale d\'une dalle de mortier, en tuiles.', min: 1, max: 8, step: 1 },
      { key: 'mortarMaxW', label: 'Largeur max. des dalles', help: 'Largeur maximale d\'une dalle de mortier, en tuiles.', min: 1, max: 8, step: 1 },
      { key: 'jokerChance', label: 'Jokers', help: 'Probabilité d\'un joker : il compte comme n\'importe quelle couleur dans un alignement. 0 = jamais.', min: 0, max: 0.1, step: 0.005 },
    ],
  },
  {
    title: 'Modes',
    params: [
      { key: 'timeAttackS', label: 'Contre-la-montre', help: 'Durée d\'une partie en mode Contre-la-montre.', unit: 's', min: 30, max: 600, step: 15 },
      { key: 'mosaicS', label: 'Mosaïque', help: 'Durée d\'une partie en mode Mosaïque.', unit: 's', min: 30, max: 600, step: 15 },
      { key: 'expressLevel', label: 'Express', help: 'Niveau de départ du mode Express.', min: 2, max: 20, step: 1 },
    ],
  },
  {
    title: 'Apparence',
    params: [
      { key: 'theme', label: 'Thème', help: 'Look du jeu, appliqué immédiatement.', min: 0, max: 7, step: 1, options: ['Terre cuite', 'Pastel clair', 'Pastel sombre', 'Faïence', 'Lavande', 'Calanques', 'Ocre', 'Nuit'] },
      { key: 'glyphs', label: 'Pictogrammes', help: 'Dessins sur les tuiles. Pour le joueur, les jeux autres que Classique se débloquent avec le niveau.', min: 0, max: 4, step: 1, options: ['Classique', 'Provence', 'Mer', 'Jardin', 'Étoiles'] },
      { key: 'animations', label: 'Effets visuels', help: 'Éclats aux disparitions, écrasement à l\'atterrissage, pétales de rosace, bandeau de niveau, score qui défile.', min: 0, max: 1, step: 1, toggle: true },
      { key: 'screenShake', label: 'Tremblement d\'écran', help: 'Petit tremblement sur les chaînes ×3 et plus, les rosaces et les gros combos.', min: 0, max: 1, step: 1, toggle: true },
    ],
  },
];
