import { Rng } from './rng';

/**
 * Commandes de motifs : un motif à réaliser est proposé au joueur ; le réussir
 * rapporte un bonus (points, pause de la pile, une tomette d'or toutes les 3 commandes).
 * - triangle, losange, arc : la forme, dans la couleur demandée, construite par le joueur ;
 * - rosace : une rosace de n'importe quelle couleur ;
 * - combo5 : 5 tuiles ou plus d'un coup ;
 * - chain3 : une chaîne ×3.
 */
export type OrderKind = 'triangle' | 'losange' | 'arc' | 'rosace' | 'combo5' | 'chain3';

export interface Order {
  kind: OrderKind;
  /** Couleur demandée (-1 : n'importe laquelle). */
  color: number;
}

const KINDS: { kind: OrderKind; weight: number; colored: boolean }[] = [
  { kind: 'triangle', weight: 3, colored: true },
  { kind: 'losange', weight: 3, colored: true },
  { kind: 'arc', weight: 2, colored: true },
  { kind: 'combo5', weight: 2, colored: false },
  { kind: 'chain3', weight: 1, colored: false },
  { kind: 'rosace', weight: 1, colored: false },
];

/** Commande suivante (jamais deux fois le même motif d'affilée). */
export function nextOrder(rng: Rng, colors: number, prev: OrderKind | null): Order {
  const pool = KINDS.filter((k) => k.kind !== prev);
  let roll = rng.next() * pool.reduce((n, k) => n + k.weight, 0);
  let pick = pool[0];
  for (const k of pool) {
    roll -= k.weight;
    if (roll < 0) {
      pick = k;
      break;
    }
  }
  return { kind: pick.kind, color: pick.colored ? rng.int(colors) : -1 };
}
