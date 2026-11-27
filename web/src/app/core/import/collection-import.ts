import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import {
  CommitMode,
  CommitOutcome,
  ImportCommitter,
  PreparedImport,
  UNDO_TEXT,
  addToCollection,
  changedSinceCommit,
  commitNotice,
  nextUpdatedAt,
  replaceChanges,
  replaceCollection,
  replaceConfirmText,
  resolveCollectionImport,
  snapshotIsOurs,
} from '../../shared/import/collection-commit';
import { confirmImport } from '../../shared/import/import-confirm-dialog';
import type { ParseResult } from '../../shared/import/parse-card-list';
import { EMPTY_SNAPSHOT_AT, StoredCollection } from '../../shared/storage/records';
import type { PreparedOk } from '../../shared/import/collection-commit';
import { ReadOnlyAreaError } from '../../shared/sync/tracked-stores';
import { NOTICE_POSITION, noticeOptions } from '../../shared/sync/notice';
import { refocusAfterDialog } from '../sync/sync.service';
import { CardData } from '../cards/card-data';
import { CollectionCatalogView, LockLoss, computeSharedPool, lockLosses } from '../decks';
import { DeckLocks } from '../../shared/deck/deck-locks.service';
import { LOCK_REMOVAL_TEXT } from '../../shared/deck/deck-locks';
import { StorageFullError } from '../storage/kv-backend';
import { AppStores } from '../storage/app-stores';
import { removeTestDecks } from '../test-data/test-data-ops';
import { isTestDeck } from '../../shared/collection/test-data';

/** IMP-074 (RJ confirmed 2026-11-25): the commit notice and its Undo stay 10 s. */
export const COMMIT_NOTICE_MS = 10_000;

export const COMMIT_TEXT = {
  catalogError: "Card data couldn't load, so the cards can't be matched yet. Try again in a moment.",
  storageFull: "Couldn't save: this device's storage is full. Your collection wasn't changed.",
  failed: "Couldn't save your collection. It wasn't changed. Try again.",
  replaceTitle: 'Replace your collection?',
  replaceConfirm: 'Replace',
} as const;

/** The commit whose notice can still be undone (IMP-052, IMP-075). */
interface LastCommit {
  message: string;
  /** `updatedAt` of the record the commit wrote (COLL-058 check). */
  commitAt: string;
  /** `updatedAt` of the snapshot it kept (IMP-075 d: still ours?). */
  snapshotAt: string;
}

/**
 * SPEC-003 Owned Cards Import commit and its Undo (IMP-049…052, IMP-072…075; SPEC-007 COLL-058, COLL-088, COLL-091).
 * App-level (root), so the commit notice and its Undo outlive the Collection page (IMP-074). Writes go through the
 * tracked stores only (SPEC-010 SYNC-031). Deck Import (SPEC-006, H-253) has its own save and never comes here.
 */
@Injectable({ providedIn: 'root' })
export class CollectionImport implements ImportCommitter {
  private readonly stores = inject(AppStores).stores;
  private readonly cardData = inject(CardData);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly app = inject(AppStores);
  private readonly deckLocks = inject(DeckLocks);

  /** Emits after every commit or Undo this app wrote, so an open Collection refreshes in place (COLL-091, COLL-073). */
  readonly written = new Subject<void>();

  private last: LastCommit | null = null;

  /**
   * Resolves the parsed list against the catalog (IMP-025, IMP-067…069); saves nothing (IMP-002). Always the real
   * `/api` catalog, never the generated test catalog, so a Replace over test data writes the real `catalogVersion`
   * (SPEC-013 TEST-033, AC 12).
   */
  async prepare(result: ParseResult): Promise<PreparedImport> {
    const c = await this.cardData.loadApiCatalog();
    if (c.status === 'error') {
      void this.cardData.reload(); // the next Continue tries again
      return { status: 'error', message: COMMIT_TEXT.catalogError };
    }
    return { status: 'ok', resolved: resolveCollectionImport(result, c.catalog), catalog: c.catalog };
  }

  /**
   * IMP-049…052 / IMP-072: Add at once; Replace after its IMP-050 confirmation, which lists the card-name locks it
   * would unlock (IMP-050a, SHARE-087…090: free copies go first, so only locks it must take are listed). Confirm
   * writes the collection and drops exactly those name locks. On a written commit the notice with Undo shows
   * (IMP-073) and an immediate sync starts (SYNC-126 (a) 2); a failed write returns the error and shows nothing.
   */
  async commit(prepared: PreparedOk, mode: CommitMode): Promise<CommitOutcome> {
    let before: StoredCollection | null;
    try {
      before = await this.stores.collection.load();
    } catch {
      return { status: 'error', message: COMMIT_TEXT.failed };
    }
    const at = nextUpdatedAt(Date.now(), before?.updatedAt);
    const after =
      mode === 'add' ? addToCollection(before, prepared.resolved, at) : replaceCollection(prepared.resolved, at);

    let losses: LockLoss[] = [];
    if (mode === 'replace') {
      const nameOf = (k: string) => prepared.catalog.cards[k]?.name ?? k;
      // TEST-033: the test decks go in this commit, so they are left out of the IMP-050a lines.
      losses = await this.losses(before, after, prepared.catalog, { withoutTestDecks: true });
      const ok = await confirmImport(this.dialog, {
        title: COMMIT_TEXT.replaceTitle,
        text: replaceConfirmText(replaceChanges(before, after, nameOf)),
        losses,
        confirm: COMMIT_TEXT.replaceConfirm,
      });
      if (!ok) return { status: 'cancelled' };
    }

    try {
      await this.stores.collection.save(after, { snapshotPrevious: true, replace: mode === 'replace' });
    } catch (err) {
      return { status: 'error', message: writeError(err) };
    }
    await this.dropLosses(losses);
    if (mode === 'replace') {
      // SPEC-013 TEST-033 / TEST-034 (H-233): the new collection's real `catalogVersion` ends the test state (and the
      // banner, with Remove), so the same commit removes the three test decks and their locks (a no-op when there
      // are none). After the collection write, so a failed write leaves everything as it was. If this part fails the
      // import still stands; a stray test deck is removed by the next Replace or Remove (TEST-034).
      try {
        await removeTestDecks(this.stores, () => Date.now());
      } catch {
        // see above
      }
    }
    this.last = {
      message: commitNotice(mode, prepared.resolved, after),
      commitAt: after.updatedAt,
      snapshotAt: before?.updatedAt ?? EMPTY_SNAPSHOT_AT,
    };
    this.written.next();
    this.showCommitNotice();
    this.app.majorAction(); // SYNC-126 (a) 2: Add or Replace
    return { status: 'written' };
  }

  /** IMP-073 / IMP-074: the notice with Undo, 10 s, polite; any later notice replaces it (one snack bar at a time). */
  private showCommitNotice(): void {
    const last = this.last;
    if (!last) return;
    const ref = this.snackBar.open(last.message, UNDO_TEXT.action, {
      duration: COMMIT_NOTICE_MS,
      politeness: 'polite',
      ...NOTICE_POSITION,
    });
    ref.onAction().subscribe(() => void this.undoCommit(last));
  }

  /** IMP-075: Undo of the last commit (what the notice's action runs). */
  undo(): Promise<void> {
    return this.undoCommit(this.last);
  }

  /** `commit` is the commit the tapped notice belongs to; a newer commit makes it stale (IMP-075 d). */
  private async undoCommit(commit: LastCommit | null): Promise<void> {
    const notice = (text: string, kind: 'success' | 'error' = 'success') =>
      this.snackBar.open(text, kind === 'error' ? 'OK' : undefined, noticeOptions(kind));
    let snapshot: StoredCollection | null;
    let current: StoredCollection | null;
    try {
      [snapshot, current] = await Promise.all([this.stores.collection.loadPrevious(), this.stores.collection.load()]);
    } catch {
      notice(UNDO_TEXT.failed, 'error');
      return;
    }
    // (d) cleared by a sign-out / first sign-in, spent, or replaced by a later commit (this tab or another).
    if (!commit || commit !== this.last || !snapshotIsOurs(snapshot, commit.snapshotAt)) {
      notice(UNDO_TEXT.nothing);
      return;
    }
    const restore = snapshot!;
    const changed = changedSinceCommit(current, commit.commitAt);
    const catalog = await this.cardData.loadCatalog();
    const losses = catalog.status === 'ok' ? await this.losses(current, restore, catalog.catalog) : [];
    // IMP-075 (a) / IMP-050a (b): the COLL-058 confirmation when the collection changed since the commit (with the
    // lock lines inside); otherwise a confirmation only when a name lock would be unlocked (SHARE-088 wording).
    if (changed || losses.length > 0) {
      const ok = await confirmImport(
        this.dialog,
        changed
          ? { title: UNDO_TEXT.confirmTitle, text: UNDO_TEXT.changedSince, losses, confirm: UNDO_TEXT.confirm }
          : { title: LOCK_REMOVAL_TEXT.title, text: '', losses, confirm: LOCK_REMOVAL_TEXT.confirm },
      );
      refocusAfterDialog(undefined);
      if (!ok) {
        // (c) Cancel: nothing written, the commit notice again with a fresh 10 s.
        if (this.last === commit) this.showCommitNotice();
        return;
      }
    }
    try {
      const latest = await this.stores.collection.load();
      await this.stores.collection.save(
        { ...restore, updatedAt: nextUpdatedAt(Date.now(), latest?.updatedAt) },
        { replace: true },
      );
    } catch (err) {
      notice(err instanceof ReadOnlyAreaError ? err.message : UNDO_TEXT.failed, 'error');
      return;
    }
    await this.dropLosses(losses);
    this.last = null; // (b) spent: Undo works once
    try {
      await this.stores.collection.clearPrevious();
    } catch {
      // The restore is written; a snapshot left behind is never offered again (`last` is spent, IMP-074).
    }
    this.written.next();
    // IMP-075 (b) v0.16: just "Import undone." (no per-deck notice after it any more).
    notice(UNDO_TEXT.undone);
    this.app.majorAction(); // SYNC-126 (a) 3
  }

  /**
   * SHARE-088 Confirm: removes exactly the listed name locks after the collection write. Not a separate sync (the
   * commit or Undo starts one). If it fails the collection change stands; the pool settles the short locks anyway
   * (SHARE-090), so nothing shows them as locked.
   */
  private async dropLosses(losses: readonly LockLoss[]): Promise<void> {
    try {
      await this.deckLocks.dropLosses(losses, { sync: false });
    } catch {
      // see above
    }
  }

  /** SPEC-008 `lockLosses(before, after)` over the shared pool (IMP-050a); empty when anything can't be read. */
  private async losses(
    before: StoredCollection | null,
    after: StoredCollection,
    catalog: CollectionCatalogView,
    opts: { withoutTestDecks?: boolean } = {},
  ): Promise<LockLoss[]> {
    try {
      const [allDecks, locks, tags, printingCodes] = await Promise.all([
        this.stores.decks.list(),
        this.stores.locks.load(),
        this.stores.tags.load(),
        this.stores.printingCodes.load(),
      ]);
      if (!locks?.locks.length) return [];
      const decks = opts.withoutTestDecks ? allDecks.filter((d) => !isTestDeck(d)) : allDecks;
      const pool = (collection: StoredCollection) =>
        computeSharedPool({
          decks,
          locks: locks.locks,
          ownership: {
            collection,
            tags: tags ?? { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} },
            printingCodes: printingCodes ?? { schemaVersion: 1, updatedAt: '', codes: {} },
            catalog,
          },
        });
      const empty: StoredCollection = { schemaVersion: 1, updatedAt: '', catalogVersion: '', cards: {} };
      return lockLosses(pool(before ?? empty), pool(after));
    } catch {
      return [];
    }
  }
}

function writeError(err: unknown): string {
  if (err instanceof StorageFullError) return COMMIT_TEXT.storageFull;
  if (err instanceof ReadOnlyAreaError) return err.message;
  return COMMIT_TEXT.failed;
}
