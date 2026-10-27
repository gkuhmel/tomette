// Chinois : Noto Sans SC greffée aux familles du jeu (seuls les caractères CJK la prennent).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
// Seulement les plages CJK (à partir de U+2E80) : les lettres et chiffres gardent les polices du jeu.
const NOTO = readFileSync(`${HERE}noto-sc.css`, 'utf8')
  .split('@font-face')
  .map((block) => block.replace(/unicode-range:([^;]+);/, (_, list) => {
    const keep = list.split(',').map((r) => r.trim()).filter((r) => parseInt(r.slice(2).split('-')[0], 16) >= 0x2e80);
    return keep.length ? `unicode-range: ${keep.join(', ')};` : 'unicode-range: U+E000;';
  }))
  .filter((block) => block.trim() && !block.includes('unicode-range: U+E000;'))
  .map((block) => `@font-face${block}`)
  .join('');
export const CJK_CSS = NOTO.replace(/font-family: 'Noto Sans SC';/g, "font-family: 'Nunito';") + NOTO.replace(/font-family: 'Noto Sans SC';/g, "font-family: 'Fredoka';");
