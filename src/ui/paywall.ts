import type { LockReason } from '../core/premium';
import { Key, t } from '../i18n';
import { APP_STORE_URL, isNative } from '../native';
import { buyFull, fullPrice, isPremium, restoreFull } from '../purchase';
import { el } from './dom';
import { Screen } from './screens';

/**
 * Écran « Tomettes complet » : ce que débloque l'achat, et le bouton d'achat.
 * Dans l'appli : achat et restauration. Sur le site : lien vers l'appli (l'achat s'y fait).
 */
export function paywallScreen(onClose: (bought: boolean) => void): Screen & { open(reason: LockReason): void } {
  const reason = el('p', { class: 'full-reason' });
  const list = el(
    'ul',
    { class: 'full-list' },
    (['full.b1', 'full.b2', 'full.b3', 'full.b4', 'full.b5'] as Key[]).map((k) => el('li', {}, [t(k)])),
  );
  const status = el('p', { class: 'full-status' });
  const buy = el('button', { type: 'button', class: 'btn primary full-buy' });
  const restore = el('button', { type: 'button', class: 'btn' }, [t('full.restore')]);
  const later = el('button', { type: 'button', class: 'btn' }, [t('full.later')]);
  const web = el('p', { class: 'full-web' }, [t('full.web')]);
  const store = el('a', { class: 'btn primary full-buy', href: APP_STORE_URL || '#', target: '_blank', rel: 'noopener' }, [
    t(APP_STORE_URL ? 'full.getApp' : 'full.appSoon'),
  ]);
  if (!APP_STORE_URL) store.setAttribute('aria-disabled', 'true');
  let busy = false;

  const setBusy = (v: boolean) => {
    busy = v;
    buy.disabled = restore.disabled = v;
  };
  const done = (msg: Key) => {
    status.textContent = t(msg);
    window.setTimeout(() => {
      screen.hide();
      onClose(true);
    }, 1200);
  };

  buy.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    status.textContent = '';
    const r = await buyFull();
    setBusy(false);
    if (r === 'ok') done('full.thanks');
    else if (r === 'pending') status.textContent = t('full.pending');
    else if (r === 'error') status.textContent = t('full.error');
  });
  restore.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    status.textContent = '';
    const found = await restoreFull();
    setBusy(false);
    if (found) done('full.restored');
    else status.textContent = t('full.notFound');
  });
  later.addEventListener('click', () => {
    screen.hide();
    onClose(isPremium());
  });

  // Dans l'appli : achat et restauration ; sur le site (et en développement dans le
  // navigateur, où l'achat est simulé) : lien vers l'appli.
  const native = isNative || __DEV_TOOLS__;
  const screen = new Screen('screen-full', [
    el('div', { class: 'panel full-panel' }, [
      el('h2', {}, [t('full.title')]),
      reason,
      list,
      ...(native ? [buy, restore] : [web, store]),
      status,
      later,
    ]),
  ]);
  return Object.assign(screen, {
    open(r: LockReason) {
      reason.textContent = t(`full.reason.${r}` as Key);
      const price = fullPrice();
      buy.textContent = price ? t('full.buyPrice', { price }) : t('full.buy');
      status.textContent = '';
      setBusy(false);
      screen.root.scrollTop = 0;
      screen.show();
    },
  });
}
