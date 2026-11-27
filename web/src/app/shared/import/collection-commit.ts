/**
 * SPEC-003 Owned Cards Import commit (H-158): resolving the parsed list against the card catalog, the Add / Replace
 * result (IMP-047…050), the Replace confirmation text (IMP-050), the commit notice (IMP-073) and the Undo checks
 * (IMP-075, COLL-058). Pure: no Angular, no storage; `core/import/collection-import.ts` does the writes.
 *
 * Resolution: a name through the SPEC-001 name lookup (IMP-025: exact `nameKey`, then the optional leading "a" /
 * "the" of CARD-034), a printing code through `lookupPrinting` (CARD-036, IMP-067…069). Anything that would need the
 * user's pick (a name several cards share under CARD-034; IMP-068 b) or the fuzzy review of IMP-026…030 is not
 * imported and is listed as left out (IMP-027: needs-review entries are not imported until the user picks).
 * The IMP-067 guard and IMP-068 compare names exactly, as those rows say.
 */
import { nameKey, nameLookup } from '../../core/cards/name-key';
import type { CollectionCatalogView, Printing } from '../../core/decks/types';
import { countLine } from '../collection/collection-view';
import { collectorKey, makePrintingComparator } from '../collection/printing-sort';
import type { CardKey, CollectionCard, PrintingId, StoredCollection } from '../storage/records';
import type { ParseResult, ParsedEntry } from './parse-card-list';

export type CommitMode = 'add' | 'replace';

/** A line that is not imported, or one imported with a note, shown in the dialog's review step. */
export interface ReviewLine {
  readonly line: number;
  readonly message: string;
}

export interface ResolvedCollectionImport {
  /** The import merged by `cardKey` (IMP-047), with per-printing counts where a code resolved (IMP-048). */
  readonly cards: Readonly<Record<CardKey, CollectionCard>>;
  /** Sum of the merged quantities (IMP-073 `<copies>`). */
  readonly copies: number;
  /** Distinct `cardKey`s in the import (IMP-073 `<cards>`). */
  readonly cardCount: number;
  /** Lines not imported (no name match, a name several cards share, code not found, code and name disagree). */
  readonly leftOut: readonly ReviewLine[];
  /** Lines imported with a warning (IMP-068 c, IMP-069 a). */
  readonly notes: readonly ReviewLine[];
  readonly catalogVersion: string;
}

/** The dialog's review step (IMP-051 summary): what would be committed, or why it can't be. */
export interface PreparedOk {
  readonly status: 'ok';
  readonly resolved: ResolvedCollectionImport;
  readonly catalog: CollectionCatalogView;
}
export type PreparedImport = PreparedOk | { status: 'error'; message: string };

export type CommitOutcome = { status: 'written' } | { status: 'cancelled' } | { status: 'error'; message: string };

/**
 * The seam between the shared import dialog and a save (H-158 Owned Cards; H-253 Deck Import): the dialog calls
 * `prepare` on Continue and `commit` on its action, and closes only on `written`. `P` is what the review step shows,
 * `C` what its action passes (Owned Cards: Add / Replace; Deck Import: the deck to save). `text` is the text box as
 * parsed, for a save that keeps lines as written (DECK-042).
 */
export interface ImportCommitter<P extends { readonly status: 'ok' } = PreparedOk, C = CommitMode> {
  prepare(result: ParseResult, text: string): Promise<P | { status: 'error'; message: string }>;
  commit(prepared: P, choice: C): Promise<CommitOutcome>;
}

export type PrintingLookup =
  | { status: 'found'; cardKey: CardKey; printingId: PrintingId }
  | { status: 'not-found' }
  | { status: 'ambiguous' };

/** CARD-036 `lookupPrinting` over the browser catalog view (same rules as `services/src/domain/lookup.ts`). */
export function printingLookup(
  catalog: CollectionCatalogView,
): (setCode: string, collectorNumber: string) => PrintingLookup {
  const byCollector = new Map<string, Printing[]>();
  for (const p of Object.values(catalog.printings)) {
    const k = `${p.setCode.toUpperCase()}\u0000${collectorKey(p.collectorNumber).key}`;
    const list = byCollector.get(k);
    if (list) list.push(p);
    else byCollector.set(k, [p]);
  }
  const compare = makePrintingComparator(catalog.sets);
  return (setCode, collectorNumber) => {
    const wanted = collectorKey(collectorNumber.replace(/\s*\/\s*/gu, '/'));
    const matches = byCollector.get(`${setCode.normalize('NFKC').trim().toUpperCase()}\u0000${wanted.key}`) ?? [];
    if (matches.length === 0) return { status: 'not-found' };
    const keys = new Set(matches.map((p) => p.cardKey));
    if (keys.size > 1) return { status: 'ambiguous' };
    const suffix = (p: Printing) => collectorKey(p.collectorNumber).suffix;
    const rank = (p: Printing) =>
      wanted.suffix !== null ? (suffix(p) === wanted.suffix ? 0 : 1) : suffix(p) === null || p.variant.kind === 'base' ? 0 : 1;
    const first = [...matches].sort((a, b) => rank(a) - rank(b) || compare(a, b))[0];
    return { status: 'found', cardKey: first.cardKey, printingId: first.printingId };
  };
}

const quoted = (s: string) => `"${s}"`;

/** IMP-025 (exact and article, CARD-034), IMP-067…069 and IMP-047 / IMP-048 merge. */
export function resolveCollectionImport(
  result: ParseResult,
  catalog: CollectionCatalogView,
): ResolvedCollectionImport {
  const lookup = printingLookup(catalog);
  const byName = nameLookup(Object.keys(catalog.cards));
  const cards: Record<CardKey, { quantity: number; byPrinting: Record<PrintingId, number> }> = {};
  const leftOut: ReviewLine[] = [];
  const notes: ReviewLine[] = [];
  const nameOf = (key: CardKey) => catalog.cards[key]?.name ?? key;

  const add = (key: CardKey, qty: number, printingId: PrintingId | null) => {
    const c = (cards[key] ??= { quantity: 0, byPrinting: {} });
    c.quantity += qty;
    if (printingId) c.byPrinting[printingId] = (c.byPrinting[printingId] ?? 0) + qty;
  };
  const exact = (name: string): CardKey | null => {
    const key = nameKey(name);
    return key && catalog.cards[key] ? key : null;
  };

  /** IMP-025 / CARD-034: counts the named card, or lists the line as left out (several cards, or none). */
  const addByName = (e: ParsedEntry, note: string | null = null): void => {
    const found = byName(e.name);
    if (found.status === 'found') {
      if (note) notes.push({ line: e.line, message: note });
      return add(found.cardKey, e.quantity, null);
    }
    leftOut.push({
      line: e.line,
      message:
        found.status === 'ambiguous'
          ? `${quoted(e.name)} matches more than one card: ${found.cardKeys.map(nameOf).join(', ')}.`
          : `No card named ${quoted(e.name)} in the card data.`,
    });
  };

  const resolve = (e: ParsedEntry): void => {
    if (e.quantity <= 0) return; // ZERO_QUANTITY lines add nothing (IMP-008)
    if (!e.printing) return addByName(e);
    // IMP-067 exact-name guard: the card part as typed (name and code together) is itself a card name.
    if (e.name) {
      const whole = exact(`${e.name} ${e.printing.text}`) ?? exact(`${e.printing.text} ${e.name}`);
      if (whole) return add(whole, e.quantity, null);
    }
    const code = e.printing.text;
    const found = lookup(e.printing.setCode, e.printing.collectorNumber);
    if (found.status === 'found') {
      if (!e.name || nameKey(e.name) === found.cardKey) return add(found.cardKey, e.quantity, found.printingId);
      const named = exact(e.name);
      if (named) {
        // IMP-068 (b): needs the user's pick, which this dialog doesn't offer yet; nothing is counted.
        leftOut.push({
          line: e.line,
          message: `${code} is ${nameOf(found.cardKey)}, but the line says ${nameOf(named)}.`,
        });
        return;
      }
      // IMP-068 (c): the code's card, with a warning.
      notes.push({ line: e.line, message: `${code} is ${nameOf(found.cardKey)}, so that card was used.` });
      return add(found.cardKey, e.quantity, found.printingId);
    }
    if (found.status === 'ambiguous') {
      leftOut.push({ line: e.line, message: `${code} matches more than one card in the card data.` });
      return;
    }
    // IMP-069
    if (!e.name) {
      leftOut.push({ line: e.line, message: `${code} isn't in the card data. Add the card name or fix the code.` });
      return;
    }
    addByName(e, `${code} isn't in the card data, so the card name was used.`);
  };

  for (const e of result.entries) resolve(e);
  const copies = Object.values(cards).reduce((s, c) => s + c.quantity, 0);
  return {
    cards,
    copies,
    cardCount: Object.keys(cards).length,
    leftOut,
    notes,
    catalogVersion: catalog.catalogVersion,
  };
}

/** An ISO time later than `previous` (DECK-074-style monotonic `updatedAt`, so a later write never looks older). */
export function nextUpdatedAt(now: number, previous: string | null | undefined): string {
  const prev = previous ? Date.parse(previous) : NaN;
  return new Date(Number.isFinite(prev) && prev >= now ? prev + 1 : now).toISOString();
}

/** IMP-049 Add: owned += imported, per `cardKey` and per printing. */
export function addToCollection(
  before: StoredCollection | null,
  imp: ResolvedCollectionImport,
  updatedAt: string,
): StoredCollection {
  const cards: Record<CardKey, CollectionCard> = {};
  for (const [k, c] of Object.entries(before?.cards ?? {})) cards[k] = { quantity: c.quantity, byPrinting: { ...c.byPrinting } };
  for (const [k, c] of Object.entries(imp.cards)) {
    const cur = (cards[k] ??= { quantity: 0, byPrinting: {} });
    cur.quantity += c.quantity;
    for (const [p, n] of Object.entries(c.byPrinting)) cur.byPrinting[p] = (cur.byPrinting[p] ?? 0) + n;
  }
  return { schemaVersion: 1, updatedAt, catalogVersion: imp.catalogVersion, cards };
}

/** IMP-049 Replace: the collection becomes exactly the imported set. */
export function replaceCollection(imp: ResolvedCollectionImport, updatedAt: string): StoredCollection {
  const cards: Record<CardKey, CollectionCard> = {};
  for (const [k, c] of Object.entries(imp.cards)) cards[k] = { quantity: c.quantity, byPrinting: { ...c.byPrinting } };
  return { schemaVersion: 1, updatedAt, catalogVersion: imp.catalogVersion, cards };
}

export interface ReplaceChanges {
  readonly removed: readonly string[];
  readonly changed: readonly { name: string; before: number; after: number }[];
}

/** IMP-050: names removed and names whose total changes, by display name (catalog name, else the key). */
export function replaceChanges(
  before: StoredCollection | null,
  after: StoredCollection,
  nameOf: (key: CardKey) => string,
): ReplaceChanges {
  const removed: string[] = [];
  const changed: { name: string; before: number; after: number }[] = [];
  for (const [k, c] of Object.entries(before?.cards ?? {})) {
    const a = after.cards[k]?.quantity ?? 0;
    if (a === 0) removed.push(nameOf(k));
    else if (a !== c.quantity) changed.push({ name: nameOf(k), before: c.quantity, after: a });
  }
  const byName = (x: string, y: string) => x.localeCompare(y);
  removed.sort(byName);
  changed.sort((x, y) => byName(x.name, y.name));
  return { removed, changed };
}

const LIST_MAX = 5;
const n = (v: number) => v.toLocaleString('en-US');
function listed(items: readonly string[]): string {
  const shown = items.slice(0, LIST_MAX).join(', ');
  return items.length > LIST_MAX ? `${shown}, +${n(items.length - LIST_MAX)} more` : shown;
}

/** IMP-050 / AC 19: "1 name removed (Abandon), 1 changed (Gust 2 → 1)." */
export function replaceConfirmText(ch: ReplaceChanges): string {
  const parts: string[] = [];
  if (ch.removed.length)
    parts.push(`${n(ch.removed.length)} ${ch.removed.length === 1 ? 'name' : 'names'} removed (${listed(ch.removed)})`);
  if (ch.changed.length)
    parts.push(`${n(ch.changed.length)} changed (${listed(ch.changed.map((c) => `${c.name} ${n(c.before)} → ${n(c.after)}`))})`);
  return parts.length ? `${parts.join(', ')}.` : 'No card you have now is removed or changed.';
}

const cardsText = (c: number) => `${n(c)} ${c === 1 ? 'card' : 'cards'}`;

/** IMP-073: "Added 42 copies of 30 cards." / "Collection replaced: 412 cards." */
export function commitNotice(mode: CommitMode, imp: ResolvedCollectionImport, written: StoredCollection): string {
  return mode === 'add'
    ? `Added ${countLine(imp.copies, imp.cardCount)}.`
    : `Collection replaced: ${cardsText(Object.keys(written.cards).length)}.`;
}

export const UNDO_TEXT = {
  action: 'Undo',
  undone: 'Import undone.',
  nothing: 'Nothing to undo.',
  failed: "Couldn't undo the import. Nothing was changed.",
  confirmTitle: 'Undo the import?',
  /** COLL-058: quantities changed after the import (manual edit, another tab or device). */
  changedSince: 'Your collection changed after this import. Undoing it also loses those changes.',
  confirm: 'Undo import',
} as const;

export { EMPTY_SNAPSHOT_AT } from '../storage/records';

/**
 * IMP-075 (a) / COLL-058: the stored quantities changed after the commit when the stored record is not the one the
 * commit wrote. Compared by `updatedAt` inequality (not only "later"), so a write from a device with a slow clock
 * still counts as a change.
 */
export function changedSinceCommit(current: StoredCollection | null, commitUpdatedAt: string): boolean {
  return current?.updatedAt !== commitUpdatedAt;
}

/** IMP-075 (d): the stored snapshot is still the one this commit kept (not cleared, not replaced by a later commit). */
export function snapshotIsOurs(snapshot: StoredCollection | null, snapshotUpdatedAt: string): boolean {
  return snapshot !== null && snapshot.updatedAt === snapshotUpdatedAt;
}
