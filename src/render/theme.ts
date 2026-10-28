/** Thèmes graphiques : couleurs du plateau, des tuiles et de l'interface. */
export interface Theme {
  name: string;
  /** Rendu des tuiles : émail (dégradé + liseré), aplat arrondi, ou vraie tomette de faïence. */
  style: 'glaze' | 'flat' | 'tomette';
  /** Décor de page (SVG) à la place du sol en tomettes répété. */
  decor?: () => string;
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


/** Lavande. */
const lavande: Theme = {
  name: 'Lavande',
  style: 'flat',
  bg: '#f6f2fb',
  slotA: '#ece4f6',
  slotB: '#ece4f6',
  slotStroke: '#e0d5ee',
  tiles: ['#ef7a8a', '#7b6fd6', '#f2c25a', '#7cc492', '#b48ae0', '#5fb8c9'],
  glyph: 'rgba(255, 255, 255, 0.95)',
  dimOverlay: 'rgba(255, 255, 255, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.75)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#ef7a8a' },
  popupFill: '#ffffff',
  popupSub: '#2f2545',
  popupStroke: '#7b6fd6',
  held: 'rgba(30, 30, 50, 0.8)',
  warn: '240, 150, 60',
  alert: '220, 60, 60',
  mortar: { base: '#d6cfe0', speck: '#b0a6c0', edge: '#9a8fae' },
  css: {
    '--sky1': '#e6dcfb',
    '--sky2': '#f2edfb',
    '--sky3': '#faf6ef',
    '--primary': '#3d2f5c',
    '--surface': '#ffffff',
    '--floor': 'rgba(123, 111, 214, 0.08)',
    '--title': '#ffffff',
    '--title-stroke': '#a995e6',
    '--title-shadow': '#c3b4f0',
    '--blur': 'rgba(242, 237, 251, 0.82)',
    '--bg': '#f6f2fb',
    '--fg': '#2f2545',
    '--muted': '#7d7194',
    '--accent': '#7b6fd6',
    '--terracotta': '#7b6fd6',
    '--button-shadow': '#3d2f5c',
    '--button-active': '#7b6fd6',
    '--overlay': 'rgba(242, 237, 251, 0.82)',
    '--card': '#ece4f6',
    '--danger': '#d64561',
  },
};

/** Calanques. */
const calanques: Theme = {
  name: 'Calanques',
  style: 'flat',
  bg: '#f2f8f8',
  slotA: '#e2eff0',
  slotB: '#e2eff0',
  slotStroke: '#d3e6e8',
  tiles: ['#f07c6a', '#1f7fb8', '#f4c95a', '#4cb07d', '#8c7bd8', '#18b3b0'],
  glyph: 'rgba(255, 255, 255, 0.95)',
  dimOverlay: 'rgba(255, 255, 255, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.75)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#f07c6a' },
  popupFill: '#ffffff',
  popupSub: '#123544',
  popupStroke: '#1f7fb8',
  held: 'rgba(30, 30, 50, 0.8)',
  warn: '240, 150, 60',
  alert: '220, 60, 60',
  mortar: { base: '#d2d9d6', speck: '#a9b4b0', edge: '#93a09c' },
  css: {
    '--sky1': '#cdeef3',
    '--sky2': '#e9f6f6',
    '--sky3': '#fbf5ea',
    '--primary': '#0f3b4c',
    '--surface': '#ffffff',
    '--floor': 'rgba(31, 127, 184, 0.08)',
    '--title': '#ffffff',
    '--title-stroke': '#6fb7d6',
    '--title-shadow': '#9fd2e6',
    '--blur': 'rgba(233, 246, 246, 0.82)',
    '--bg': '#f2f8f8',
    '--fg': '#123544',
    '--muted': '#5d7f8a',
    '--accent': '#1f7fb8',
    '--terracotta': '#1f7fb8',
    '--button-shadow': '#0f3b4c',
    '--button-active': '#1f7fb8',
    '--overlay': 'rgba(233, 246, 246, 0.82)',
    '--card': '#e2eff0',
    '--danger': '#d64545',
  },
};

/** Ocre. */
const ocre: Theme = {
  name: 'Ocre',
  style: 'flat',
  bg: '#fbf4ea',
  slotA: '#f3e6d4',
  slotB: '#f3e6d4',
  slotStroke: '#ead8c0',
  tiles: ['#d9573b', '#3b6fb5', '#e8a63a', '#6d9c45', '#a25c8e', '#2e9b8f'],
  glyph: 'rgba(255, 255, 255, 0.95)',
  dimOverlay: 'rgba(255, 255, 255, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.75)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#d9573b' },
  popupFill: '#ffffff',
  popupSub: '#4a2a1c',
  popupStroke: '#d9573b',
  held: 'rgba(30, 30, 50, 0.8)',
  warn: '240, 150, 60',
  alert: '220, 60, 60',
  mortar: { base: '#d8c6b0', speck: '#b39b80', edge: '#9e856b' },
  css: {
    '--sky1': '#fbdcc2',
    '--sky2': '#fbecdc',
    '--sky3': '#f7ecd9',
    '--primary': '#5a2e1a',
    '--surface': '#fffaf3',
    '--floor': 'rgba(217, 87, 59, 0.08)',
    '--title': '#fff6ea',
    '--title-stroke': '#e08a5c',
    '--title-shadow': '#eaa77f',
    '--blur': 'rgba(251, 236, 220, 0.82)',
    '--bg': '#fbf4ea',
    '--fg': '#4a2a1c',
    '--muted': '#94735e',
    '--accent': '#d9573b',
    '--terracotta': '#d9573b',
    '--button-shadow': '#5a2e1a',
    '--button-active': '#d9573b',
    '--overlay': 'rgba(251, 236, 220, 0.82)',
    '--card': '#f3e6d4',
    '--danger': '#c43d2a',
  },
};

/** Nuit. */
const nuit: Theme = {
  name: 'Nuit',
  style: 'flat',
  bg: '#141a2e',
  slotA: '#1d2540',
  slotB: '#1d2540',
  slotStroke: '#27304f',
  tiles: ['#ff8a80', '#7fa8ff', '#ffd66b', '#7fdca0', '#c59bff', '#62e0d4'],
  glyph: 'rgba(255, 255, 255, 0.92)',
  dimOverlay: 'rgba(20, 22, 40, 0.6)',
  flashOverlay: 'rgba(255, 255, 255, 0.75)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#ff8a80' },
  popupFill: '#ffe7a8',
  popupSub: '#eef1ff',
  popupStroke: '#141a2e',
  held: 'rgba(255, 255, 255, 0.9)',
  warn: '240, 150, 60',
  alert: '255, 95, 90',
  mortar: { base: '#5d6585', speck: '#454c69', edge: '#3b4260' },
  css: {
    '--sky1': '#1b2445',
    '--sky2': '#151c34',
    '--sky3': '#10152a',
    '--primary': '#5b74e6',
    '--surface': '#1e2744',
    '--floor': 'rgba(127, 168, 255, 0.07)',
    '--title': '#eef1ff',
    '--title-stroke': '#5b74e6',
    '--title-shadow': '#34408a',
    '--blur': 'rgba(20, 26, 46, 0.78)',
    '--bg': '#141a2e',
    '--fg': '#eef1ff',
    '--muted': '#9aa4c8',
    '--accent': '#ffd66b',
    '--terracotta': '#ffd66b',
    '--button-shadow': '#5b74e6',
    '--button-active': '#ffd66b',
    '--overlay': 'rgba(20, 26, 46, 0.78)',
    '--card': '#27304f',
    '--danger': '#ff8a85',
  },
};

/** Bonbon : framboise, menthe, ciel, abricot, chocolat, réglisse. */
const bonbon: Theme = {
  name: 'Bonbon',
  style: 'flat',
  bg: '#fff3f6',
  slotA: '#fbe3ea',
  slotB: '#fbe3ea',
  slotStroke: '#f3d2dd',
  tiles: ['#ec5a97', '#2fb894', '#3d9be0', '#f58a3d', '#8a5a40', '#3b3346'],
  glyph: 'rgba(255, 255, 255, 0.95)',
  dimOverlay: 'rgba(255, 243, 246, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.78)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#ec5a97' },
  popupFill: '#ffffff',
  popupSub: '#3b3346',
  popupStroke: '#ec5a97',
  held: 'rgba(59, 51, 70, 0.85)',
  warn: '245, 138, 61',
  alert: '220, 50, 80',
  mortar: { base: '#e3d3d8', speck: '#c2a9b1', edge: '#a88f98' },
  css: {
    '--sky1': '#ffd9e6',
    '--sky2': '#fff0f4',
    '--sky3': '#fff8ef',
    '--primary': '#3b3346',
    '--surface': '#ffffff',
    '--floor': 'rgba(236, 90, 151, 0.08)',
    '--title': '#ffffff',
    '--title-stroke': '#ec5a97',
    '--title-shadow': '#f5a3c4',
    '--blur': 'rgba(255, 240, 244, 0.82)',
    '--bg': '#fff3f6',
    '--fg': '#3b3346',
    '--muted': '#8f7c8c',
    '--accent': '#ec5a97',
    '--terracotta': '#ec5a97',
    '--button-shadow': '#3b3346',
    '--button-active': '#ec5a97',
    '--overlay': 'rgba(255, 240, 244, 0.88)',
    '--card': '#fbe3ea',
    '--danger': '#d6345a',
  },
};

/** Océan : corail, sable doré, écume, lagon, bleu roi, coquillage, sur fond de nuit marine. */
const ocean: Theme = {
  name: 'Océan',
  style: 'flat',
  bg: '#0e2338',
  slotA: '#142d47',
  slotB: '#142d47',
  slotStroke: '#1c3a5a',
  tiles: ['#ff6f61', '#e0b25a', '#3cc9a4', '#19a7c4', '#4a6fe0', '#f08fb8'],
  glyph: 'rgba(255, 255, 255, 0.94)',
  dimOverlay: 'rgba(14, 35, 56, 0.6)',
  flashOverlay: 'rgba(235, 250, 255, 0.75)',
  gold: { base: '#fff8e6', border: '#e0b44c', petals: '#e2a92e', heart: '#ff6f61' },
  popupFill: '#fff3d6',
  popupSub: '#e8f6ff',
  popupStroke: '#0e2338',
  held: 'rgba(255, 255, 255, 0.9)',
  warn: '240, 160, 70',
  alert: '255, 100, 90',
  mortar: { base: '#58708a', speck: '#3f566e', edge: '#33485e' },
  css: {
    '--sky1': '#123a5c',
    '--sky2': '#0f2b45',
    '--sky3': '#0b1f33',
    '--primary': '#19a7c4',
    '--surface': '#16314d',
    '--floor': 'rgba(60, 201, 164, 0.07)',
    '--title': '#e8f6ff',
    '--title-stroke': '#19a7c4',
    '--title-shadow': '#0d5b78',
    '--blur': 'rgba(14, 35, 56, 0.78)',
    '--bg': '#0e2338',
    '--fg': '#e8f6ff',
    '--muted': '#8fb1c9',
    '--accent': '#3cc9a4',
    '--terracotta': '#3cc9a4',
    '--button-shadow': '#19a7c4',
    '--button-active': '#3cc9a4',
    '--overlay': 'rgba(14, 35, 56, 0.8)',
    '--card': '#1c3a5a',
    '--danger': '#ff8a80',
  },
};

/** Automne : brique, potiron, moutarde, chocolat, ardoise, sauge. */
const automne: Theme = {
  name: 'Automne',
  style: 'flat',
  bg: '#f8f0e3',
  slotA: '#efe2cd',
  slotB: '#efe2cd',
  slotStroke: '#e3d2b8',
  tiles: ['#b8402e', '#e5792b', '#cf9f27', '#6a4630', '#4f6d8a', '#879e7f'],
  glyph: 'rgba(255, 252, 244, 0.95)',
  dimOverlay: 'rgba(248, 240, 227, 0.62)',
  flashOverlay: 'rgba(255, 252, 244, 0.78)',
  gold: { base: '#fff6e0', border: '#c99a2e', petals: '#d39a22', heart: '#b8402e' },
  popupFill: '#fffaf0',
  popupSub: '#3d2a1e',
  popupStroke: '#b8402e',
  held: 'rgba(61, 42, 30, 0.85)',
  warn: '229, 121, 43',
  alert: '200, 50, 35',
  mortar: { base: '#d6c8b2', speck: '#b3a184', edge: '#9a8768' },
  css: {
    '--sky1': '#f5dcc0',
    '--sky2': '#f8ebda',
    '--sky3': '#fbf5ea',
    '--primary': '#3d2a1e',
    '--surface': '#fffaf0',
    '--floor': 'rgba(184, 64, 46, 0.07)',
    '--title': '#fffaf0',
    '--title-stroke': '#c46a35',
    '--title-shadow': '#e8a77a',
    '--blur': 'rgba(248, 240, 227, 0.82)',
    '--bg': '#f8f0e3',
    '--fg': '#3d2a1e',
    '--muted': '#8a7562',
    '--accent': '#b8402e',
    '--terracotta': '#b8402e',
    '--button-shadow': '#3d2a1e',
    '--button-active': '#b8402e',
    '--overlay': 'rgba(248, 240, 227, 0.88)',
    '--card': '#efe2cd',
    '--danger': '#b8402e',
  },
};

/** Néon : rose, cyan, citron vert, orange, bleu électrique, violet, sur fond noir. */
const neon: Theme = {
  name: 'Néon',
  style: 'flat',
  bg: '#0b0b14',
  slotA: '#14141f',
  slotB: '#14141f',
  slotStroke: '#1e1e2d',
  tiles: ['#ff2e9a', '#19e3ff', '#a6ff2e', '#ff8a1a', '#3d5bff', '#b14dff'],
  glyph: 'rgba(10, 10, 20, 0.82)',
  dimOverlay: 'rgba(11, 11, 20, 0.62)',
  flashOverlay: 'rgba(255, 255, 255, 0.8)',
  gold: { base: '#fff8e6', border: '#ffd23f', petals: '#ffb800', heart: '#ff2e9a' },
  popupFill: '#ffffff',
  popupSub: '#19e3ff',
  popupStroke: '#ff2e9a',
  held: 'rgba(255, 255, 255, 0.92)',
  warn: '255, 138, 26',
  alert: '255, 46, 100',
  mortar: { base: '#3a3a4f', speck: '#26263a', edge: '#5a5a78' },
  css: {
    '--sky1': '#1a0b2e',
    '--sky2': '#100c1f',
    '--sky3': '#0b0b14',
    '--primary': '#ff2e9a',
    '--surface': '#16162a',
    '--floor': 'rgba(25, 227, 255, 0.06)',
    '--title': '#ffffff',
    '--title-stroke': '#ff2e9a',
    '--title-shadow': '#19e3ff',
    '--blur': 'rgba(11, 11, 20, 0.8)',
    '--bg': '#0b0b14',
    '--fg': '#f2f2ff',
    '--muted': '#9a9ac0',
    '--accent': '#19e3ff',
    '--terracotta': '#19e3ff',
    '--button-shadow': '#ff2e9a',
    '--button-active': '#19e3ff',
    '--overlay': 'rgba(11, 11, 20, 0.84)',
    '--card': '#1e1e2d',
    '--danger': '#ff4d6d',
  },
};

/**
 * Tomettes (thème ultime) : vraies tomettes de faïence émaillée, posées sur un joint
 * de chaux, et un décor de Provence (collines, village perché, cyprès, lavande).
 */
const tomettes: Theme = {
  name: 'Tomettes',
  style: 'tomette',
  decor: provenceSvg,
  bg: '#e9dfcb',
  slotA: '#e2d6bf',
  slotB: '#e2d6bf',
  slotStroke: '#d3c4a8',
  // Émaux traditionnels : cobalt, ocre, vert de cuivre, rouge sang-de-bœuf, turquoise, manganèse.
  tiles: ['#b13f2c', '#2c4f9e', '#d99a2b', '#4e8a3a', '#6e3b52', '#2b9a9c'],
  glyph: 'rgba(251, 243, 226, 0.92)',
  dimOverlay: 'rgba(233, 223, 203, 0.62)',
  flashOverlay: 'rgba(255, 250, 238, 0.8)',
  gold: { base: '#e7c15a', border: '#a8781c', petals: '#fbf3e2', heart: '#b13f2c' },
  popupFill: '#fffaf0',
  popupSub: '#3a2a1e',
  popupStroke: '#9c4a28',
  held: 'rgba(58, 42, 30, 0.85)',
  warn: '217, 120, 43',
  alert: '190, 50, 35',
  mortar: { base: '#d8ccb6', speck: '#b7a88c', edge: '#9d8d70' },
  css: {
    '--sky1': '#8fc8ec',
    '--sky2': '#cfe6f2',
    '--sky3': '#f7ecd6',
    '--primary': '#2c4f9e',
    '--surface': '#fffaf0',
    '--floor': 'rgba(177, 63, 44, 0.08)',
    '--title': '#fff8ec',
    '--title-stroke': '#c0643d',
    '--title-shadow': '#8a3e22',
    '--blur': 'rgba(250, 243, 230, 0.82)',
    '--bg': '#f7ecd6',
    '--fg': '#3a2a1e',
    '--muted': '#86705c',
    '--accent': '#c0643d',
    '--terracotta': '#c0643d',
    '--button-shadow': '#1f3670',
    '--button-active': '#4a6cc0',
    '--overlay': 'rgba(250, 243, 230, 0.9)',
    '--card': '#f1e6d2',
    '--danger': '#b13f2c',
  },
};

/** L'ordre compte : l'indice est le réglage `theme` mémorisé. */
export const THEMES: Theme[] = [terre, pastelClair, pastelSombre, faience, lavande, calanques, ocre, nuit, bonbon, ocean, automne, neon, tomettes];

export function themeFor(index: number): Theme {
  return THEMES[Math.max(0, Math.min(THEMES.length - 1, Math.round(index) || 0))];
}

/** Applique les variables CSS du thème à la page. */
export function applyThemeCss(theme: Theme): void {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(theme.css)) root.setProperty(k, v);
  theme.tiles.forEach((c, i) => root.setProperty(`--t${i}`, c));
  const decor = theme.decor?.();
  root.setProperty('--floor-img', `url("data:image/svg+xml,${encodeURIComponent(decor ?? floorSvg(theme.css['--floor']))}")`);
  root.setProperty('--floor-size', decor ? 'cover' : 'auto');
  root.setProperty('--floor-repeat', decor ? 'no-repeat' : 'repeat');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.css['--sky1']);
  document.documentElement.style.colorScheme = theme.style !== 'glaze' && theme.bg.startsWith('#f') ? 'light' : 'dark';
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

/** Paysage de Provence (bas de page) : collines, village perché, cyprès et rangs de lavande. */
function provenceSvg(): string {
  const W = 1200;
  const H = 900;
  // Rangs de lavande qui fuient vers l'horizon : bandes fines, touffes rondes, herbe entre les rangs.
  let rows = '';
  const vx = 600;
  const vy = 600;
  for (let i = -30; i <= 30; i++) {
    const x2 = vx + i * 46;
    const d = Math.abs(i);
    rows += `<path d="M${vx + i * 3} ${vy}L${x2 - 15} ${H}L${x2 + 15} ${H}L${vx + i * 3 + 1.5} ${vy}Z" fill="${d % 2 ? '#8b78c2' : '#9784cc'}"/>`;
    // Touffes : de plus en plus grosses vers le premier plan.
    for (let k = 1; k <= 9; k++) {
      const t = (k / 9) ** 1.6;
      const x = vx + i * 3 + (x2 - vx - i * 3) * t;
      const y = vy + (H - vy) * t;
      const rr = 2 + 15 * t;
      rows += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr * 0.7).toFixed(1)}" fill="${k % 2 ? '#a08fd6' : '#7d6ab6'}"/>`;
    }
  }
  // Village perché : façades ocre et toits de tuiles.
  const houses = [
    [430, 438, 46, 34], [470, 428, 40, 44], [505, 440, 52, 32], [552, 424, 38, 48], [585, 436, 50, 36], [630, 444, 44, 28], [668, 432, 40, 40],
  ];
  let village = '';
  houses.forEach(([x, y, w, h], i) => {
    const wall = ['#ecc48a', '#e2ad74', '#f0d4a2', '#d99a62'][i % 4];
    village += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${wall}"/>`;
    village += `<path d="M${x - 4} ${y}L${x + w / 2} ${y - 12}L${x + w + 4} ${y}Z" fill="#b9542f"/>`;
    village += `<rect x="${x + w * 0.3}" y="${y + h * 0.35}" width="${w * 0.16}" height="${h * 0.3}" fill="#6f8fa8"/>`;
  });
  village += `<rect x="560" y="378" width="18" height="54" fill="#e8bd84"/><path d="M556 378L569 360L582 378Z" fill="#a84a2a"/>`;
  // Cyprès.
  const cypress = (x: number, y: number, h: number) =>
    `<path d="M${x} ${y - h}C${x + h * 0.16} ${y - h * 0.6} ${x + h * 0.14} ${y - h * 0.1} ${x} ${y}C${x - h * 0.14} ${y - h * 0.1} ${x - h * 0.16} ${y - h * 0.6} ${x} ${y - h}Z" fill="#3c5a36"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
<circle cx="980" cy="250" r="70" fill="#ffe7a6" opacity="0.8"/>
<path d="M0 470C140 400 260 380 380 410C520 330 640 300 760 360C880 320 1020 350 1200 420L1200 900L0 900Z" fill="#b9b3d6" opacity="0.75"/>
<path d="M0 520C160 470 300 470 420 470C520 440 640 430 760 460C900 450 1040 470 1200 500L1200 900L0 900Z" fill="#a8b77c"/>
${village}
<path d="M0 600C200 585 420 590 600 600C780 590 1000 585 1200 600L1200 900L0 900Z" fill="#7f9659"/>
${rows}
${cypress(330, 600, 150)}${cypress(370, 604, 110)}${cypress(860, 600, 170)}${cypress(900, 606, 120)}
<path d="M0 820C300 800 900 800 1200 820L1200 900L0 900Z" fill="#7d6aa8" opacity="0.5"/>
</svg>`;
}
