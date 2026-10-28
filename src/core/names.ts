/**
 * Filtre des pseudos : insultes, grossièretés et propos haineux, dans les 6 langues du jeu.
 *
 * Le pseudo est d'abord ramené à une forme simple (minuscules, sans accents, chiffres
 * « leet » remplacés : 0→o, 1→i, 3→e…), puis comparé à deux listes :
 * - SUBSTRINGS : mots assez longs et sans ambiguïté, refusés même au milieu d'un nom
 *   (« xxConnardxx ») et même avec des lettres répétées (« fuuuck ») ;
 * - WORDS : mots courts qui se cachent dans des noms innocents (« con » dans
 *   « Constance », « cul » dans « Hercule », « nique » dans « Monique ») : refusés
 *   seulement quand ils forment un mot entier du pseudo.
 */

const SUBSTRINGS = [
  // Français
  'connard', 'conard', 'connasse', 'conasse', 'salope', 'salaud', 'encule', 'enculer', 'putain', 'pouffiasse', 'poufiase',
  'petasse', 'grognasse', 'merde', 'couille', 'branleur', 'branleuse', 'trouduc', 'niquetamere', 'tamere', 'bougnoul', 'youpin',
  'tapette', 'enfoire', 'batard',
  // Anglais
  'fuck', 'shit', 'bitch', 'nigg', 'whore', 'slut', 'rapist', 'hitler', 'penis', 'vagin', 'pussy', 'wanker', 'asshole', 'bastard',
  'motherf', 'retarded',
  // Espagnol
  'mierda', 'cabron', 'pendej', 'maricon', 'gilipoll', 'gilipol', 'hijoput', 'hijodeput', 'joder',
  // Allemand
  'arschloch', 'wichser', 'hurensohn', 'fotze', 'scheiss', 'scheis', 'schlampe', 'schwuchtel', 'missgeburt', 'ficken',
  // Italien
  'cazzo', 'stronz', 'puttan', 'putan', 'vaffancul', 'minchia', 'coglion', 'troia', 'frocio', 'porcodio',
];

const WORDS = [
  // Français
  'con', 'cons', 'conne', 'pute', 'putes', 'bite', 'bites', 'chatte', 'cul', 'nique', 'niquer', 'ntm', 'fdp', 'pd', 'pede',
  'gouine', 'negre', 'negro', 'bicot', 'catin', 'teub', 'zob', 'nazi', 'nazis',
  // Anglais
  'ass', 'arse', 'dick', 'cock', 'cunt', 'fag', 'fags', 'faggot', 'twat', 'wank', 'tits', 'boobs', 'porn', 'porno', 'sex', 'sexe',
  'rape', 'piss', 'kkk', 'spic', 'chink', 'kike', 'tranny', 'dyke', 'anal',
  // Espagnol
  'puta', 'puto', 'polla', 'verga', 'culo', 'zorra', 'cono',
  // Allemand
  'arsch', 'hure', 'fick', 'neger', 'spast',
  // Italien
  'figa', 'merda', 'bastardo',
];

/** Chinois : comparé tel quel, partout dans le pseudo. */
const CJK = ['操你', '傻逼', '傻b', '妈的', '他妈', '屌', '鸡巴', '婊子', '草泥马', '尼玛', '狗日', '贱人', '屄', '肏', '去死'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'l' };

/** Minuscules, sans accents, chiffres « leet » remplacés. */
function simplify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[01345786@$!|]/g, (ch) => LEET[ch]);
}

/** « fuuuck » → « fuck ». */
const collapse = (s: string) => s.replace(/(.)\1+/g, '$1');

/** Le pseudo contient-il une grossièreté ? (le « #1234 » final est ignoré) */
export function isOffensive(name: string): boolean {
  const raw = name.replace(/#\d*$/, '');
  if (CJK.some((w) => raw.toLowerCase().includes(w))) return true;
  const simple = simplify(raw);
  const joined = simple.replace(/[^a-z]/g, '');
  if (SUBSTRINGS.some((w) => joined.includes(w) || collapse(joined).includes(w))) return true;
  const tokens = simple.split(/[^a-z]+/).filter(Boolean);
  // Un mot coupé par des séparateurs (« c.o.n », « p d ») compte aussi comme un mot entier.
  if (tokens.length > 1 && tokens.every((x) => x.length === 1)) tokens.push(tokens.join(''));
  return tokens.some((tok) => WORDS.includes(tok) || WORDS.includes(collapse(tok)));
}

/** Pseudo affichable : `fallback` à la place d'un pseudo grossier. */
export function safeName(name: string, fallback: string): string {
  return isOffensive(name) ? fallback : name;
}
