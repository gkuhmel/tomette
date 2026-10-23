import { el } from './dom';

/** Pictogrammes (traits arrondis, 24 × 24). */
const ICONS = {
  play: '<path class="f" d="M7 4.5v15l13-7.5z"/>',
  pause: '<rect class="f" x="6.5" y="5" width="3.5" height="14" rx="1"/><rect class="f" x="14" y="5" width="3.5" height="14" rx="1"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4"/><circle class="f" cx="12" cy="17" r=".6"/>',
  restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v4h4"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>',
  flower: '<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="6" r="2.6"/><circle cx="12" cy="18" r="2.6"/><circle cx="6.8" cy="9" r="2.6"/><circle cx="17.2" cy="9" r="2.6"/><circle cx="6.8" cy="15" r="2.6"/><circle cx="17.2" cy="15" r="2.6"/>',
  bolt: '<path class="f" d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="on" d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/><path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path class="off" d="M3.5 3.5l17 17"/>',
  up: '<path d="M6 14.5 12 8.5l6 6"/>',
  swords: '<path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4"/><path d="M7 14l3 3M17 14l-3 3M5 19l3-3M19 19l-3-3"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle class="f" cx="12" cy="12" r="1.4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path class="f" d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  flag: '<path d="M6 21V4"/><path class="f" d="M6 4h12l-2.5 4L18 12H6z"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): string {
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

/** Hexagone à plat aux coins arrondis (chemin SVG). */
export function roundHexPathD(cx: number, cy: number, r: number, k: number): string {
  const p: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const u = Math.min(0.45, k / r);
  const lerp = (a: [number, number], b: [number, number]) => `${(a[0] + (b[0] - a[0]) * u).toFixed(2)} ${(a[1] + (b[1] - a[1]) * u).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < 6; i++) {
    const P = p[i];
    d += `${i ? 'L' : 'M'}${lerp(P, p[(i + 5) % 6])} Q${P[0].toFixed(2)} ${P[1].toFixed(2)} ${lerp(P, p[(i + 1) % 6])} `;
  }
  return d + 'Z';
}

const HEX_W = 200;
const HEX_H = 100 * Math.sqrt(3);
const HEX_D = roundHexPathD(100, HEX_H / 2, 100, 18);

export interface HexButtonParts {
  button: HTMLButtonElement;
  label: HTMLElement;
  rec: HTMLElement;
}

/** Bouton en forme de tomette : pictogramme, libellé et petite ligne (record…). */
export function hexButton(color: string, iconName: IconName, label: string, big = false): HexButtonParts {
  const labelEl = el('span', { class: 'hex-text' }, [label]);
  const rec = el('span', { class: 'hex-rec' });
  const lab = el('span', { class: 'hex-lab' }, [labelEl, rec]);
  lab.insertAdjacentHTML('afterbegin', icon(iconName));
  const button = el('button', { type: 'button', class: `hex-btn${big ? ' big' : ''}`, style: `--c:${color}` }, [lab]);
  button.insertAdjacentHTML(
    'afterbegin',
    `<svg class="hex-shape" viewBox="0 0 ${HEX_W} ${HEX_H.toFixed(2)}" aria-hidden="true"><path d="${HEX_D}"/></svg>`,
  );
  return { button, label: labelEl, rec };
}

/** Rosace de sept boutons : un au centre, six autour (en partant du haut, sens horaire). */
export function rosaceMenu(center: HexButtonParts, around: HexButtonParts[]): HTMLElement {
  const g = Math.sqrt(3) * 1.04;
  const place = (b: HTMLElement, x: number, y: number, i: number) => {
    b.style.setProperty('--x', x.toFixed(3));
    b.style.setProperty('--y', y.toFixed(3));
    b.style.setProperty('--i', String(i));
  };
  place(center.button, 0, 0, 0);
  around.forEach((p, k) => {
    const a = -Math.PI / 2 + (Math.PI / 3) * k;
    place(p.button, g * Math.cos(a), g * Math.sin(a), k + 1);
  });
  return el('div', { class: 'rosace-menu' }, [center.button, ...around.map((p) => p.button)]);
}

/** Pastille hexagonale du HUD : la valeur (niveau ou rosaces) dans la tomette, son nom en dessous, et une jauge de progression. */
export function hexBadge(): { root: HTMLElement; label: HTMLElement; value: HTMLElement; setProgress(p: number): void } {
  const label = el('small');
  const value = el('b');
  const tile = el('div', { class: 'hud-badge-tile' }, [value]);
  const root = el('div', { class: 'hud-badge' }, [tile, label]);
  const w = 64;
  const h = 56;
  const inner = roundHexPathD(w / 2, h / 2, 27, 4);
  tile.insertAdjacentHTML(
    'afterbegin',
    `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="bg" d="${roundHexPathD(w / 2, h / 2, 31, 5)}"/>` +
      `<path class="track" d="${inner}"/><path class="prog" d="${inner}" pathLength="100" stroke-dasharray="0 100"/></svg>`,
  );
  const prog = tile.querySelector<SVGPathElement>('.prog')!;
  let last = -1;
  return {
    root,
    label,
    value,
    setProgress(p: number) {
      const v = Math.round(Math.max(0, Math.min(1, p)) * 100);
      if (v === last) return;
      last = v;
      prog.setAttribute('stroke-dasharray', `${v} 100`);
    },
  };
}

/**
 * Taille de la rosace selon la place réellement disponible dans son écran
 * (téléphones Android aux barres variables, petits iPhone, grandes polices…).
 */
export function fitRosace(menu: HTMLElement): void {
  const screen = menu.parentElement;
  if (!screen || screen.hidden) return;
  const cs = getComputedStyle(screen);
  const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const gap = parseFloat(cs.rowGap) || 0;
  let others = 0;
  let count = 0;
  for (const child of Array.from(screen.children)) {
    if (child === menu || !(child instanceof HTMLElement) || child.offsetParent === null) continue;
    if (getComputedStyle(child).position === 'absolute') continue;
    const m = getComputedStyle(child);
    others += child.offsetHeight + parseFloat(m.marginTop) + parseFloat(m.marginBottom);
    count++;
  }
  const mm = getComputedStyle(menu);
  const availH = screen.clientHeight - padV - others - gap * count - parseFloat(mm.marginTop) - parseFloat(mm.marginBottom);
  const availW = Math.min(screen.clientWidth - 24, 520);
  const r = Math.max(36, Math.min(78, availW / 5.12, availH / 5.33));
  menu.style.setProperty('--r', `${r.toFixed(1)}px`);
}

/** Recalcule la taille de la rosace à chaque affichage de l'écran et à chaque redimensionnement. */
export function autoFitRosace(menu: HTMLElement): void {
  const run = () => requestAnimationFrame(() => fitRosace(menu));
  window.addEventListener('resize', run);
  window.visualViewport?.addEventListener('resize', run);
  const screen = menu.parentElement;
  if (screen) new MutationObserver(run).observe(screen, { attributes: true, attributeFilter: ['hidden'] });
  if (typeof ResizeObserver !== 'undefined' && screen) new ResizeObserver(run).observe(screen);
  run();
}
