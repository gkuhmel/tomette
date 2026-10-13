import type { Config } from '../config';
import type { Mode, ModeId } from '../core/modes';
import { Key, t } from '../i18n';

/** Textes dépendant des données du jeu (modes, succès, tutoriel). */
export const modeName = (id: ModeId) => t(`mode.${id}.name` as Key);
export const achName = (id: string) => t(`ach.${id}.name` as Key);
export const achDesc = (id: string) => t(`ach.${id}.desc` as Key);
export const tutoTitle = (id: string) => t(`tuto.${id}.title` as Key);
export const tutoText = (id: string) => t(`tuto.${id}.text` as Key);

export function duration(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  if (!m) return t('dur.sec', { s: r });
  return r ? t('dur.minsec', { m, s: r }) : t('dur.min', { m });
}

export function modeTag(m: Mode, cfg: Config): string {
  if (m.id === 'timeAttack') return t('mode.timeAttack.tag', { d: duration(cfg.timeAttackS) });
  if (m.id === 'mosaic') return t('mode.mosaic.tag', { d: duration(cfg.mosaicS) });
  if (m.id === 'express') return t('mode.express.tag', { n: Math.round(cfg.expressLevel) });
  return t('mode.endless.tag');
}
