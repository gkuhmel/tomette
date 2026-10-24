import type { Order } from '../core/orders';
import { t, Key } from '../i18n';
import { el } from './dom';

/** Décalages (en rayons) des voisins d'un hexagone à plat : haut, haut-droite, bas-droite, bas, bas-gauche, haut-gauche. */
const S3 = Math.sqrt(3);
const RING_XY: [number, number][] = [
  [0, -S3],
  [1.5, -S3 / 2],
  [1.5, S3 / 2],
  [0, S3],
  [-1.5, S3 / 2],
  [-1.5, -S3 / 2],
];

function hex(x: number, y: number, r: number, fill: string, stroke = ''): string {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    d += `${i ? 'L' : 'M'}${(x + r * Math.cos(a)).toFixed(2)} ${(y + r * Math.sin(a)).toFixed(2)}`;
  }
  return `<path d="${d}Z" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="0.25"` : ''}/>`;
}

/** Dessin du motif commandé (petits hexagones dans la couleur demandée). */
export function orderSvg(o: Order): string {
  const col = o.color >= 0 ? `var(--t${o.color})` : 'var(--t4)';
  const r = 0.92;
  let cells: [number, number, string][] = [];
  const at = (i: number): [number, number] => RING_XY[i];
  switch (o.kind) {
    case 'triangle':
      cells = [[0, 0, col], [...at(0), col], [...at(1), col]];
      break;
    case 'arc':
      cells = [[0, 0, 'var(--card)'], ...[0, 1, 2, 3].map((i): [number, number, string] => [...at(i), col])];
      break;
    case 'rosace':
      cells = [[0, 0, '#f2c94c'], ...[0, 1, 2, 3, 4, 5].map((i): [number, number, string] => [...at(i), col])];
      break;
    case 'combo5':
      cells = [-2, -1, 0, 1, 2].map((k): [number, number, string] => [0, k * S3 * 0.62, 'var(--t1)']);
      break;
    case 'chain3':
      return `<svg viewBox="-3 -3 6 6" aria-hidden="true"><text x="0" y="1.1" text-anchor="middle" font-size="3.4" font-weight="900" fill="var(--t0)" font-family="Fredoka, sans-serif">×3</text></svg>`;
  }
  const scale = o.kind === 'combo5' ? 0.62 : 1;
  // Cadrage serré sur le motif, carré.
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + r * scale + 0.15;
  return `<svg viewBox="${(cx - half).toFixed(2)} ${(cy - half).toFixed(2)} ${(half * 2).toFixed(2)} ${(half * 2).toFixed(2)}" aria-hidden="true">${cells
    .map(([x, y, f]) => hex(x, y, r * scale, f, f === 'var(--card)' ? 'var(--muted)' : ''))
    .join('')}</svg>`;
}

/** Pastille de commande du HUD : le motif et son nom. */
export function orderChip(): { root: HTMLElement; set(o: Order | null): void } {
  const art = el('span', { class: 'oc-art' });
  const label = el('small');
  const root = el('div', { id: 'order-chip' }, [art, label]);
  let key = '';
  return {
    root,
    set(o) {
      const k = o ? `${o.kind}:${o.color}` : '';
      if (k === key) return;
      key = k;
      root.hidden = !o;
      if (!o) return;
      art.innerHTML = orderSvg(o);
      label.textContent = t(`order.${o.kind}` as Key);
      root.classList.remove('new');
      void root.offsetWidth;
      root.classList.add('new');
    },
  };
}
