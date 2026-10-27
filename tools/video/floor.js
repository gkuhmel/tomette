// Sol de tomettes en terre cuite, dessiné dans le calque (vidéo 6).
(() => {
  const cv = document.createElement('canvas'); cv.id = 'floor';
  cv.width = 1080; cv.height = 1920;
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', opacity: '0' });
  document.getElementById('ov').prepend(cv);
  const ctx = cv.getContext('2d');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const R = 120, H = Math.sqrt(3) * R;
  const terra = ['#b9572f', '#c4673c', '#a9492a', '#c9744a', '#b25033', '#bf5f36'];
  const game = ['#f2756a', '#f2c94c', '#5cb85c', '#2bb3ad', '#3866d6', '#9b7fdc'];
  const tiles = [];
  for (let c = -2; c < 12; c++) for (let r = -2; r < 14; r++) {
    const x = c * 1.5 * R, y = r * H + (c & 1 ? H / 2 : 0);
    tiles.push({ x, y, base: terra[Math.floor(rnd() * terra.length)], light: 0.85 + rnd() * 0.3, g: game[Math.floor(rnd() * 6)],
      spots: Array.from({ length: 5 }, () => [rnd() * 1.4 - 0.7, rnd() * 1.2 - 0.6, 6 + rnd() * 22, rnd() < 0.5 ? 1 : -1]) });
  }
  const hex = (x, y, r) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); };
  const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
  window.ovFloor = (f) => {
    if (!f) { cv.style.opacity = '0'; return; }
    cv.style.opacity = String(f.alpha ?? 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e6dccb'; ctx.fillRect(0, 0, 1080, 1920);
    const s = f.zoom ?? 1;
    ctx.setTransform(s, 0, 0, s, 540 * (1 - s) - (f.pan ?? 0), 960 * (1 - s));
    ctx.rotate(-0.05);
    const cx = 540, cy = 1000, maxD = 1300;
    for (const t of tiles) {
      const d = Math.hypot(t.x - cx, t.y - cy) / maxD;
      const k = Math.max(0, Math.min(1, ((f.wave ?? 0) - d * 0.9) * 3));
      const pop = k > 0 && k < 1 ? 1 + 0.12 * Math.sin(k * Math.PI) : 1;
      hex(t.x, t.y, (R - 7) * pop);
      const col = mix(t.base, t.g, k);
      const gr = ctx.createLinearGradient(t.x - R, t.y - R, t.x + R, t.y + R);
      gr.addColorStop(0, mix(col.startsWith('#') ? col : '#000000', '#ffffff', 0)); 
      ctx.fillStyle = col; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.globalAlpha = 0.1 * (1 - k * 0.7);
      for (const [sx, sy, sr, sign] of t.spots) { ctx.fillStyle = sign > 0 ? '#ffe2c4' : '#5a2010'; ctx.beginPath(); ctx.ellipse(t.x + sx * R, t.y + sy * R, sr * 1.6, sr, 0.6, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 0.22; const sh = ctx.createLinearGradient(t.x, t.y - R, t.x, t.y + R); sh.addColorStop(0, '#fff'); sh.addColorStop(1, '#000');
      ctx.fillStyle = sh; ctx.fillRect(t.x - R, t.y - R, 2 * R, 2 * R);
      ctx.restore(); ctx.globalAlpha = 1;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(80,30,10,.25)'; ctx.stroke();
    }
    // Lumière chaude de fenêtre.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const lg = ctx.createRadialGradient(300, 500, 100, 540, 900, 1400);
    const w = Math.min(1, f.wave ?? 0); lg.addColorStop(0, `rgba(255,230,180,${0.35 - 0.25 * w})`); lg.addColorStop(1, `rgba(40,10,0,${0.45 - 0.3 * w})`);
    ctx.fillStyle = lg; ctx.fillRect(0, 0, 1080, 1920);
  };
})();
