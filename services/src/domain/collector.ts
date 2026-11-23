// CARD-037: collector-number normalization.
import type { CollectorInfo } from './types.ts';

const BLOCK_FORM = /^([A-Z]+[0-9]*)\/([0-9]+)([A-Z*]*)$/u; // SP1/005
const FRACTION_FORM = /^([0-9]+)([A-Z*]*)\/([0-9]+)$/u; // 005/298, 300/250
const PLAIN_FORM = /^([0-9]+)([A-Z*]*)$/u; // 007a, 7

function suffixOf(raw: string | undefined): string | null {
  return raw ? raw : null;
}

export function collectorKey(raw: string): CollectorInfo {
  let s = raw.normalize('NFKC').trim();
  if (s.startsWith('#')) s = s.slice(1);
  s = s.toUpperCase();

  let m = BLOCK_FORM.exec(s);
  if (m) {
    const block = m[1] as string;
    const number = Number.parseInt(m[2] as string, 10);
    return { key: `${block}/${number}`, block, number, suffix: suffixOf(m[3]), form: 'block' };
  }
  m = FRACTION_FORM.exec(s);
  if (m) {
    const number = Number.parseInt(m[1] as string, 10);
    return { key: String(number), block: null, number, suffix: suffixOf(m[2]), form: 'fraction' };
  }
  m = PLAIN_FORM.exec(s);
  if (m) {
    const number = Number.parseInt(m[1] as string, 10);
    return { key: String(number), block: null, number, suffix: suffixOf(m[2]), form: 'plain' };
  }
  return { key: `#${s}`, block: null, number: null, suffix: null, form: 'code' };
}
