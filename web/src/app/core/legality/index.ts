/**
 * SPEC-002 Deck Legality engine (v0.5, H-194): pure, framework-free (LEGAL-R01). No Angular, no storage, no network,
 * no clock: the caller passes `asOf` (a calendar date, LEGAL-B12) and the data files (`data/banlist.json`,
 * `data/formats.json`, loaded by `CardData.loadLegalityData()`).
 */
export * from './types';
export { NO_SAMPLE_MARKER, evaluateLegality, legalityCatalog, supportedFormat, toDeckInput, verdictOf } from './evaluate';
export { NOT_EVALUATED_TEXT, RULES } from './rules';
export { normalizeSetCode, setEntry, setStatus } from './set-legality';
export type { SetStatus } from './set-legality';
export { checkBanList, checkFormats, isOfficialRiotUrl } from './data-check';
export type { DataIssue } from './data-check';
export { bannedSet } from '../decks/ban-status';
