import { nameKey } from '../cards/name-key';
import type { BanEntry, BanList, BanListFile, BanStatus, BanWave, CardKey, FormatId, IsoDate, RegionId } from './types';

/**
 * SPEC-002 LEGAL-B10 `banStatus(cardKey, format, region, asOf)`, the minimal pure piece Decks needs.
 * List lookup per LEGAL-B03 ((format, region), else (format, 'global')). Banned set as of D per
 * LEGAL-B02: waves with `effective <= D` (inclusive) in ascending effective order, ties in file
 * order; `add` inserts, `remove` deletes; ban-list names match by `nameKey` (CARD-030). `banned`
 * names the wave that last added the card. `upcoming` (LEGAL-B08): not banned as of D and a wave
 * with `announced <= D < effective` adds it. Dates are zone-less calendar dates compared as
 * `YYYY-MM-DD` strings, with no time or zone conversion (LEGAL-B12).
 */
export function banStatus(
  data: BanListFile,
  cardKey: CardKey,
  format: FormatId,
  region: RegionId,
  asOf: IsoDate,
): BanStatus {
  const hit = banLookup(data, format, region, asOf).get(cardKey);
  return hit ? { ...hit } : { status: 'not-banned' };
}

/** LEGAL-B03: the list for (format, region), else (format, 'global'); null when the format has none. */
export function banListFor(data: BanListFile, format: string, region: RegionId): BanList | null {
  return (
    data.lists.find((l) => l.format === format && l.region === region) ??
    data.lists.find((l) => l.format === format && l.region === 'global') ??
    null
  );
}

/** LEGAL-B02: a list's waves in ascending effective-date order, ties in file order. */
export function orderedWaves(list: BanList): BanWave[] {
  return list.waves
    .map((w, i) => ({ w, i }))
    .sort((a, b) => (a.w.effective < b.w.effective ? -1 : a.w.effective > b.w.effective ? 1 : a.i - b.i))
    .map((x) => x.w);
}

/** One name in the banned set as of D: the entry and the wave that (last) added it. */
export interface BannedName {
  readonly entry: BanEntry;
  readonly wave: BanWave;
}

/**
 * LEGAL-B02 banned set as of D, keyed by `nameKey(entry.name)`: start empty; replay every wave with
 * `effective <= D` (inclusive, zone-less dates, LEGAL-B12) in order; inside one wave every `remove`
 * runs before every `add`. A format without a list has an empty set.
 */
export function bannedSet(data: BanListFile, format: string, region: RegionId, asOf: IsoDate): Map<CardKey, BannedName> {
  const out = new Map<CardKey, BannedName>();
  const list = banListFor(data, format, region);
  if (!list) return out;
  for (const wave of orderedWaves(list)) {
    if (wave.effective > asOf) continue;
    for (const e of wave.remove) out.delete(nameKey(e.name));
    for (const entry of wave.add) out.set(nameKey(entry.name), { entry, wave });
  }
  return out;
}

/**
 * OWN-080: the banned / upcoming statuses of every listed cardKey for one (format, region, asOf),
 * built once per `BanListFile` object (WeakMap; ban data is an immutable snapshot) instead of
 * re-sorting waves and re-keying names on every `banStatus` call. Cards not in the map are
 * not banned.
 */
const lookups = new WeakMap<BanListFile, Map<string, Map<CardKey, BanStatus>>>();

function banLookup(
  data: BanListFile,
  format: FormatId,
  region: RegionId,
  asOf: IsoDate,
): Map<CardKey, BanStatus> {
  let byKey = lookups.get(data);
  if (!byKey) {
    byKey = new Map();
    lookups.set(data, byKey);
  }
  const key = `${format}|${region}|${asOf}`;
  let lookup = byKey.get(key);
  if (!lookup) {
    lookup = buildLookup(data, format, region, asOf);
    byKey.set(key, lookup);
  }
  return lookup;
}

function buildLookup(
  data: BanListFile,
  format: FormatId,
  region: RegionId,
  asOf: IsoDate,
): Map<CardKey, BanStatus> {
  const out = new Map<CardKey, BanStatus>();
  const list = banListFor(data, format, region);
  if (!list) return out;
  for (const [k, { wave: w }] of bannedSet(data, format, region, asOf)) {
    out.set(k, { status: 'banned', waveId: w.id, waveName: w.name, bannedSince: w.effective });
  }
  // LEGAL-B08: not banned as of D, and the first (in wave order) announced-not-effective wave adds it.
  for (const w of orderedWaves(list)) {
    if (!(w.announced <= asOf && asOf < w.effective)) continue;
    for (const e of w.add) {
      const k = nameKey(e.name);
      if (out.has(k)) continue;
      out.set(k, {
        status: 'upcoming',
        waveId: w.id,
        waveName: w.name,
        announced: w.announced,
        effective: w.effective,
      });
    }
  }
  return out;
}
