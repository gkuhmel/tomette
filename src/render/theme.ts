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
  css: {
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
  css: {
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
  css: {
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
  css: {
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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
  document.documentElement.style.colorScheme = theme.style === 'flat' && theme.bg.startsWith('#f') ? 'light' : 'dark';
}
