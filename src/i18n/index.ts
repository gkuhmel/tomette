import { de } from './de';
import { en } from './en';
import { es } from './es';
import { Dict, fr, Key } from './fr';
import { it } from './it';
import { zh } from './zh';

export type { Key };
export type Lang = 'fr' | 'en' | 'es' | 'de' | 'it' | 'zh';

export const LANGS: Lang[] = ['fr', 'en', 'es', 'de', 'it', 'zh'];
const DICTS: Record<Lang, Dict> = { fr, en, es, de, it, zh };
const LANG_KEY = 'tomettes.lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && LANGS.includes(saved)) return saved;
  } catch {
    /* stockage indisponible */
  }
  const prefs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const p of prefs) {
    const code = (p || '').slice(0, 2).toLowerCase() as Lang;
    if (LANGS.includes(code)) return code;
  }
  return 'en';
}

export let lang: Lang = typeof window !== 'undefined' ? detect() : 'fr';

/** Change de langue (mémorisée) ; l'interface est reconstruite par un rechargement. */
export function setLang(l: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignoré */
  }
  lang = l;
}

/** Texte traduit, avec paramètres {nom}. Repli sur le français si une clé manque. */
export function t(key: Key, params: Record<string, string | number> = {}): string {
  const s = DICTS[lang][key] ?? fr[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (k in params ? String(params[k]) : `{${k}}`));
}

/** Nom d'une langue dans cette langue. */
export function langName(l: Lang): string {
  return DICTS[l]['lang.name'] ?? l;
}

/** Nombre mis en forme selon la langue (séparateurs de milliers). */
export function num(n: number): string {
  try {
    return n.toLocaleString(lang === 'zh' ? 'zh-CN' : lang);
  } catch {
    return String(n);
  }
}
