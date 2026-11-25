import { BreakpointObserver } from '@angular/cdk/layout';
import { Location } from '@angular/common';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollableWindow,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { map, take } from 'rxjs';
import { CardData } from '../../core/cards/card-data';
import type { DeckLock, DeckOwnershipInput, StoredTags } from '../../core/decks';
import { AppStores } from '../../core/storage/app-stores';
import { refocusAfterDialog } from '../../core/sync/sync.service';
import { KEY_PREFIX } from '../../core/storage/kv-backend';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import {
  CARD_DIALOG_TITLE_ID,
  CardDialog,
  CardDialogData,
  CardDialogResult,
} from '../../shared/collection/card-dialog';
import { CollectionTile } from '../../shared/collection/collection-tile';
import {
  CollectionSort,
  CollectionView,
  DECKS_UNREADABLE,
  SORTS,
  buildCollectionView,
  cardDetail,
  chunkRows,
  columnsFor,
  countLine,
  gridMove,
  ignoredNotice,
  parseUrlQuery,
  queryTiles,
  queryUnresolved,
  rowHeightFor,
  showingLine,
  sortFromStored,
  storedSort,
  urlParams,
} from '../../shared/collection/collection-view';
import { exportCollectionCsv } from '../../shared/collection/export-csv';
import { EmptyState } from '../../shared/empty-state';
import { FileDrop } from '../../shared/import/file-drop';
import { ImportDialog, ImportDialogData } from '../../shared/import/import-dialog';
import { IMPORT_PARAMS, dialogOpener, importFocusTarget, launchDecision } from '../../shared/import/import-launch';
import { ImportPending } from '../../shared/import/import-pending';
import { ParseResult } from '../../shared/import/parse-card-list';
import { PageFab } from '../../shared/page-fab';
import { Icon } from '../../shared/icon';
import type { StoredPrintingCodes } from '../../shared/storage/records';

type Phase = 'loading' | 'empty' | 'ready' | 'unreadable' | 'catalog-error';

/** SPEC-007 COLL-094 (g) empty state (v0.12, H-174). */
export const COLLECTION_EMPTY = {
  heading: 'Your collection is empty',
  message: "Add the cards you own and they'll show up here.",
} as const;

const PHONE = '(max-width: 39.99rem)';
const DESKTOP = '(min-width: 64rem)';
const SEARCH_DEBOUNCE_MS = 150;
const SKELETON_DELAY_MS = 200;

const EMPTY_TAGS: StoredTags = { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} };
const EMPTY_CODES: StoredPrintingCodes = { schemaVersion: 1, updatedAt: '', codes: {} };

/** `q=…&sort=…` with defaults left out (encodeURIComponent, so a space is `%20`). */
function queryString(params: { q: string | null; sort: string | null }): string {
  return Object.entries(params)
    .filter((e): e is [string, string] => e[1] !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

/** Local calendar date as `YYYY-MM-DD` (SPEC-002 LEGAL-R02 "today"). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Loaded {
  ownership: DeckOwnershipInput;
  view: CollectionView;
}

/**
 * Collection page (H-086; brief brain/04-UI/Collection.md rev 3, components
 * brain/04-UI/Collection Components.md): every owned entry as an image-only tile, search, three
 * sorts, read-only card dialog, CSV export, unresolved cards, virtual scroll by rows.
 *
 * Seams left on purpose:
 * - H-087: where an import lands and its Undo snack bar; the missing-catalog banner wording.
 * - H-176 (COLL-094, SYNC-159): "Add to your collection" opens here (floating button, empty state, `?add=1`, a dropped
 *   file); the dialog's list is shown as not saved yet until the import commit is built.
 * - H-091: the SPEC-007 parts the brief §9 defers (tags, exclude, steppers, filters, group view).
 * - H-089 / H-090: the dialog's Keywords section.
 */
@Component({
  selector: 'app-collection-page',
  imports: [
    EmptyState,
    Icon,
    PageFab,
    FileDrop,
    ImportPending,
    CollectionTile,
    CdkVirtualScrollViewport,
    CdkVirtualScrollableWindow,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    MatSelect,
    MatOption,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatIconButton,
  ],
  templateUrl: './collection-page.html',
  styleUrl: './collection-page.scss',
  host: { '(document:keydown)': 'onDocumentKey($event)' },
})
export class CollectionPage {
  private readonly stores = inject(AppStores).stores;
  private readonly cardData = inject(CardData);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly injector = inject(Injector);

  protected readonly sorts = SORTS;
  protected readonly phase = signal<Phase>('loading');
  protected readonly showSkeleton = signal(false);
  protected readonly skeleton = Array.from({ length: 12 }, (_, i) => i);
  private readonly loaded = signal<Loaded | null>(null);
  protected readonly view = computed(() => this.loaded()?.view ?? null);

  // ---- query (search is debounced; the count line and results follow `query`)
  protected readonly text = signal('');
  protected readonly query = signal('');
  protected readonly sort = signal<CollectionSort>('set');
  protected readonly sortLabel = computed(
    () => SORTS.find((s) => s.value === this.sort())?.label ?? '',
  );
  private debounce: ReturnType<typeof setTimeout> | undefined;
  private queryReady = false;

  protected readonly urlNotice = signal<string | null>(null);
  /** COLL-094 (g) empty state. */
  protected readonly emptyText = COLLECTION_EMPTY;
  /** The list the import dialog closed with (not saved yet; see ImportPending). */
  protected readonly pending = signal<ParseResult | null>(null);
  private readonly fab = viewChild(PageFab);
  private readonly emptyAdd = viewChild<ElementRef<HTMLButtonElement>>('emptyAdd');
  /** SYNC-159 (c): the `add` parameter as the page was opened; handled once. */
  private addParam: string | null = null;
  private addHandled = false;
  protected readonly banDismissed = signal(false);
  protected readonly locksDismissed = signal(false);
  protected readonly decksDismissed = signal(false);
  protected readonly decksUnreadable = DECKS_UNREADABLE;

  /** Id of the newest `load()`; results of older ones are dropped (H-086 review 2). */
  private loadSeq = 0;
  /** A storage-event reload is scheduled for the next frame (bursts coalesce into one). */
  private reloadScheduled = false;
  /** View-state saves run one after another, so the last query always wins (H-086 review 4). */
  private saveChain: Promise<void> = Promise.resolve();

  protected readonly results = computed(() => {
    const v = this.view();
    return v ? queryTiles(v.tiles, this.query(), this.sort()) : [];
  });
  protected readonly unresolved = computed(() => {
    const v = this.view();
    return v ? queryUnresolved(v.unresolved, this.query()) : [];
  });
  protected readonly countText = computed(() => {
    const v = this.view();
    if (!v) return '';
    return this.query().trim()
      ? showingLine(this.results().length, v.tiles.length)
      : countLine(v.totals.copies, v.totals.cards);
  });
  private readonly indexOf = computed(() => new Map(this.results().map((t, i) => [t.entryId, i])));

  // ---- layout
  protected readonly isPhone = toSignal(
    this.breakpoints.observe(PHONE).pipe(map((s) => s.matches)),
    {
      initialValue: false,
    },
  );
  protected readonly isDesktop = toSignal(
    this.breakpoints.observe(DESKTOP).pipe(map((s) => s.matches)),
    {
      initialValue: true,
    },
  );
  private readonly gridWidth = signal(0);
  private readonly gap = computed(() => (this.isDesktop() ? 16 : 12));
  protected readonly cols = computed(() => columnsFor(this.width(), this.tileMin(), this.gap()));
  protected readonly rowHeight = computed(() =>
    rowHeightFor(this.width(), this.cols(), this.gap()),
  );
  protected readonly rows = computed(() => chunkRows(this.results(), this.cols()));
  /**
   * Rows in the first screen load their images eagerly: any of them can be the LCP image (NG0913,
   * H-095 fix 9). Rows further down stay lazy (COLL-067).
   */
  protected readonly eagerRows = computed(() =>
    Math.ceil((globalThis.innerHeight || 1000) / Math.max(1, this.rowHeight())),
  );
  private readonly width = computed(() => this.gridWidth() || 1152);
  private readonly tileMin = signal(144);

  // ---- roving focus (brief §7)
  protected readonly activeIndex = signal(0);
  private readonly gridHost = viewChild<ElementRef<HTMLElement>>('gridHost');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  protected readonly stuck = signal(false);
  private dialogOpen = false;
  private destroyed = false;

  constructor() {
    const rem =
      Number.parseFloat(globalThis.getComputedStyle?.(document.documentElement).fontSize ?? '') ||
      16;
    this.tileMin.set(9 * rem);

    // URL ↔ query (COLL-060…063): URL wins; without params the remembered query comes back.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      if (!this.addHandled) this.addParam = p.get(IMPORT_PARAMS.collection);
      void this.applyUrl(p.get('q'), p.get('sort'));
    });
    // SYNC-159 (c) / COLL-094 (h): `?add=1` opens the dialog once the page can import (list or empty state) and is
    // then removed from the address without a history entry; a page that cannot import (unreadable store, no card
    // data) opens nothing and still removes it. Any other value is left alone. The gate is open here (CollectionGate).
    effect(() => {
      const phase = this.phase();
      if (this.addHandled) return;
      const page = phase === 'ready' || phase === 'empty' ? 'ready' : phase === 'loading' ? 'waiting' : 'cannot';
      const decision = launchDecision(this.addParam, page);
      if (decision === 'none' || decision === 'wait') return;
      this.addHandled = true;
      untracked(() => {
        this.mirrorUrl();
        if (decision === 'open') afterNextRender(() => this.openWhenFree(), { injector: this.injector });
      });
    });
    effect(() => {
      const q = this.query();
      const sort = this.sort();
      if (!this.queryReady) return;
      untracked(() => {
        this.persistQuery(q, sort);
        this.scrollListToTop();
      });
    });
    // Keep the roving tab stop on a tile that exists.
    effect(() => {
      const n = this.results().length;
      if (untracked(this.activeIndex) >= n) this.activeIndex.set(0);
    });

    effect((onCleanup) => {
      const host = this.gridHost()?.nativeElement;
      if (!host || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver((entries) => this.gridWidth.set(entries[0].contentRect.width));
      ro.observe(host);
      onCleanup(() => ro.disconnect());
    });
    effect((onCleanup) => {
      const el = this.sentinel()?.nativeElement;
      if (!el || typeof IntersectionObserver === 'undefined') return;
      const io = new IntersectionObserver(([e]) => this.stuck.set(!e.isIntersecting), {
        rootMargin: `-${(Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 4) * 16 + 1}px 0px 0px 0px`,
      });
      io.observe(el);
      onCleanup(() => io.disconnect());
    });

    // COLL-073: another tab changed the stores → refresh in place (scroll and dialog stay).
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || (e.key.startsWith(KEY_PREFIX) && e.key !== STORAGE_KEYS.viewState))
        this.scheduleReload();
    };
    addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      removeEventListener('storage', onStorage);
      clearTimeout(this.debounce);
    });

    void this.load(true);
  }

  // ---------------------------------------------------------------- data

  /**
   * One reload per frame however many keys another tab wrote (COLL-073). A hidden tab gets no
   * frames, so it rebuilds once when it is shown again.
   */
  private scheduleReload(): void {
    if (this.reloadScheduled) return;
    this.reloadScheduled = true;
    const run = () => {
      this.reloadScheduled = false;
      if (!this.destroyed) void this.load(false);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  private async load(first: boolean): Promise<void> {
    const id = ++this.loadSeq;
    const current = () => id === this.loadSeq;
    const timer = first
      ? setTimeout(() => current() && this.showSkeleton.set(true), SKELETON_DELAY_MS)
      : undefined;
    try {
      let collection;
      try {
        collection = await this.stores.collection.load();
      } catch {
        if (current()) this.phase.set('unreadable'); // COLL-071, SYNC-033: never overwritten
        return;
      }
      if (!collection || Object.keys(collection.cards).length === 0) {
        if (!current()) return;
        this.loaded.set(null);
        this.phase.set('empty');
        return;
      }
      const [tags, printingCodes, decks, locks] = await Promise.all([
        this.stores.tags.load().catch(() => null),
        this.stores.printingCodes.load().catch(() => null),
        this.stores.decks.list().catch(() => null), // flagged: Could fit in isn't shown
        this.stores.locks.load().then(
          (l): readonly DeckLock[] => l?.locks ?? [],
          () => null, // SHARE-061: unreadable → locks ignored
        ),
      ]);
      const result = await this.cardData.loadCatalog();
      if (!current()) return;
      if (result.status === 'error') {
        this.phase.set('catalog-error');
        return;
      }
      const banData = await this.cardData.loadBans();
      if (!current()) return;
      const ownership: DeckOwnershipInput = {
        collection,
        tags: tags ?? EMPTY_TAGS,
        printingCodes: printingCodes ?? EMPTY_CODES,
        catalog: result.catalog,
      };
      const view = buildCollectionView({ ownership, decks, locks, banData, today: localToday() });
      this.loaded.set({ ownership, view });
      this.phase.set('ready');
    } finally {
      clearTimeout(timer);
      if (current()) this.showSkeleton.set(false);
    }
  }

  protected reload(): void {
    location.reload();
  }

  protected async retryCatalog(): Promise<void> {
    this.phase.set('loading');
    await this.cardData.reload();
    await this.load(true);
  }

  // ---------------------------------------------------------------- query and URL

  private async applyUrl(q: string | null, sort: string | null): Promise<void> {
    if (q === null && sort === null) {
      if (!this.queryReady) {
        // COLL-063: no URL params on first load → the remembered query.
        try {
          const stored = await this.stores.viewState.load();
          const text = typeof stored?.query['text'] === 'string' ? stored.query['text'] : '';
          this.setQuery(text, sortFromStored(stored?.query['sort']));
        } catch {
          // an unreadable view state is left alone (COLL-071)
        }
      }
      this.queryReady = true;
      this.mirrorUrl();
      return;
    }
    const parsed = parseUrlQuery({ q, sort });
    this.urlNotice.set(ignoredNotice(parsed.ignored));
    this.setQuery(parsed.text, parsed.sort);
    this.queryReady = true;
    if (parsed.ignored) this.mirrorUrl();
  }

  private setQuery(text: string, sort: CollectionSort): void {
    clearTimeout(this.debounce);
    this.text.set(text);
    this.query.set(text);
    this.sort.set(sort);
  }

  /**
   * Mirrors `q` and `sort` in the address bar with `Location.replaceState`, not a router
   * navigation, so typing never runs the route view transition (H-095 fix 1) and adds no history.
   */
  private mirrorUrl(): void {
    const want = urlParams(this.query(), this.sort());
    const [path, search = ''] = this.location.path().split('?');
    // Other parameters are left alone (SYNC-159 c), except a handled one-shot `add=1`.
    const others = new URLSearchParams(search);
    others.delete('q');
    others.delete('sort');
    if (this.addHandled && others.get(IMPORT_PARAMS.collection) === '1') others.delete(IMPORT_PARAMS.collection);
    const query = [queryString(want), others.toString()].filter(Boolean).join('&');
    if (this.location.path() === (query ? `${path}?${query}` : path)) return;
    this.location.replaceState(path, query);
  }

  private persistQuery(text: string, sort: CollectionSort): void {
    this.mirrorUrl();
    this.saveChain = this.saveChain.then(() => this.saveQuery(text, sort));
  }

  private async saveQuery(text: string, sort: CollectionSort): Promise<void> {
    try {
      const stored = await this.stores.viewState.load();
      const base = stored?.query ?? { tags: { ids: [], mode: 'any' as const } };
      await this.stores.viewState.save({
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
        query: { ...base, text, sort: storedSort(sort) },
        ...(stored?.savedViews ? { savedViews: stored.savedViews } : {}),
      });
    } catch {
      // memory is best effort; never overwrite an unreadable record
    }
  }

  protected onSearchInput(value: string): void {
    this.text.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.query.set(value), SEARCH_DEBOUNCE_MS);
  }

  protected clearSearch(focus = true): void {
    this.setQuery('', this.sort());
    if (focus) this.searchInput()?.nativeElement.focus();
  }

  protected onSearchKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (this.text()) this.clearSearch();
    else this.searchInput()?.nativeElement.blur();
  }

  protected setSort(sort: CollectionSort): void {
    this.sort.set(sort);
    this.urlNotice.set(null);
  }

  protected onDocumentKey(e: KeyboardEvent): void {
    if (e.key !== '/' || this.dialogOpen || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    const input = this.searchInput()?.nativeElement;
    if (!input || input.disabled) return;
    e.preventDefault();
    input.focus();
  }

  // ---------------------------------------------------------------- grid keyboard

  protected onGridKey(e: KeyboardEvent): void {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-entry]');
    if (!target) return;
    const index = this.indexOf().get(target.dataset['entry'] ?? '') ?? this.activeIndex();
    const next = gridMove(e.key, e.ctrlKey || e.metaKey, index, this.results().length, this.cols());
    if (next === null) return;
    e.preventDefault();
    this.activeIndex.set(next);
    this.focusTile(this.results()[next].entryId);
  }

  protected onGridFocus(e: FocusEvent): void {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-entry]')?.dataset['entry'];
    const i = id ? this.indexOf().get(id) : undefined;
    if (i !== undefined) this.activeIndex.set(i);
  }

  /**
   * COLL-093 (d): a search or sort change shows the result from the top of the list. Only scrolls back when the
   * list's top has gone under the sticky header and toolbar; the page above the list is left as it is.
   */
  private scrollListToTop(): void {
    const host = this.gridHost()?.nativeElement;
    if (!host) return;
    const header =
      host.ownerDocument.querySelector('.site-header')?.getBoundingClientRect().height ?? 64;
    const toolbar =
      host.ownerDocument.querySelector('.toolbar')?.getBoundingClientRect().height ?? 56;
    const top = Math.max(0, host.getBoundingClientRect().top + scrollY - header - toolbar);
    if (scrollY > top) scrollTo({ top });
  }

  /** Scrolls the tile's row into view (it may not be rendered yet) and focuses its button. */
  private focusTile(entryId: string): void {
    const host = this.gridHost()?.nativeElement;
    const index = this.indexOf().get(entryId);
    if (!host || index === undefined) return;
    this.activeIndex.set(index);
    const h = this.rowHeight();
    const top = host.getBoundingClientRect().top + scrollY + Math.floor(index / this.cols()) * h;
    const header =
      host.ownerDocument.querySelector('.site-header')?.getBoundingClientRect().height ?? 64;
    const toolbar =
      host.ownerDocument.querySelector('.toolbar')?.getBoundingClientRect().height ?? 56;
    const visibleTop = scrollY + header + toolbar;
    if (top < visibleTop) scrollTo({ top: top - header - toolbar });
    else if (top + h > scrollY + innerHeight) scrollTo({ top: top + h - innerHeight });
    let tries = 0;
    const attempt = () => {
      const el = host.querySelector<HTMLElement>(`[data-entry="${CSS.escape(entryId)}"]`);
      if (el) el.focus({ preventScroll: true });
      else if (tries++ < 10) requestAnimationFrame(attempt);
    };
    attempt();
  }

  // ---------------------------------------------------------------- dialog

  protected openCard(entryId: string): void {
    const phone = this.isPhone();
    const data: CardDialogData = {
      entryId,
      detail: (id) => {
        const v = this.view();
        return v ? cardDetail(v, id) : null;
      },
      neighbour: (id, step) => {
        const i = this.indexOf().get(id);
        return i === undefined ? null : (this.results()[i + step]?.entryId ?? null);
      },
      stepping: this.isDesktop(),
    };
    const ref = this.dialog.open<CardDialog, CardDialogData, CardDialogResult>(CardDialog, {
      data,
      ariaLabelledBy: CARD_DIALOG_TITLE_ID,
      autoFocus: '.close-button',
      restoreFocus: false,
      panelClass: 'card-dialog-panel',
      ...(phone
        ? { width: '100vw', maxWidth: '100vw', height: '100svh', maxHeight: '100svh' }
        : {
            width: this.isDesktop()
              ? 'min(56rem, calc(100vw - 2 * var(--content-gutter)))'
              : 'min(40rem, calc(100vw - 2 * var(--content-gutter)))',
            maxWidth: '100vw',
            maxHeight: 'min(90svh, 52rem)',
          }),
    });
    this.dialogOpen = true;
    ref.afterClosed().subscribe((result) => {
      this.dialogOpen = false;
      const id = result?.entryId ?? ref.componentInstance?.entryId() ?? entryId;
      if (result?.gone) {
        this.snackBar.open('This card is no longer in your collection.', undefined, {
          duration: 6000,
        });
        const fallback = this.results()[Math.min(this.activeIndex(), this.results().length - 1)];
        if (fallback) this.focusTile(fallback.entryId);
        return;
      }
      this.focusTile(id);
    });
  }

  // ---------------------------------------------------------------- export (IMP-055)

  /** `?add=1`: waits for a dialog already open (e.g. the SYNC-154 username prompt) to close, so they never stack. */
  private openWhenFree(): void {
    if (this.destroyed) return;
    if (this.dialog.openDialogs.length === 0) return this.openImport();
    this.dialog.afterAllClosed.pipe(take(1)).subscribe(() => {
      if (!this.destroyed) this.openImport();
    });
  }

  /**
   * SPEC-003 IMP-060 / COLL-094 (g): the shared dialog titled "Add to your collection", opened on this page; focus
   * returns to the floating button, else the opener, else the empty state's button, else #main, chosen when the dialog
   * closes (H-189: a `?add=1` launch may open before the floating button exists).
   */
  protected openImport(file?: File): void {
    const opener = dialogOpener(document);
    const ref = this.dialog.open<ImportDialog, ImportDialogData, ParseResult>(ImportDialog, {
      data: file ? { kind: 'collection', file } : { kind: 'collection' },
      width: '40rem',
      maxWidth: 'calc(100vw - 2rem)',
      autoFocus: 'textarea',
      restoreFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.pending.set(result);
      if (this.destroyed) return;
      afterNextRender(
        () =>
          refocusAfterDialog(
            importFocusTarget({ fab: this.fab()?.element(), opener, emptyButton: this.emptyAdd()?.nativeElement }),
          ),
        { injector: this.injector },
      );
    });
  }

  protected exportCsv(): void {
    const loaded = this.loaded();
    if (!loaded) return;
    const out = exportCollectionCsv(loaded.ownership);
    const blob = new Blob([out.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rift-builder-collection-${localToday()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const message = [`Exported ${countLine(out.copies, out.cards)}.`, ...out.notices].join(' ');
    this.snackBar.open(message, undefined, { duration: 6000 });
  }
}
