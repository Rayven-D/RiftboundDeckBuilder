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
import { noticeOptions } from '../../shared/sync/notice';
import { refocusAfterDialog } from '../sync/sync.service';
import { CardData } from '../cards/card-data';
import {
  CollectionCatalogView,
  LockedShortfall,
  computeSharedPool,
  lockedShortfalls,
  shortfallNotice,
} from '../decks';
import { StorageFullError } from '../storage/kv-backend';
import { AppStores } from '../storage/app-stores';

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

  /** Emits after every commit or Undo this app wrote, so an open Collection refreshes in place (COLL-091, COLL-073). */
  readonly written = new Subject<void>();

  private last: LastCommit | null = null;

  /** Resolves the parsed list against the catalog (IMP-025, IMP-067…069); saves nothing (IMP-002). */
  async prepare(result: ParseResult): Promise<PreparedImport> {
    const c = await this.cardData.loadCatalog();
    if (c.status === 'error') {
      void this.cardData.reload(); // the next Continue tries again
      return { status: 'error', message: COMMIT_TEXT.catalogError };
    }
    return { status: 'ok', resolved: resolveCollectionImport(result, c.catalog), catalog: c.catalog };
  }

  /**
   * IMP-049…052 / IMP-072: Add at once; Replace after its IMP-050 confirmation (with the IMP-050a warnings). On a
   * written commit the notice with Undo shows (IMP-073); a failed write returns the error and shows nothing.
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

    if (mode === 'replace') {
      const nameOf = (k: string) => prepared.catalog.cards[k]?.name ?? k;
      const shortfalls = await this.shortfalls(before, after, prepared.catalog);
      const ok = await confirmImport(this.dialog, {
        title: COMMIT_TEXT.replaceTitle,
        text: replaceConfirmText(replaceChanges(before, after, nameOf)),
        shortfalls,
        confirm: COMMIT_TEXT.replaceConfirm,
      });
      if (!ok) return { status: 'cancelled' };
    }

    try {
      // TEST-033 (H-233): a Replace over test data also calls `removeTestDecks(stores, now)` here, in this commit.
      await this.stores.collection.save(after, { snapshotPrevious: true, replace: mode === 'replace' });
    } catch (err) {
      return { status: 'error', message: writeError(err) };
    }
    this.last = {
      message: commitNotice(mode, prepared.resolved, after),
      commitAt: after.updatedAt,
      snapshotAt: before?.updatedAt ?? EMPTY_SNAPSHOT_AT,
    };
    this.written.next();
    this.showCommitNotice();
    return { status: 'written' };
  }

  /** IMP-073 / IMP-074: the notice with Undo, 10 s, polite; any later notice replaces it (one snack bar at a time). */
  private showCommitNotice(): void {
    const last = this.last;
    if (!last) return;
    const ref = this.snackBar.open(last.message, UNDO_TEXT.action, {
      duration: COMMIT_NOTICE_MS,
      politeness: 'polite',
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
    const shortfalls =
      catalog.status === 'ok' ? await this.shortfalls(current, restore, catalog.catalog) : [];
    const confirmed = changed || shortfalls.length > 0;
    if (confirmed) {
      const ok = await confirmImport(this.dialog, {
        title: UNDO_TEXT.confirmTitle,
        text: changed ? UNDO_TEXT.changedSince : UNDO_TEXT.lockedOnly,
        shortfalls,
        confirm: UNDO_TEXT.confirm,
      });
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
    this.last = null; // (b) spent: Undo works once
    try {
      await this.stores.collection.clearPrevious();
    } catch {
      // The restore is written; a snapshot left behind is never offered again (`last` is spent, IMP-074).
    }
    this.written.next();
    notice([UNDO_TEXT.undone, ...(confirmed ? shortfalls.map(shortfallNotice) : [])].join(' '));
  }

  /** SPEC-008 `lockedShortfalls(before, after)` over the shared pool (IMP-050a); empty when anything can't be read. */
  private async shortfalls(
    before: StoredCollection | null,
    after: StoredCollection,
    catalog: CollectionCatalogView,
  ): Promise<LockedShortfall[]> {
    try {
      const [decks, locks, tags, printingCodes] = await Promise.all([
        this.stores.decks.list(),
        this.stores.locks.load(),
        this.stores.tags.load(),
        this.stores.printingCodes.load(),
      ]);
      if (!locks?.locks.length) return [];
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
      return lockedShortfalls(pool(before ?? empty), pool(after));
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
