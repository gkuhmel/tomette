// Fiches texte des stores (docs/store/<langue>.md) depuis texts.json, avec contrôle des limites.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const T = JSON.parse(readFileSync(`${HERE}texts.json`, 'utf8'));
const NAMES = { fr: 'Français', en: 'English (U.S. + U.K.)', es: 'Español (España + México)', de: 'Deutsch', it: 'Italiano', zh: '简体中文 (Chinese, Simplified)' };
const FIELDS = [
  ['App Store · Nom', 'name', 30],
  ['App Store · Sous-titre', 'subtitle', 30],
  ['App Store · Texte promotionnel', 'promo', 170],
  ['App Store · Mots-clés', 'keywords', 100],
  ['App Store · Description (identique sur Google Play)', 'description', 4000],
  ['App Store · Nouveautés de la version', 'whatsNew', 4000],
  ['Google Play · Titre', 'name', 30],
  ['Google Play · Description courte', 'playShort', 80],
];
const out = `${HERE}../../docs/store`;
mkdirSync(out, { recursive: true });
let bad = 0;
for (const [lang, t] of Object.entries(T)) {
  let md = `# Tomettes — fiche ${NAMES[lang]}\n\nTextes à copier tels quels. Nombre de caractères entre parenthèses (limite du store).\n\n`;
  for (const [label, key, max] of FIELDS) {
    const v = t[key];
    const n = [...v].length;
    if (n > max) { bad++; console.log(`TROP LONG ${lang} ${key} ${n}/${max}`); }
    md += `## ${label} (${n}/${max})\n\n\`\`\`text\n${v}\n\`\`\`\n\n`;
  }
  md += `## Google Play · Description complète\n\nLa même que la description App Store ci-dessus.\n`;
  writeFileSync(`${out}/${lang}.md`, md);
}
console.log(bad ? `${bad} champ(s) trop long(s)` : 'Toutes les limites sont respectées.');
