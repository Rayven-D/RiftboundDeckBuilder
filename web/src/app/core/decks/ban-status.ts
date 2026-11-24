import { nameKey } from '../cards/name-key';
import type { BanListFile, BanStatus, CardKey, FormatId, IsoDate, RegionId } from './types';

/**
 * SPEC-002 LEGAL-B10 `banStatus(cardKey, format, region, asOf)`, the minimal pure piece Decks needs.
 * List lookup per LEGAL-B03 ((format, region), else (format, 'global')). Banned set as of D per
 * LEGAL-B02: waves with `effective <= D` (inclusive) in ascending effective order, ties in file
 * order; `add` inserts, `remove` deletes; ban-list names match by `nameKey` (CARD-030). `banned`
 * names the wave that last added the card. `upcoming` (LEGAL-B08): not banned as of D and a wave
 * with `announced <= D < effective` adds it.
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
  const list =
    data.lists.find((l) => l.format === format && l.region === region) ??
    data.lists.find((l) => l.format === format && l.region === 'global');
  if (!list) return out;

  const waves = list.waves
    .map((w, i) => ({ w, i }))
    .sort((a, b) =>
      a.w.effective < b.w.effective ? -1 : a.w.effective > b.w.effective ? 1 : a.i - b.i,
    )
    .map((x) => x.w);

  // LEGAL-B02: replay effective waves in order; within a wave `remove` before `add`.
  const addedBy = new Map<CardKey, (typeof waves)[number]>();
  for (const w of waves) {
    if (w.effective > asOf) continue;
    for (const e of w.remove) addedBy.delete(nameKey(e.name));
    for (const e of w.add) addedBy.set(nameKey(e.name), w);
  }
  for (const [k, w] of addedBy) {
    out.set(k, { status: 'banned', waveId: w.id, waveName: w.name, bannedSince: w.effective });
  }
  // LEGAL-B08: not banned as of D, and the first (in wave order) announced-not-effective wave adds it.
  for (const w of waves) {
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
