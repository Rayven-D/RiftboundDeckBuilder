import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, take } from 'rxjs';
import { DeckImport } from '../../core/import/deck-import';
import { AppStores } from '../../core/storage/app-stores';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { refocusAfterDialog } from '../../core/sync/sync.service';
import { EmptyState } from '../../shared/empty-state';
import { FileDrop } from '../../shared/import/file-drop';
import { ImportDialog, ImportDialogData, ImportDialogResult } from '../../shared/import/import-dialog';
import { IMPORT_PARAMS, dialogOpener, importFocusTarget, launchDecision } from '../../shared/import/import-launch';
import { PageFab } from '../../shared/page-fab';

/** SPEC-005 OWN-008 (v0.7) empty state. */
export const DECKS_EMPTY = {
  heading: 'No decks yet',
  message: 'Import a deck list to see which of its cards you own.',
} as const;

/**
 * `/decks` (SYNC-009 gated). SPEC-005 OWN-094 / SPEC-006 DECK-001 (v0.9, H-174): "Import deck" opens from this page,
 * from the floating button (shown with the deck list) or the empty state's button (OWN-008), or from the one-shot
 * address `/decks?import=1` (SYNC-159); a saved deck stays here (DECK-098: `DeckImport` writes it and shows "Deck
 * saved."; the count re-reads in place, H-253). The deck list itself is H-060: until it exists the page shows a count
 * line in its place.
 */
@Component({
  selector: 'app-decks-page',
  imports: [EmptyState, RouterLink, SignInPanel, PageFab, FileDrop],
  template: `
    <header class="page-header">
      <h1>Decks</h1>
      <p class="page-lede">Decks you've imported. Cards you own are shown in full color.</p>
    </header>
    <!-- SYNC-009: gated (account-only, SPEC-010 v0.12). -->
    @if (gate.open()) {
      @if (deckCount(); as n) {
        <!-- OWN-094 (f): right after the page header, before the list's controls. -->
        <app-page-fab label="Import deck" icon="upload" (pressed)="openImport()" />
        <p class="count-line" role="status">{{ n }} {{ n === 1 ? 'deck' : 'decks' }} saved.</p>
      } @else if (deckCount() === 0) {
        <app-empty-state [heading]="empty.heading" [message]="empty.message">
          <button #emptyImport type="button" class="button" aria-haspopup="dialog" (click)="openImport()">Import deck</button>
          <a class="button button--outlined" routerLink="/tournaments">Tournaments</a>
        </app-empty-state>
      }
    } @else {
      <app-sign-in-panel />
    }
    <!-- OWN-094 / COLL-094 (i) SHOULD: drop a file to import a deck (gate open, page ready). -->
    <app-file-drop text="Drop to import a deck" [enabled]="ready()" (dropped)="openImport($event)" />
  `,
})
export class DecksPage {
  protected readonly gate = inject(SignInGate);
  private readonly stores = inject(AppStores).stores;
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly deckImport = inject(DeckImport);
  private readonly fab = viewChild(PageFab);
  private readonly emptyImport = viewChild<ElementRef<HTMLButtonElement>>('emptyImport');
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  /** A dialog can close after the page is gone (navigation, test teardown): then nothing is focused. */
  private destroyed = false;
  protected readonly empty = DECKS_EMPTY;
  /** null while loading (and while the gate is closed: nothing is read from the cache, SYNC-009). */
  protected readonly deckCount = signal<number | null>(null);
  /** The page can import: the gate is open and the decks are read. */
  protected readonly ready = signal(false);
  private readonly importParam = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get(IMPORT_PARAMS.deck))),
    { initialValue: null },
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
    // DECK-098: a deck saved in this tab shows up at once (the count now; the list first by updatedAt with H-060).
    this.deckImport.saved.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.gate.open()) void this.loadCount();
    });
    // Read only while the gate is open, so the cache of a signed-out device stays hidden (SYNC-009).
    effect(() => {
      if (!this.gate.open()) {
        this.ready.set(false);
        this.deckCount.set(null);
        return;
      }
      untracked(() => void this.loadCount());
    });
    // SYNC-159 (c): `?import=1` opens the dialog once the page is ready, then leaves the address (no history entry).
    effect(() => {
      const decision = launchDecision(this.importParam(), this.ready() ? 'ready' : 'waiting');
      if (decision === 'none' || decision === 'wait') return;
      untracked(() => {
        this.dropParam();
        if (decision === 'open') this.openWhenFree();
      });
    });
  }

  private async loadCount(): Promise<void> {
    let n: number;
    try {
      n = (await this.stores.decks.list()).length;
    } catch {
      n = 0; // unreadable decks: the empty state's Import deck still works (DECK-091 is the list's business, H-060)
    }
    this.deckCount.set(n);
    this.ready.set(true);
  }

  private dropParam(): void {
    void this.router.navigate([], {
      queryParams: { [IMPORT_PARAMS.deck]: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * A dialog opened by the address waits for any dialog already open (e.g. the SYNC-154 username prompt of a new
   * account, which opens during the first sync) to close, so the two never stack.
   */
  private openWhenFree(): void {
    if (this.dialog.openDialogs.length === 0) return this.openImport();
    this.dialog.afterAllClosed.pipe(take(1)).subscribe(() => this.openImport());
  }

  /**
   * DECK-001: the shared dialog titled "Import deck". Focus returns to the floating button, else the opener, else the
   * empty state's Import deck, else #main, chosen when the dialog closes (H-189: a `?import=1` launch has no FAB yet).
   */
  protected openImport(file?: File): void {
    const opener = dialogOpener(this.doc);
    const deckCommitter = this.deckImport;
    const ref = this.dialog.open<ImportDialog, ImportDialogData, ImportDialogResult>(ImportDialog, {
      data: file ? { kind: 'deck', file, deckCommitter } : { kind: 'deck', deckCommitter },
      width: '40rem',
      maxWidth: 'calc(100vw - 2rem)',
      autoFocus: 'textarea',
      restoreFocus: false,
    });
    ref.afterClosed().subscribe(() => {
      if (this.destroyed) return;
      afterNextRender(
        () =>
          refocusAfterDialog(
            importFocusTarget({ fab: this.fab()?.element(), opener, emptyButton: this.emptyImport()?.nativeElement }),
            this.doc,
          ),
        { injector: this.injector },
      );
    });
  }
}
