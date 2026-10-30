// Dessin vectoriel de l'icône (rosace de tomettes), partagé par l'icône des stores et l'appli native.
const hex = (cx, cy, r, k) => {
  const p = [];
  for (let i = 0; i < 6; i++) p.push([cx + r * Math.cos((Math.PI / 3) * i), cy + r * Math.sin((Math.PI / 3) * i)]);
  const u = k / r;
  const lerp = (a, b) => `${(a[0] + (b[0] - a[0]) * u).toFixed(2)} ${(a[1] + (b[1] - a[1]) * u).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < 6; i++) d += `${i ? 'L' : 'M'}${lerp(p[i], p[(i + 5) % 6])} Q${p[i][0].toFixed(2)} ${p[i][1].toFixed(2)} ${lerp(p[i], p[(i + 1) % 6])} `;
  return d + 'Z';
};
// Voisines dans l'ordre : haut, haut-droite, bas-droite, bas, bas-gauche, haut-gauche.
const RING = ['#5cb85c', '#f2c94c', '#f2766b', '#2fb5b0', '#3466d6', '#9b7ede'];
export function svg(size, background = '#f4f6fb', scale = 1) {
  const c = 256, R = 76, D = 143;
  let g = '';
  RING.forEach((col, i) => {
    const a = -Math.PI / 2 + (Math.PI / 3) * i;
    g += `<path d="${hex(c + D * Math.cos(a), c + D * Math.sin(a), R, 15)}" fill="${col}" filter="url(#sh)"/>`;
  });
  g += `<path d="${hex(c, c, R, 15)}" fill="#fdf5e4" filter="url(#sh)"/>`;
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6; g += `<circle cx="${c + 30 * Math.cos(a)}" cy="${c + 30 * Math.sin(a)}" r="16" fill="#e3a92e"/>`; }
  g += `<circle cx="${c}" cy="${c}" r="16" fill="#fdf5e4"/>`;
  g += `<circle cx="${c}" cy="${c}" r="12" fill="#3466d6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#1d2a44" flood-opacity=".14"/></filter></defs>
  <rect width="512" height="512" fill="${background}"/><g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${g}</g></svg>`;
}
