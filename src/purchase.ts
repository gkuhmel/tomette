import { NativePurchases } from '@capgo/native-purchases';
import { FULL_PRODUCT } from './core/premium';
import { isNative } from './native';
import { load, remove, save } from './ui/storage';

/**
 * Achat intégré « Tomettes complet » (non consommable, StoreKit 2).
 *
 * - Dans l'appli : l'achat est signé par Apple et vérifié par l'iPhone ; il est revérifié à
 *   chaque lancement (un remboursement le retire). Le résultat est gardé pour jouer hors ligne.
 * - Sur le site : pas d'achat possible (version gratuite, avec un lien vers l'appli).
 * - Développement : une bascule du panneau de debug simule l'achat (jamais dans la version publiée).
 */

const CACHE_KEY = 'tomettes.full';
const DEV_KEY = 'tomettes.devFull';

let owned = isNative && load(CACHE_KEY) === '1';
let price = '';
const listeners: (() => void)[] = [];

/** Version complète débloquée ? */
export function isPremium(): boolean {
  if (__DEV_TOOLS__ && load(DEV_KEY) !== null) return load(DEV_KEY) === '1';
  return owned;
}

/** Prix affiché par l'App Store (dans la devise du joueur), ou '' tant qu'il n'est pas connu. */
export function fullPrice(): string {
  return price;
}

/** Appelé quand l'achat ou le prix change (pour rafraîchir les verrous). */
export function onPremiumChange(fn: () => void): void {
  listeners.push(fn);
}

function setOwned(v: boolean): void {
  if (v === owned) return;
  owned = v;
  save(CACHE_KEY, v ? '1' : '0');
  listeners.forEach((fn) => fn());
}

/** Achats en cours de validité pour cet identifiant Apple (remboursés exclus). */
async function checkOwned(): Promise<boolean> {
  const { purchases } = await NativePurchases.getPurchases({ onlyCurrentEntitlements: true });
  return purchases.some((p) => p.productIdentifier === FULL_PRODUCT && !p.revocationDate);
}

/** Au lancement : vérifie l'achat auprès de l'App Store et récupère le prix. */
export async function initPurchases(): Promise<void> {
  if (!isNative) return;
  try {
    setOwned(await checkOwned());
  } catch {
    /* hors ligne : on garde le dernier résultat connu */
  }
  try {
    const { products } = await NativePurchases.getProducts({ productIdentifiers: [FULL_PRODUCT] });
    price = products[0]?.priceString ?? '';
    listeners.forEach((fn) => fn());
  } catch {
    /* prix inconnu : le bouton s'affiche sans prix */
  }
}

export type BuyResult = 'ok' | 'cancelled' | 'pending' | 'error';

/** Lance l'achat (fenêtre de l'App Store). */
export async function buyFull(): Promise<BuyResult> {
  if (__DEV_TOOLS__ && !isNative) {
    save(DEV_KEY, '1');
    listeners.forEach((fn) => fn());
    return 'ok';
  }
  if (!isNative) return 'error';
  try {
    const tx = await NativePurchases.purchaseProduct({ productIdentifier: FULL_PRODUCT });
    if (tx.productIdentifier !== FULL_PRODUCT) return 'error';
    setOwned(true);
    return 'ok';
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e);
    return /cancel/i.test(msg) ? 'cancelled' : /pending/i.test(msg) ? 'pending' : 'error';
  }
}

/** « Restaurer mes achats » : resynchronise avec l'App Store. Renvoie true si l'achat est retrouvé. */
export async function restoreFull(): Promise<boolean> {
  if (!isNative) return isPremium();
  try {
    await NativePurchases.restorePurchases();
    setOwned(await checkOwned());
  } catch {
    /* hors ligne ou refus : rien ne change */
  }
  return owned;
}

/** Développement : simule « acheté » / « pas acheté » (null : comportement réel). */
export function setDevPremium(v: boolean | null): void {
  if (!__DEV_TOOLS__) return;
  if (v === null) remove(DEV_KEY);
  else save(DEV_KEY, v ? '1' : '0');
  listeners.forEach((fn) => fn());
}
