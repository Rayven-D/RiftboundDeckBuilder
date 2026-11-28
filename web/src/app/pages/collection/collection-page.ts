import { injectNotices } from '../../shared/notice/notice-snack-bar';
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
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatOption, MatSelect } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { map, merge, take } from 'rxjs';
import { GuestBanner } from './guest-banner';
import { CardData } from '../../core/cards/card-data';
import type { DeckOwnershipInput, NameLock, StoredTags } from '../../core/decks';
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
import { PHONE as SHEET_PHONE, cardDialogConfig } from '../../shared/card-sheet/card-sheet';
import { ListItems, keepListScroll, restoreListScroll } from '../../shared/list-scroll';
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
import { ImportDialog, ImportDialogData, ImportDialogResult } from '../../shared/import/import-dialog';
import { IMPORT_PARAMS, dialogOpener, importFocusTarget, launchDecision } from '../../shared/import/import-launch';
import { CollectionImport } from '../../core/import/collection-import';
import { PageFab } from '../../shared/page-fab';
import { Icon } from '../../shared/icon';
import type { StoredPrintingCodes } from '../../shared/storage/records';
import { NOTICE_POSITION, noticeOptions } from '../../shared/sync/notice';
import { TEST_TEXT, TestSetId, isTestCollection } from '../../shared/collection/test-data';
import { TEST_DATA_ENABLED } from '../../core/test-data/test-data-flag';
import { GuestTestData } from '../../core/test-data/guest-test-data';
import { loadTestData, removeTestData } from '../../core/test-data/test-data-ops';
import { TestLoadDialog, TestLoadDialogData, TestLoadOutcome, confirmTestData } from './test-data-dialogs';

type Phase = 'loading' | 'empty' | 'ready' | 'unreadable' | 'catalog-error';

/** SPEC-007 COLL-094 (g) empty state (v0.12, H-174). */
export const COLLECTION_EMPTY = {
  heading: 'Your collection is empty',
  message: "Add the cards you own and they'll show up here.",
} as const;

/** The list's tiles for the COLL-093 (e) Back restore, keyed by entry id (virtual rows: only rendered ones match). */
const COLLECTION_TILES: ListItems = { selector: '[data-entry]', key: (el) => el.getAttribute('data-entry') };
const PHONE = '(max-width: 39.99rem)';
const DESKTOP = '(min-width: 64rem)';
const SEARCH_DEBOUNCE_MS = 150;
const SKELETON_DELAY_MS = 200;

/** Not in SPEC-013: a local store write failed during Remove (storage full or a newer-schema area). */
const MESSAGE_REMOVE_FAILED = "Couldn't remove test data. Reload the page and try again.";

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
 * "Add to your collection" opens here (COLL-094, SYNC-159: floating button, empty state, `?add=1`, a dropped file);
 * its commit and Undo are `CollectionImport` (H-158, SPEC-003 IMP-072…075): the page stays put and refreshes in place
 * (COLL-091).
 *
 * Seams left on purpose:
 * - H-091: the SPEC-007 parts the brief §9 defers (tags, exclude, steppers, filters, group view).
 * - H-089 / H-090: the dialog's Keywords section.
 */
@Component({
  selector: 'app-collection-page',
  imports: [
    GuestBanner,
    EmptyState,
    Icon,
    PageFab,
    FileDrop,
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
    MatButton,
  ],
  templateUrl: './collection-page.html',
  styleUrl: './collection-page.scss',
  host: { '(document:keydown)': 'onDocumentKey($event)' },
})
export class CollectionPage {
  private readonly stores = inject(AppStores).stores;
  private readonly cardData = inject(CardData);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = injectNotices();
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly injector = inject(Injector);
  private readonly importer = inject(CollectionImport);

  protected readonly sorts = SORTS;
  protected readonly phase = signal<Phase>('loading');
  /** COLL-093 (e): a Back navigation to this page restores the list's scroll position once the rows are shown. */
  private restoreScroll = keepListScroll('/collection', () => this.phase() === 'ready', COLLECTION_TILES);
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
  private readonly fab = viewChild(PageFab);
  private readonly emptyAdd = viewChild<ElementRef<HTMLButtonElement>>('emptyAdd');
  /** SYNC-159 (c): the `add` parameter as the page was opened; handled once. */
  private addParam: string | null = null;
  private addHandled = false;
  protected readonly banDismissed = signal(false);
  protected readonly locksDismissed = signal(false);
  protected readonly decksDismissed = signal(false);
  protected readonly decksUnreadable = DECKS_UNREADABLE;

  // ---- SPEC-013 test data (H-205)
  /** TEST-001 / TEST-040: the build flag; false hides Load and Change set, never the banner or Remove (TEST-041). */
  protected readonly testDataEnabled = inject(TEST_DATA_ENABLED);
  /** TEST-030: the stored collection has cards and the `test-data-` marker. */
  protected readonly testData = signal(false);
  /** H-679: signed-out guest test data (memory only): the guest banner (TEST-063), no imports (TEST-062). */
  protected readonly guest = inject(AppStores).guest;
  private readonly guestData = inject(GuestTestData);
  protected readonly testText = TEST_TEXT;
  private readonly emptyLoad = viewChild<ElementRef<HTMLButtonElement>>('emptyLoad');

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
      const page = this.guest() ? 'cannot' : phase === 'ready' || phase === 'empty' ? 'ready' : phase === 'loading' ? 'waiting' : 'cannot';
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
        // COLL-093 (d), but never while a COLL-093 (e) Back restore is still waiting for the rows.
        if (this.restoreScroll === null) this.scrollListToTop();
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
    // COLL-091: a commit or an Undo written in this tab (from any screen) refreshes the list in place.
    this.importer.written.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.scheduleReload());
    // H-679 TEST-070: the catalog source changed (a first sync or pull brought test data) or a guest Change set
    // wrote: read again, so a "Card data couldn't load" or an empty state shown before it never needs a reload.
    merge(this.cardData.sourceChanged, this.guestData.changed)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.scheduleReload());
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
      if (current()) this.testData.set(isTestCollection(collection));
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
          (l): readonly NameLock[] => l?.locks ?? [],
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
      if (this.restoreScroll !== null) {
        const y = this.restoreScroll;
        this.restoreScroll = null;
        afterNextRender(() => restoreListScroll(y, COLLECTION_TILES), { injector: this.injector });
      }
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
    // H-245 Accept 6 (COLL-094 e): keep the row clear of the floating button (and the phone tab bar). A scripted
    // scroll ignores scroll-padding, so read the page's bottom padding (the FAB clearance; 0 without a button).
    const bottomPad = parseFloat(getComputedStyle(host.ownerDocument.documentElement).scrollPaddingBottom) || 0;
    const visibleBottom = scrollY + innerHeight - bottomPad;
    if (top < visibleTop) scrollTo({ top: top - header - toolbar });
    else if (top + h > visibleBottom) scrollTo({ top: top + h - innerHeight + bottomPad });
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
      restoreFocus: false,
      // H-699 (Brief H-698): phones get the bottom sheet; larger screens the centred dialog, sized as before.
      ...cardDialogConfig(this.breakpoints.isMatched(SHEET_PHONE), {
        width: this.isDesktop()
          ? 'min(56rem, calc(100vw - 2 * var(--content-gutter)))'
          : 'min(40rem, calc(100vw - 2 * var(--content-gutter)))',
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
          ...NOTICE_POSITION,
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
    if (this.guest()) return; // H-679: imports stay sign-in only
    if (this.testData()) {
      void this.blockedImport(file);
      return;
    }
    const opener = dialogOpener(document);
    const committer = this.importer;
    const ref = this.dialog.open<ImportDialog, ImportDialogData, ImportDialogResult>(ImportDialog, {
      data: file ? { kind: 'collection', file, committer } : { kind: 'collection', committer },
      width: '40rem',
      maxWidth: 'calc(100vw - 2rem)',
      autoFocus: 'textarea',
      restoreFocus: false,
    });
    ref.afterClosed().subscribe(async (result) => {
      if (this.destroyed) return;
      // IMP-072: a written commit stays here; the list (or, after the first import, the grid that replaced the empty
      // state) is read again before focus goes back to the floating button.
      if (result === 'committed') await this.load(false);
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

  // ---------------------------------------------------------------- test data (SPEC-013)

  /**
   * TEST-002 / TEST-010 Change set: the TEST-003 dialog. With test data present a choice asks the TEST-022
   * confirmation (inside the dialog). Focus goes back to the opener, or to #main when it is gone (the list replaced
   * the empty state).
   */
  protected openTestLoad(): void {
    if (!this.testDataEnabled) return;
    const opener = dialogOpener(document);
    const data: TestLoadDialogData = {
      replacing: this.testData(),
      load: (set) => this.runTestLoad(set),
    };
    const ref = this.dialog.open<TestLoadDialog, TestLoadDialogData, boolean>(TestLoadDialog, {
      data,
      width: '32rem',
      maxWidth: 'calc(100vw - 2rem)',
      autoFocus: 'first-tabbable',
      restoreFocus: false,
    });
    this.dialogOpen = true;
    ref.afterClosed().subscribe((ok) => {
      this.dialogOpen = false;
      if (this.destroyed) return;
      if (ok) this.snackBar.open(TEST_TEXT.loaded, 'OK', noticeOptions('success'));
      afterNextRender(() => refocusAfterDialog(opener ?? undefined), { injector: this.injector });
    });
  }

  private async runTestLoad(set: TestSetId): Promise<TestLoadOutcome> {
    const result = await loadTestData(this.stores, set, () => Date.now());
    await this.load(false);
    return result;
  }

  /** TEST-050…052: confirm, then remove only what the tool wrote; the empty state (with Load) comes back. */
  protected async confirmRemoveTest(): Promise<void> {
    const ok = await confirmTestData(this.dialog, {
      title: TEST_TEXT.removeTitle,
      text: TEST_TEXT.removeText,
      confirm: 'Remove',
      danger: true,
    });
    if (ok) await this.runTestRemove();
    else afterNextRender(() => refocusAfterDialog(undefined), { injector: this.injector });
  }

  private async runTestRemove(): Promise<boolean> {
    try {
      await removeTestData(this.stores, () => Date.now());
    } catch {
      this.snackBar.open(MESSAGE_REMOVE_FAILED, 'OK', noticeOptions('error'));
      return false;
    }
    await this.load(false);
    if (this.destroyed) return true;
    this.snackBar.open(TEST_TEXT.removed, 'OK', noticeOptions('success'));
    afterNextRender(
      () => refocusAfterDialog(this.emptyLoad()?.nativeElement ?? this.emptyAdd()?.nativeElement),
      { injector: this.injector },
    );
    return true;
  }

  /** TEST-032: "Add to your collection" while test data is present asks to remove it first, then opens the import. */
  private async blockedImport(file?: File): Promise<void> {
    const opener = dialogOpener(document) ?? this.fab()?.element();
    const ok = await confirmTestData(this.dialog, { text: TEST_TEXT.addBlocked, confirm: TEST_TEXT.removeButton });
    if (!ok) {
      if (!this.destroyed) afterNextRender(() => refocusAfterDialog(opener ?? undefined), { injector: this.injector });
      return;
    }
    if ((await this.runTestRemove()) && !this.destroyed && !this.testData()) this.openImport(file);
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
    this.snackBar.open(message, undefined, { duration: 6000, ...NOTICE_POSITION });
  }
}
