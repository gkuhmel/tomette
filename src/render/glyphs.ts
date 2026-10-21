/**
 * Jeux de pictogrammes des tuiles. La couleur reste l'information principale ;
 * le pictogramme aide à distinguer les couleurs (et les daltoniens).
 * Chaque jeu dessine 6 formes simples, centrées en (x, y), de demi-taille ~0,75·s.
 */
type Ctx = CanvasRenderingContext2D;

function classic(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, s: number): void {
  ctx.beginPath();
  switch (kind % 6) {
    case 0: // pastille
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 1: // losange
      ctx.moveTo(x, y - s * 0.75);
      ctx.lineTo(x + s * 0.55, y);
      ctx.lineTo(x, y + s * 0.75);
      ctx.lineTo(x - s * 0.55, y);
      ctx.closePath();
      ctx.fill();
      break;
    case 2: // triangle
      ctx.moveTo(x, y - s * 0.7);
      ctx.lineTo(x + s * 0.68, y + s * 0.5);
      ctx.lineTo(x - s * 0.68, y + s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case 3: // croix
      ctx.moveTo(x - s * 0.6, y);
      ctx.lineTo(x + s * 0.6, y);
      ctx.moveTo(x, y - s * 0.6);
      ctx.lineTo(x, y + s * 0.6);
      ctx.stroke();
      break;
    case 4: // anneau
      ctx.lineWidth = s * 0.22;
      ctx.arc(x, y, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 5: // étoile
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (Math.PI / 5) * i;
        const rr = i % 2 === 0 ? s * 0.75 : s * 0.32;
        const px = x + rr * Math.cos(a);
        const py = y + rr * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
  }
}

/** Goutte / larme pointe en haut. */
function drop(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.moveTo(x, y - s * 0.78);
  ctx.bezierCurveTo(x + s * 0.2, y - s * 0.4, x + s * 0.55, y - s * 0.05, x + s * 0.55, y + s * 0.25);
  ctx.arc(x, y + s * 0.25, s * 0.55, 0, Math.PI);
  ctx.bezierCurveTo(x - s * 0.55, y - s * 0.05, x - s * 0.2, y - s * 0.4, x, y - s * 0.78);
  ctx.closePath();
}

function sun(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.arc(x, y, s * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.lineWidth = s * 0.16;
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    ctx.moveTo(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55);
    ctx.lineTo(x + Math.cos(a) * s * 0.8, y + Math.sin(a) * s * 0.8);
  }
  ctx.stroke();
}

function star(ctx: Ctx, x: number, y: number, s: number, points: number, inner: number, outer = 0.78): void {
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (Math.PI / points) * i;
    const rr = i % 2 === 0 ? s * outer : s * inner;
    if (i === 0) ctx.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    else ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}

/** Provence : soleil, lavande, olive, cigale, citron, figue. */
function provence(ctx: Ctx, kind: number, x: number, y: number, s: number): void {
  ctx.beginPath();
  switch (kind % 6) {
    case 0:
      sun(ctx, x, y, s);
      break;
    case 1: // lavande : tige et épis
      ctx.lineWidth = s * 0.14;
      ctx.moveTo(x, y + s * 0.8);
      ctx.lineTo(x, y - s * 0.1);
      ctx.stroke();
      for (const [dx, dy] of [[0, -0.62], [-0.2, -0.32], [0.2, -0.32], [-0.2, -0.02], [0.2, -0.02]]) {
        ctx.beginPath();
        ctx.ellipse(x + dx * s, y + dy * s, s * 0.15, s * 0.22, dx * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 2: // olive et sa feuille
      ctx.ellipse(x - s * 0.1, y + s * 0.15, s * 0.38, s * 0.52, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = s * 0.12;
      ctx.moveTo(x + s * 0.15, y - s * 0.35);
      ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.85, x + s * 0.75, y - s * 0.55);
      ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.3, x + s * 0.15, y - s * 0.35);
      ctx.fill();
      ctx.stroke();
      break;
    case 3: { // cigale : corps, tête, ailes
      ctx.ellipse(x, y + s * 0.05, s * 0.2, s * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - s * 0.58, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.65;
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + k * s * 0.32, y + s * 0.15, s * 0.18, s * 0.55, k * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = a;
      break;
    }
    case 4: // citron
      ctx.ellipse(x, y, s * 0.55, s * 0.42, -0.3, 0, Math.PI * 2);
      ctx.fill();
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(x + k * s * 0.55 * Math.cos(0.3), y - k * s * 0.55 * Math.sin(0.3), s * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 5: // figue : larme pointe en haut et petite queue
      drop(ctx, x, y + s * 0.05, s * 0.9);
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = s * 0.12;
      ctx.moveTo(x, y - s * 0.62);
      ctx.lineTo(x + s * 0.12, y - s * 0.82);
      ctx.stroke();
      break;
  }
}

/** Mer : poisson, vague, coquillage, étoile de mer, ancre, goutte. */
function sea(ctx: Ctx, kind: number, x: number, y: number, s: number): void {
  ctx.beginPath();
  switch (kind % 6) {
    case 0: // poisson
      ctx.ellipse(x - s * 0.12, y, s * 0.5, s * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + s * 0.3, y);
      ctx.lineTo(x + s * 0.78, y - s * 0.35);
      ctx.lineTo(x + s * 0.78, y + s * 0.35);
      ctx.closePath();
      ctx.fill();
      break;
    case 1: // deux vagues
      ctx.lineWidth = s * 0.18;
      for (const dy of [-0.25, 0.25]) {
        ctx.moveTo(x - s * 0.75, y + dy * s);
        for (let i = 1; i <= 16; i++) {
          const u = i / 16;
          ctx.lineTo(x - s * 0.75 + u * s * 1.5, y + dy * s - Math.sin(u * Math.PI * 2) * s * 0.18);
        }
      }
      ctx.stroke();
      break;
    case 2: // coquillage en éventail
      ctx.moveTo(x, y + s * 0.65);
      ctx.arc(x, y + s * 0.65, s * 1.2, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 3: // étoile de mer
      star(ctx, x, y, s, 5, 0.34, 0.8);
      break;
    case 4: // ancre
      ctx.lineWidth = s * 0.15;
      ctx.arc(x, y - s * 0.58, s * 0.16, 0, Math.PI * 2);
      ctx.moveTo(x, y - s * 0.42);
      ctx.lineTo(x, y + s * 0.72);
      ctx.moveTo(x - s * 0.35, y - s * 0.2);
      ctx.lineTo(x + s * 0.35, y - s * 0.2);
      ctx.moveTo(x - s * 0.62, y + s * 0.25);
      ctx.quadraticCurveTo(x - s * 0.5, y + s * 0.72, x, y + s * 0.72);
      ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.72, x + s * 0.62, y + s * 0.25);
      ctx.stroke();
      break;
    case 5:
      drop(ctx, x, y, s * 0.95);
      ctx.fill();
      break;
  }
}

/** Jardin : fleur, feuille, cerises, champignon, pomme, trèfle. */
function garden(ctx: Ctx, kind: number, x: number, y: number, s: number): void {
  ctx.beginPath();
  switch (kind % 6) {
    case 0: // fleur à 5 pétales (cœur creux)
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + ((Math.PI * 2) / 5) * i;
        ctx.moveTo(x + Math.cos(a) * s * 0.45 + s * 0.27, y + Math.sin(a) * s * 0.45);
        ctx.arc(x + Math.cos(a) * s * 0.45, y + Math.sin(a) * s * 0.45, s * 0.27, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    case 1: // feuille
      ctx.moveTo(x - s * 0.6, y + s * 0.6);
      ctx.quadraticCurveTo(x - s * 0.6, y - s * 0.6, x + s * 0.65, y - s * 0.65);
      ctx.quadraticCurveTo(x + s * 0.6, y + s * 0.6, x - s * 0.6, y + s * 0.6);
      ctx.fill();
      break;
    case 2: // cerises
      ctx.lineWidth = s * 0.1;
      ctx.moveTo(x - s * 0.35, y + s * 0.2);
      ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.4, x + s * 0.15, y - s * 0.72);
      ctx.moveTo(x + s * 0.35, y + s * 0.3);
      ctx.quadraticCurveTo(x + s * 0.3, y - s * 0.3, x + s * 0.15, y - s * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - s * 0.35, y + s * 0.38, s * 0.3, 0, Math.PI * 2);
      ctx.arc(x + s * 0.38, y + s * 0.48, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 3: // champignon
      ctx.moveTo(x - s * 0.75, y);
      ctx.quadraticCurveTo(x - s * 0.7, y - s * 0.75, x, y - s * 0.75);
      ctx.quadraticCurveTo(x + s * 0.7, y - s * 0.75, x + s * 0.75, y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.rect(x - s * 0.2, y - s * 0.05, s * 0.4, s * 0.7);
      ctx.fill();
      break;
    case 4: // pomme et sa feuille
      ctx.arc(x - s * 0.22, y + s * 0.12, s * 0.42, 0, Math.PI * 2);
      ctx.arc(x + s * 0.22, y + s * 0.12, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + s * 0.18, y - s * 0.55, s * 0.22, s * 0.1, -0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 5: // trèfle
      for (const a of [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6]) {
        ctx.moveTo(x + Math.cos(a) * s * 0.36 + s * 0.3, y - s * 0.1 + Math.sin(a) * s * 0.36);
        ctx.arc(x + Math.cos(a) * s * 0.36, y - s * 0.1 + Math.sin(a) * s * 0.36, s * 0.3, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = s * 0.14;
      ctx.moveTo(x, y + s * 0.1);
      ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.5, x + s * 0.3, y + s * 0.78);
      ctx.stroke();
      break;
  }
}

/** Étoiles : lune, étincelle, soleil, planète, comète, éclair. */
function sky(ctx: Ctx, kind: number, x: number, y: number, s: number): void {
  ctx.beginPath();
  switch (kind % 6) {
    case 0: // croissant de lune
      ctx.arc(x, y, s * 0.68, Math.PI * 0.35, Math.PI * 1.65);
      ctx.arc(x + s * 0.32, y - s * 0.05, s * 0.5, Math.PI * 1.45, Math.PI * 0.55, true);
      ctx.closePath();
      ctx.fill();
      break;
    case 1: // étincelle à 4 branches
      star(ctx, x, y, s, 4, 0.22, 0.82);
      break;
    case 2:
      sun(ctx, x, y, s);
      break;
    case 3: // planète et son anneau
      ctx.arc(x, y, s * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = s * 0.12;
      ctx.ellipse(x, y, s * 0.8, s * 0.25, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 4: // comète
      ctx.arc(x + s * 0.35, y - s * 0.35, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.lineWidth = s * 0.14;
      for (const [dx, dy, l] of [[0, 0, 0.9], [-0.25, 0.1, 0.6], [0.1, -0.25, 0.6]]) {
        ctx.moveTo(x + s * (0.2 + dx), y - s * (0.2 + dy));
        ctx.lineTo(x + s * (0.2 + dx - l), y - s * (0.2 + dy - l));
      }
      ctx.stroke();
      break;
    case 5: // éclair
      ctx.moveTo(x + s * 0.15, y - s * 0.8);
      ctx.lineTo(x - s * 0.45, y + s * 0.1);
      ctx.lineTo(x - s * 0.02, y + s * 0.1);
      ctx.lineTo(x - s * 0.15, y + s * 0.8);
      ctx.lineTo(x + s * 0.45, y - s * 0.12);
      ctx.lineTo(x + s * 0.02, y - s * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
  }
}

/** L'ordre compte : l'indice est le réglage `glyphs` mémorisé. */
const SETS = [classic, provence, sea, garden, sky];
export const GLYPH_SET_COUNT = SETS.length;

export function drawGlyph(ctx: Ctx, set: number, kind: number, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.28;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const i = Math.max(0, Math.min(SETS.length - 1, Math.round(set) || 0));
  // Les dessins des autres jeux sont plus fins que les formes classiques : un peu plus grands.
  SETS[i](ctx, kind, x, y, i ? s * 1.12 : s);
  ctx.restore();
}
