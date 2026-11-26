import { nameKey } from '../cards/name-key';
import { normalizeSetCode } from './set-legality';
import type { BanKind, BanListFile, FormatsFile, LegalityCatalog } from './types';

/** One finding of the data check. `error`s block publishing the data; `warning`s are reported only. */
export interface DataIssue {
  severity: 'error' | 'warning';
  code: 'unofficial-source' | 'set-code-case' | 'set-status-mismatch' | 'ban-name-unresolved' | 'ban-kind-mismatch' | 'bad-date';
  message: string;
}

/** Riot-owned hosts (Riot's sites and its CMS, where the Tournament Rules PDF lives). */
const OFFICIAL_HOSTS = ['playriftbound.com', 'riotgames.com', 'rgpub.io'];

export function isOfficialRiotUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `data/formats.json` check: LEGAL-C08 (a `legalFrom` needs an official Riot `sourceUrl`), LEGAL-C06 (set codes in upper
 * case), dates as `YYYY-MM-DD` (LEGAL-B12), and with a catalog LEGAL-C09 `set-status-mismatch` warnings.
 */
export function checkFormats(file: FormatsFile, catalog?: LegalityCatalog, today?: string): DataIssue[] {
  const out: DataIssue[] = [];
  for (const f of file.formats) {
    for (const [region, sets] of Object.entries(f.sets)) {
      for (const s of sets) {
        const where = `${f.id}/${region}/${s.code}`;
        if (s.code !== normalizeSetCode(s.code)) {
          out.push({ severity: 'error', code: 'set-code-case', message: `${where}: set codes are upper case (LEGAL-C06).` });
        }
        for (const d of [s.legalFrom, s.legalUntil]) {
          if (d !== null && !ISO_DATE.test(d)) out.push({ severity: 'error', code: 'bad-date', message: `${where}: ${d} is not YYYY-MM-DD.` });
        }
        if ((s.legalFrom !== null || s.legalUntil !== null) && !isOfficialRiotUrl(s.sourceUrl)) {
          out.push({ severity: 'error', code: 'unofficial-source', message: `${where}: a date needs an official Riot sourceUrl (LEGAL-C08).` });
        }
        const release = catalog?.sets.find((c) => normalizeSetCode(c.code) === normalizeSetCode(s.code))?.releaseStatus ?? null;
        if (s.legalFrom && today && release) {
          const due = s.legalFrom <= today;
          if ((due && release === 'preview') || (!due && release === 'released')) {
            out.push({
              severity: 'warning',
              code: 'set-status-mismatch',
              message: `${where}: the catalog says ${release}, the legalFrom is ${s.legalFrom} (LEGAL-C09; legalFrom wins).`,
            });
          }
        }
      }
    }
  }
  return out;
}

const KIND_CATEGORY: Readonly<Record<BanKind, (category: string) => boolean>> = {
  legend: (c) => c === 'legend',
  battlefield: (c) => c === 'battlefield',
  card: (c) => c !== 'legend' && c !== 'battlefield' && c !== 'rune',
};

/**
 * `data/banlist.json` check: dates as `YYYY-MM-DD`, official sources (LEGAL-B06), and with a catalog LEGAL-B05 (every
 * name resolves by `nameKey` to a `cardKey` of the matching kind; a miss is an error, never fixed by an alias).
 */
export function checkBanList(file: BanListFile, catalog?: LegalityCatalog): DataIssue[] {
  const out: DataIssue[] = [];
  for (const list of file.lists) {
    for (const w of list.waves) {
      const where = `${list.format}/${list.region}/${w.id}`;
      for (const d of [w.announced, w.effective]) {
        if (!ISO_DATE.test(d)) out.push({ severity: 'error', code: 'bad-date', message: `${where}: ${d} is not YYYY-MM-DD.` });
      }
      if (!isOfficialRiotUrl(w.sourceUrl)) {
        out.push({ severity: 'error', code: 'unofficial-source', message: `${where}: the sourceUrl is not an official Riot URL (LEGAL-B06).` });
      }
      if (!catalog) continue;
      for (const e of [...w.add, ...w.remove]) {
        const card = catalog.cards[nameKey(e.name)];
        if (!card) {
          out.push({ severity: 'error', code: 'ban-name-unresolved', message: `${where}: "${e.name}" is not in the card data (LEGAL-B05).` });
        } else if (card.category !== 'unknown' && !KIND_CATEGORY[e.kind](card.category)) {
          out.push({ severity: 'error', code: 'ban-kind-mismatch', message: `${where}: "${e.name}" is a ${card.category}, listed as ${e.kind} (LEGAL-B05).` });
        }
      }
    }
  }
  return out;
}
