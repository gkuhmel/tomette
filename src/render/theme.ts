/** Thèmes graphiques : couleurs du plateau, des tuiles et de l'interface. */
export interface Theme {
  name: string;
  /** Rendu des tuiles : émail (dégradé + liseré) ou aplat arrondi. */
  style: 'glaze' | 'flat';
  bg: string;
  slotA: string;
  slotB: string;
  slotStroke: string;
  tiles: string[];
  glyph: string;
  dimOverlay: string;
  flashOverlay: string;
  gold: { base: string; border: string; petals: string; heart: string };
  popupFill: string;
  popupSub: string;
  popupStroke: string;
  held: string;
  warn: string;
  alert: string;
  /** Dalles de mortier : fond, mouchetures, joint. */
  mortar: { base: string; speck: string; edge: string };
  /** Variables CSS de l'interface. */
  css: Record<string, string>;
}

const terre: Theme = {
  name: 'Terre cuite',
  style: 'glaze',
  bg: '#2a1a14',
  slotA: '#3a251c',
  slotB: '#36221a',
  slotStroke: '#4a3024',
  tiles: ['#c4402c', '#2d68b0', '#dfb032', '#3a8a4a', '#7a4aa0', '#249c9c'],
  glyph: 'rgba(255, 248, 232, 0.92)',
  dimOverlay: 'rgba(20, 10, 5, 0.6)',
  flashOverlay: 'rgba(255, 252, 240, 0.7)',
  gold: { base: '#efe2bf', border: '#c08a1e', petals: '#d0951a', heart: '#b5543a' },
  popupFill: '#ffe9a8',
  popupSub: '#fff6e0',
  popupStroke: '#2a1a14',
  held: 'rgba(255, 244, 214, 0.95)',
  warn: '255, 160, 60',
  alert: '230, 40, 30',
  mortar: { base: '#8a7768', speck: '#5e4d41', edge: '#4a3a30' },
  css: {
    '--sky1': '#3d2419',
    '--sky2': '#2f1d16',
    '--sky3': '#22150f',
    '--primary': '#b5543a',
    '--surface': '#3a251c',
    '--floor': 'rgba(232, 162, 74, 0.07)',
    '--title': '#fbeedd',
    '--title-stroke': '#c9744f',
    '--title-shadow': '#7d3523',
    '--blur': 'rgba(42, 26, 20, 0.72)',
    '--bg': '#2a1a14',
    '--fg': '#fbeedd',
    '--muted': '#c9ae95',
    '--accent': '#e8a24a',
    '--terracotta': '#b5543a',
    '--button-shadow': '#7d3523',
    '--button-active': '#d0694c',
    '--overlay': 'rgba(42, 26, 20, 0.88)',
    '--card': '#36221a',
    '--danger': '#ff8a7a',
  },
};

const pastelClair: Theme = {
  name: 'Pastel clair',
  style: 'flat',
  bg: '#f7f1e8',
  slotA: '#efe5d8',
  slotB: '#ece1d3',
  slotStroke: '#e3d6c4',
  tiles: ['#ee7f72', '#6fa8e0', '#f0c45a', '#7dbb8c', '#a990dc', '#5cc4b8'],
  glyph: 'rgba(255, 255, 255, 0.95)',
  dimOverlay: 'rgba(247, 241, 232, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.75)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#ee7f72' },
  popupFill: '#ffffff',
  popupSub: '#5b4f47',
  popupStroke: '#e07a5f',
  held: 'rgba(70, 55, 45, 0.8)',
  warn: '240, 150, 60',
  alert: '225, 70, 60',
  mortar: { base: '#d9cfc2', speck: '#b3a594', edge: '#a8998a' },
  css: {
    '--sky1': '#fde6d8',
    '--sky2': '#fbf1e6',
    '--sky3': '#f4e8d8',
    '--primary': '#3d3530',
    '--surface': '#fffaf4',
    '--floor': 'rgba(224, 122, 95, 0.09)',
    '--title': '#ffffff',
    '--title-stroke': '#e9a28d',
    '--title-shadow': '#f0b8a6',
    '--blur': 'rgba(251, 243, 233, 0.78)',
    '--bg': '#f7f1e8',
    '--fg': '#3d3530',
    '--muted': '#8a7d72',
    '--accent': '#e07a5f',
    '--terracotta': '#e07a5f',
    '--button-shadow': '#c2604a',
    '--button-active': '#e88c74',
    '--overlay': 'rgba(247, 241, 232, 0.9)',
    '--card': '#efe5d8',
    '--danger': '#d9534f',
  },
};

const pastelSombre: Theme = {
  name: 'Pastel sombre',
  style: 'flat',
  bg: '#23212b',
  slotA: '#2d2a36',
  slotB: '#2a2733',
  slotStroke: '#383446',
  tiles: ['#ff9b8f', '#8cc0f5', '#ffd57a', '#9bd6a8', '#c3aef0', '#7fdccf'],
  glyph: 'rgba(35, 30, 45, 0.78)',
  dimOverlay: 'rgba(35, 33, 43, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.7)',
  gold: { base: '#fff3d6', border: '#f0c45a', petals: '#e6a93a', heart: '#ff9b8f' },
  popupFill: '#ffe7a8',
  popupSub: '#efe9f7',
  popupStroke: '#23212b',
  held: 'rgba(255, 255, 255, 0.9)',
  warn: '255, 175, 90',
  alert: '255, 95, 90',
  mortar: { base: '#6c6578', speck: '#4f495a', edge: '#454050' },
  css: {
    '--sky1': '#332d47',
    '--sky2': '#272433',
    '--sky3': '#1f1d27',
    '--primary': '#8f7fd6',
    '--surface': '#2f2c3a',
    '--floor': 'rgba(195, 174, 240, 0.07)',
    '--title': '#f1ecf7',
    '--title-stroke': '#8f7fd6',
    '--title-shadow': '#5a4d9e',
    '--blur': 'rgba(35, 33, 43, 0.72)',
    '--bg': '#23212b',
    '--fg': '#f1ecf7',
    '--muted': '#a49cb5',
    '--accent': '#ffb38a',
    '--terracotta': '#8f7fd6',
    '--button-shadow': '#6a5cb0',
    '--button-active': '#a294e2',
    '--overlay': 'rgba(35, 33, 43, 0.9)',
    '--card': '#2d2a36',
    '--danger': '#ff8a85',
  },
};

/** Faïence : blanc bleuté et bleu cobalt (direction artistique par défaut). */
const faience: Theme = {
  name: 'Faïence',
  style: 'flat',
  bg: '#f5f7fb',
  slotA: '#e6ecf6',
  slotB: '#e6ecf6',
  slotStroke: '#d6deeb',
  tiles: ['#f2766b', '#3466d6', '#f2c94c', '#5cb85c', '#9b7ede', '#2fb5b0'],
  glyph: 'rgba(255, 255, 255, 0.95)',
  dimOverlay: 'rgba(245, 247, 251, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.75)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#f2766b' },
  popupFill: '#ffffff',
  popupSub: '#1d2a44',
  popupStroke: '#2f5fd0',
  held: 'rgba(29, 42, 68, 0.85)',
  warn: '240, 150, 60',
  alert: '220, 60, 60',
  mortar: { base: '#cdd3de', speck: '#a4adbe', edge: '#8f9ab0' },
  css: {
    '--sky1': '#dbe7ff',
    '--sky2': '#eef0ff',
    '--sky3': '#fbf6ee',
    '--primary': '#1d2a44',
    '--surface': '#ffffff',
    '--floor': 'rgba(52, 102, 214, 0.075)',
    '--title': '#ffffff',
    '--title-stroke': '#7f98e6',
    '--title-shadow': '#9fb4f2',
    '--blur': 'rgba(238, 243, 251, 0.8)',
    '--bg': '#f5f7fb',
    '--fg': '#1d2a44',
    '--muted': '#6b7a96',
    '--accent': '#2f5fd0',
    '--terracotta': '#2f5fd0',
    '--button-shadow': '#1f44a0',
    '--button-active': '#4a76e0',
    '--overlay': 'rgba(245, 247, 251, 0.9)',
    '--card': '#e6ecf6',
    '--danger': '#d64545',
  },
};

/** L'ordre compte : l'indice est le réglage `theme` mémorisé. */
export const THEMES: Theme[] = [terre, pastelClair, pastelSombre, faience];

export function themeFor(index: number): Theme {
  return THEMES[Math.max(0, Math.min(THEMES.length - 1, Math.round(index) || 0))];
}

/** Applique les variables CSS du thème à la page. */
export function applyThemeCss(theme: Theme): void {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.css)) root.setProperty(k, v);
  theme.tiles.forEach((c, i) => root.setProperty(`--t${i}`, c));
  root.setProperty('--floor-img', `url("data:image/svg+xml,${encodeURIComponent(floorSvg(theme.css['--floor']))}")`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.css['--sky1']);
  document.documentElement.style.colorScheme = theme.style === 'flat' && theme.bg.startsWith('#f') ? 'light' : 'dark';
}

/** Motif de sol en tomettes (hexagones à plat, joints fins), répété en fond de page. */
function floorSvg(fill: string): string {
  const R = 22;
  const h = R * Math.sqrt(3);
  const w = 3 * R;
  const hex = (cx: number, cy: number) => {
    const r = R * 0.9;
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      d += `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    }
    return d + 'Z';
  };
  const centers = [[0, 0], [w, 0], [0, h], [w, h], [1.5 * R, h / 2]];
  const d = centers.map(([x, y]) => hex(x, y)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h.toFixed(2)}" viewBox="0 0 ${w} ${h.toFixed(2)}"><path d="${d}" fill="${fill}" stroke-linejoin="round"/></svg>`;
}
