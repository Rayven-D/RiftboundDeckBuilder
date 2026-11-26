import type { FormatDef, IsoDate, LegalitySetView, RegionId, SetLegality } from './types';

/**
 * A set's legality in (format, region) as of D (LEGAL-C02):
 * - `legal`;
 * - `excluded`: in `excludedSets` (the promo groupings, legal by name only, LEGAL-C07);
 * - `not-yet`: a Riot-published `legalFrom` after D (LEGAL-C04);
 * - `preview`: a preview set in the catalog with no `legalFrom` ("not released yet");
 * - `rotated`: D on or after `legalUntil` (exclusive, LEGAL-C05: "no longer legal");
 * - `unknown`: no entry and no usable release status (LEGAL-017 → `not_evaluated`).
 */
export type SetStatus =
  | { status: 'legal' }
  | { status: 'excluded' }
  | { status: 'not-yet'; legalFrom: IsoDate }
  | { status: 'preview' }
  | { status: 'rotated'; legalUntil: IsoDate }
  | { status: 'unknown' };

/** LEGAL-C06: set codes compare in upper case ("Ven" → `VEN`). */
export function normalizeSetCode(code: string): string {
  return code.trim().toUpperCase();
}

/** The format's set entry for a code, per region with a fall back to `global` (as LEGAL-B03 does for bans). */
export function setEntry(def: FormatDef, region: RegionId, code: string): SetLegality | null {
  const c = normalizeSetCode(code);
  const find = (list: SetLegality[] | undefined) => list?.find((s) => normalizeSetCode(s.code) === c) ?? null;
  return find(def.sets[region]) ?? (region === 'global' ? null : find(def.sets['global']));
}

/** LEGAL-C02 for one set code. `catalogSets` is the SPEC-001 set list (CARD-008 `releaseStatus`). */
export function setStatus(
  def: FormatDef,
  region: RegionId,
  catalogSets: readonly LegalitySetView[],
  code: string,
  asOf: IsoDate,
): SetStatus {
  const c = normalizeSetCode(code);
  // (1)
  if (def.excludedSets.some((x) => normalizeSetCode(x) === c)) return { status: 'excluded' };
  const entry = setEntry(def, region, c);
  // (4) legalUntil is exclusive.
  if (entry?.legalUntil && asOf >= entry.legalUntil) return { status: 'rotated', legalUntil: entry.legalUntil };
  // (2) a Riot-published date wins over the catalog (LEGAL-C09).
  if (entry?.legalFrom) return entry.legalFrom <= asOf ? { status: 'legal' } : { status: 'not-yet', legalFrom: entry.legalFrom };
  // (3)
  const release = catalogSets.find((s) => normalizeSetCode(s.code) === c)?.releaseStatus ?? null;
  if (release === 'released') return { status: 'legal' };
  if (release === 'preview') return { status: 'preview' };
  if (entry?.basis === 'riot-listing') return { status: 'legal' };
  return { status: 'unknown' };
}
