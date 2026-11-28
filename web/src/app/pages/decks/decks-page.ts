import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT, Location } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  linkedSignal,
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, merge, take } from 'rxjs';
import { CardData } from '../../core/cards/card-data';
import type { FormatName, StoredPrintingCodes, StoredTags, UserDeck } from '../../core/decks';
import { CollectionImport } from '../../core/import/collection-import';
import { DeckImport } from '../../core/import/deck-import';
import { AppStores } from '../../core/storage/app-stores';
import { GuestBanner } from '../collection/guest-banner';
import { GuestLoad } from '../collection/guest-load';
import { GuestTestData } from '../../core/test-data/guest-test-data';
import { KEY_PREFIX } from '../../core/storage/kv-backend';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { SignInGate } from '../../core/sync/sign-in-gate';
import { SignInPanel } from '../../core/sync/sign-in-panel';
import { refocusAfterDialog } from '../../core/sync/sync.service';
import { ignoredNotice } from '../../shared/collection/collection-view';
import { ListItems, keepListScroll, restoreListScroll } from '../../shared/list-scroll';
import {
  DECK_SORTS,
  DEFAULT_DECK_QUERY,
  DeckFilterKey,
  DeckListModel,
  DeckListQuery,
  DeckSort,
  LOCK_OPTIONS,
  LockOption,
  OWN_OPTIONS,
  OwnOption,
  SOURCE_OPTIONS,
  activeFilters,
  buildDeckList,
  clearFilters,
  deckCountLine,
  deckQueryParams,
  hiddenLockedCount,
  isFiltered,
  legalityOptions,
  menuFilterCount,
  ownershipCounts,
  parseDeckQuery,
  queryDecks,
} from '../../shared/deck/deck-list';
import { LOCK_TEXT } from '../../shared/deck/deck-locks';
import { DeckListFocus } from '../../shared/deck/deck-list-focus';
import { DeckLocks } from '../../shared/deck/deck-locks.service';
import { OWNERSHIP_OPTION_ICON, OWNERSHIP_OPTION_LABEL } from '../../shared/deck/deck-status-chip';
import { DeckTile } from '../../shared/deck/deck-tile';
import { EmptyState } from '../../shared/empty-state';
import { Icon } from '../../shared/icon';
import { FileDrop } from '../../shared/import/file-drop';
import { ImportDialog, ImportDialogData, ImportDialogResult } from '../../shared/import/import-dialog';
import { IMPORT_PARAMS, dialogOpener, importFocusTarget, launchDecision } from '../../shared/import/import-launch';
import { PageFab } from '../../shared/page-fab';
import { DeckFiltersDialog, DeckFiltersDialogData } from './deck-filters-dialog';
import { DIALOG_MOTION } from '../../shared/motion';

/** SPEC-005 OWN-008 (v0.7) empty state. */
export const DECKS_EMPTY = {
  heading: 'No decks yet',
  message: 'Import a deck list to see which of its cards you own.',
} as const;

/** OWN-105 and OWN-062/063/015 texts, word for word. */
export const DECKS_TEXT = {
  lede: 'Decks you want to build. Cards you own are shown in full color.',
  noMatch: 'No decks match these filters',
  clearFilters: 'Clear filters',
  lockedHint: 'Locked decks are under Locked.',
  showLocked: 'Show locked decks',
  ownershipUnavailable: 'Ownership unavailable: your collection could not be read.',
  cardDataMissing: 'Card data not loaded',
  banUnknown: "The ban list couldn't load, so ban status is unknown.",
  ownershipDisabled: 'Not available while ownership is unavailable',
  loading: 'Loading your decks…',
} as const;

/**
 * `standard`'s `FormatDef.name` (LEGAL-R08). `web/` has no formats file or legality engine yet (SPEC-002 is not
 * built in the browser), so every deck reads "Not fully checked" (OWN-004: no `LegalityResult`); the name labels the
 * Legality filter options.
 */
const STANDARD: FormatName = { id: 'standard', name: 'Standard' };

const PHONE = '(max-width: 40rem)';
const SEARCH_DEBOUNCE_MS = 150;
const SKELETON_DELAY_MS = 200;
const EMPTY_TAGS: StoredTags = { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} };
const EMPTY_CODES: StoredPrintingCodes = { schemaVersion: 1, updatedAt: '', codes: {} };

/** Local calendar date as `YYYY-MM-DD` (SPEC-002 LEGAL-R02 "today"). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Phase = 'loading' | 'empty' | 'ready';

/** The list's items for the COLL-093 (e) Back restore: each tile's link, keyed by its href (one per deck). */
const DECK_TILES: ListItems = { selector: 'a.deck-tile', key: (el) => el.getAttribute('href') };

/**
 * `/decks` (SYNC-009 gated): the Decks list (H-060; SPEC-005 OWN-001…008, OWN-084, OWN-100…105, SPEC-008
 * SHARE-050…053, SHARE-061; brief [[Decks]] §3–§5, §10 L1…L13; [[Decks Components]] §1–§4).
 *
 * Data: reads the decks (readable and newer-schema ones, shown read-only, DECK-091), the collection, tags, printing
 * codes and locks, the catalog and ban data, then `buildDeckList` computes one `SharedPool` and every tile before the
 * first render (OWN-073, OWN-084). It reads again on every store change: storage events from other tabs (OWN-071,
 * SHARE-064), a deck saved here (DECK-098), a lock change (`DeckLocks.changed`) and a collection commit
 * (`CollectionImport.written`). Nothing it computes is stored (OWN-026).
 *
 * "Import deck" (OWN-094, DECK-001, SYNC-159) as built in H-176 / H-253: the floating button with the list, the empty
 * state's button, `?import=1`, a dropped file; a saved deck stays here and the list updates in place.
 */
@Component({
  selector: 'app-decks-page',
  imports: [
    EmptyState,
    RouterLink,
    SignInPanel,
    GuestLoad,
    GuestBanner,
    PageFab,
    FileDrop,
    DeckTile,
    Icon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatSelect,
    MatOption,
  ],
  templateUrl: './decks-page.html',
  styleUrl: './decks-page.scss',
  host: { '(document:keydown)': 'onDocumentKey($event)' },
})
export class DecksPage {
  protected readonly gate = inject(SignInGate);
  private readonly stores = inject(AppStores).stores;
  /** H-679: signed-out guest test data (memory only): the banner shows and imports stay sign-in only. */
  protected readonly guest = inject(AppStores).guest;
  private readonly cardData = inject(CardData);
  private readonly locks = inject(DeckLocks);
  private readonly listFocus = inject(DeckListFocus);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly deckImport = inject(DeckImport);
  private readonly collectionImport = inject(CollectionImport);
  private readonly fab = viewChild(PageFab);
  private readonly emptyImport = viewChild<ElementRef<HTMLButtonElement>>('emptyImport');
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');
  private readonly filtersButton = viewChild<ElementRef<HTMLButtonElement>>('filtersButton');
  private readonly gridHost = viewChild<ElementRef<HTMLElement>>('grid');
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  /** A dialog can close after the page is gone (navigation, test teardown): then nothing is focused. */
  private destroyed = false;

  protected readonly empty = DECKS_EMPTY;
  protected readonly text = DECKS_TEXT;
  protected readonly lockText = LOCK_TEXT;
  protected readonly sorts = DECK_SORTS;
  protected readonly ownOptions = OWN_OPTIONS;
  protected readonly ownLabel = OWNERSHIP_OPTION_LABEL;
  protected readonly ownIcon = OWNERSHIP_OPTION_ICON;
  protected readonly lockOptions = LOCK_OPTIONS;
  protected readonly legalityOptions = legalityOptions(STANDARD.name);
  protected readonly sourceOptions = SOURCE_OPTIONS;
  protected readonly skeleton = Array.from({ length: 6 }, (_, i) => i);

  protected readonly phase = signal<Phase>('loading');
  protected readonly showSkeleton = signal(false);
  /** The page can import: the gate is open and the decks are read. */
  protected readonly ready = signal(false);
  protected readonly model = signal<DeckListModel | null>(null);

  // ---- query (search is debounced; the list follows `query`)
  protected readonly searchText = signal('');
  protected readonly query = signal<DeckListQuery>(DEFAULT_DECK_QUERY);
  protected readonly urlNotice = signal<string | null>(null);
  protected readonly banDismissed = signal(false);
  private debounce: ReturnType<typeof setTimeout> | undefined;
  private queryReady = false;
  private dialogOpen = false;

  protected readonly isPhone = toSignal(inject(BreakpointObserver).observe(PHONE).pipe(map((s) => s.matches)), {
    initialValue: false,
  });
  protected readonly stuck = signal(false);

  protected readonly results = computed(() => {
    const m = this.model();
    return m ? queryDecks(m.entries, this.query()) : [];
  });
  protected readonly total = computed(() => this.model()?.entries.length ?? 0);
  protected readonly filtered = computed(() => isFiltered(this.query()));
  protected readonly countText = computed(() => deckCountLine(this.results().length, this.total(), this.filtered()));
  protected readonly counts = computed(() => {
    const m = this.model();
    return m ? ownershipCounts(m.entries, this.query()) : { all: 0, ready: 0, partial: 0, none: 0 };
  });
  protected readonly hiddenLocked = computed(() => {
    const m = this.model();
    return m ? hiddenLockedCount(m.entries, this.query()) : 0;
  });
  protected readonly chips = computed(() => activeFilters(this.query(), STANDARD.name));
  /** Brief H-716 S5 (2): what the filter row shows; the last chips stay while the row closes (it is inert then). */
  protected readonly shownChips = linkedSignal<ReturnType<typeof activeFilters>, ReturnType<typeof activeFilters>>({
    source: this.chips,
    computation: (c, prev) => (c.length > 0 ? c : (prev?.value ?? c)),
  });
  protected readonly menuCount = computed(() => menuFilterCount(this.query()));
  /** Phone Filters badge: every filter in the dialog (Ownership, Lock, Legality, Source). */
  protected readonly phoneFilterCount = computed(() => this.chips().length);
  /** OWN-065 (d) / OWN-105 (f): ownership chips are disabled while ownership is unavailable. */
  protected readonly ownershipDisabled = computed(() => {
    const m = this.model();
    return !!m && (m.collectionUnreadable || m.catalogMissing);
  });
  protected readonly lockDisabled = computed(() => this.model()?.locksUnreadable ?? false);
  protected readonly sortLabel = computed(() => DECK_SORTS.find((s) => s.value === this.query().sort)?.label ?? '');
  protected readonly lockLabel = computed(
    () => LOCK_OPTIONS.find((o) => o.value === this.query().lock)?.label ?? 'All decks',
  );

  private readonly importParam = toSignal(
    this.route.queryParamMap.pipe(map((q) => q.get(IMPORT_PARAMS.deck))),
    { initialValue: null },
  );

  /** Id of the newest `load()`; results of older ones are dropped. */
  private loadSeq = 0;
  private reloadScheduled = false;
  private loadedToday = localToday();
  /** COLL-093 (e) / OWN-084: a Back navigation to this list restores the scroll position once the tiles are shown. */
  private restoreScroll = keepListScroll('/decks', () => this.phase() === 'ready', DECK_TILES);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.debounce);
    });

    // URL ↔ query (OWN-006, OWN-105 (e)): the URL wins; unknown values are ignored with a notice.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      const parsed = parseDeckQuery({
        q: p.get('q'),
        own: p.get('own'),
        lock: p.get('lock'),
        legality: p.get('legality'),
        source: p.get('source'),
        sort: p.get('sort'),
      });
      this.urlNotice.set(ignoredNotice(parsed.ignored));
      this.setQuery(parsed.query, false);
      this.queryReady = true;
      if (parsed.ignored) this.mirrorUrl();
    });

    // DECK-098 / OWN-070: a deck saved here, a lock change, or a collection commit in this tab → read again.
    // H-679 TEST-070: the catalog source changed (a pull brought test data) or a guest Change set wrote: read again.
    merge(this.deckImport.saved, this.locks.changed, this.collectionImport.written, this.cardData.sourceChanged, inject(GuestTestData).changed)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.scheduleReload());
    // OWN-071 / SHARE-064: another tab changed the stores → recompute in place (scroll and focus stay).
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || (e.key.startsWith(KEY_PREFIX) && e.key !== STORAGE_KEYS.viewState)) this.scheduleReload();
    };
    // OWN-072 (SHOULD): a new day updates ban status and legality on the next visibility change.
    const onVisible = () => {
      if (this.doc.visibilityState === 'visible' && localToday() !== this.loadedToday) this.scheduleReload();
    };
    addEventListener('storage', onStorage);
    this.doc.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() => {
      removeEventListener('storage', onStorage);
      this.doc.removeEventListener('visibilitychange', onVisible);
    });

    // Read only while the gate is open, so the cache of a signed-out device stays hidden (SYNC-009, OWN-066).
    effect(() => {
      if (!this.gate.content()) {
        this.ready.set(false);
        this.model.set(null);
        this.phase.set('loading');
        return;
      }
      untracked(() => void this.load(true));
    });
    // SYNC-159 (c): `?import=1` opens the dialog once the page is ready, then leaves the address (no history entry).
    effect(() => {
      const decision = launchDecision(this.importParam(), this.guest() ? 'cannot' : this.ready() ? 'ready' : 'waiting');
      if (decision === 'none' || decision === 'wait') return;
      untracked(() => {
        this.dropImportParam();
        if (decision === 'open') this.openWhenFree();
      });
    });
    // The sticky toolbar's border shows once it is stuck under the header.
    effect((onCleanup) => {
      const el = this.sentinel()?.nativeElement;
      if (!el || typeof IntersectionObserver === 'undefined') return;
      const io = new IntersectionObserver(([e]) => this.stuck.set(!e.isIntersecting), {
        rootMargin: `-${(Number.parseFloat(getComputedStyle(this.doc.documentElement).getPropertyValue('--header-height')) || 4) * 16 + 1}px 0px 0px 0px`,
      });
      io.observe(el);
      onCleanup(() => io.disconnect());
    });
  }

  // ---------------------------------------------------------------- data

  /** One reload per frame however many keys changed (bursts from another tab coalesce). */
  private scheduleReload(): void {
    if (this.reloadScheduled || !this.gate.content()) return;
    this.reloadScheduled = true;
    const run = () => {
      this.reloadScheduled = false;
      if (!this.destroyed && this.gate.content()) void this.load(false);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  private async load(first: boolean): Promise<void> {
    const id = ++this.loadSeq;
    const current = () => id === this.loadSeq && !this.destroyed;
    const timer = first ? setTimeout(() => current() && this.showSkeleton.set(true), SKELETON_DELAY_MS) : undefined;
    try {
      let decks: UserDeck[];
      try {
        // DECK-091 / OWN-064: newer-schema decks are listed too, read-only, with ownership.
        decks = [...(await this.stores.decks.list()), ...(await this.stores.decks.newerDecks())];
      } catch {
        decks = []; // the empty state's Import deck still works
      }
      if (!current()) return;
      if (decks.length === 0) {
        this.model.set(null);
        this.phase.set('empty');
        this.ready.set(true);
        return;
      }
      const ok = <T>(p: Promise<T>) => p.then((v) => ({ ok: true as const, v }), () => ({ ok: false as const }));
      const [collection, tags, printingCodes, locks] = await Promise.all([
        ok(this.stores.collection.load()),
        ok(this.stores.tags.load()),
        this.stores.printingCodes.load().catch(() => null),
        this.locks.load(),
      ]);
      const catalog = await this.cardData.loadCatalog();
      const banData = await this.cardData.loadBans();
      if (!current()) return;
      const today = localToday();
      this.loadedToday = today;
      // OWN-062: an unreadable collection or tags → ownership unavailable; a missing record is an empty one.
      const readable = collection.ok && tags.ok;
      const model = buildDeckList({
        decks,
        locks,
        collection: readable
          ? {
              collection: collection.v ?? { schemaVersion: 1, updatedAt: '', catalogVersion: '', cards: {} },
              tags: tags.v ?? EMPTY_TAGS,
              printingCodes: printingCodes ?? EMPTY_CODES,
            }
          : null,
        catalog: catalog.status === 'ok' ? catalog.catalog : null,
        banData,
        today,
        format: STANDARD,
      });
      this.model.set(model);
      this.phase.set('ready');
      this.ready.set(true);
      if (this.restoreScroll !== null) {
        const y = this.restoreScroll;
        this.restoreScroll = null;
        afterNextRender(() => restoreListScroll(y, DECK_TILES, this.doc), { injector: this.injector });
      }
    } finally {
      clearTimeout(timer);
      if (current()) this.showSkeleton.set(false);
      // H-462: Deck detail's Delete / Undo asked for focus on a tile (or the empty state's Import deck).
      if (current() && this.phase() !== 'loading') afterNextRender(() => this.listFocus.apply(this.doc), { injector: this.injector });
    }
  }

  /** OWN-063: Card data not loaded → Try again reloads the catalog. */
  protected async retryCatalog(): Promise<void> {
    await this.cardData.reload();
    await this.load(false);
  }

  // ---------------------------------------------------------------- query and URL

  private setQuery(q: DeckListQuery, mirror = true): void {
    clearTimeout(this.debounce);
    this.searchText.set(q.text);
    const before = this.query();
    this.query.set(q);
    if (!mirror) return;
    this.mirrorUrl();
    if (JSON.stringify(before) !== JSON.stringify(q)) this.scrollListToTop();
  }

  protected patchQuery(patch: Partial<DeckListQuery>): void {
    this.urlNotice.set(null);
    this.setQuery({ ...this.query(), ...patch });
  }

  /**
   * Mirrors the query in the address bar with `Location.replaceState` (no router navigation, no history entry, so
   * typing never runs the route transition); other parameters (`import`) are left alone.
   */
  private mirrorUrl(): void {
    if (!this.queryReady) return;
    const want = deckQueryParams(this.query());
    const [path, search = ''] = this.location.path().split('?');
    const params = new URLSearchParams(search);
    for (const [k, v] of Object.entries(want)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    const query = params.toString().replace(/\+/g, '%20');
    if (this.location.path() === (query ? `${path}?${query}` : path)) return;
    this.location.replaceState(path, query);
  }

  protected onSearchInput(value: string): void {
    this.searchText.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.patchQuery({ text: value }), SEARCH_DEBOUNCE_MS);
  }

  protected clearSearch(focus = true): void {
    this.patchQuery({ text: '' });
    if (focus) this.searchInput()?.nativeElement.focus();
  }

  protected onSearchKey(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (this.searchText()) this.clearSearch();
    else this.searchInput()?.nativeElement.blur();
  }

  protected setOwn(own: OwnOption | null): void {
    if (this.ownershipDisabled()) return;
    this.patchQuery({ own });
  }

  /** The ownership chips are one radio group: arrows move and select (one Tab stop). */
  protected onOwnKey(e: KeyboardEvent): void {
    const order: (OwnOption | null)[] = [null, ...OWN_OPTIONS];
    const i = order.indexOf(this.query().own);
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % order.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + order.length) % order.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    if (next === null || this.ownershipDisabled()) return;
    e.preventDefault();
    this.setOwn(order[next]);
    const group = (e.currentTarget as HTMLElement | null)?.closest('.own-chips') ?? null;
    afterNextRender(() => group?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus(), {
      injector: this.injector,
    });
  }

  protected setLock(lock: LockOption | 'all'): void {
    this.patchQuery({ lock: lock === 'all' ? null : lock });
  }

  protected setSort(sort: DeckSort): void {
    this.patchQuery({ sort });
  }

  /** OWN-105 (c): remove one filter chip; focus moves to the next chip, or the search field. */
  protected removeFilter(key: DeckFilterKey, index: number): void {
    this.patchQuery({ [key]: null } as Partial<DeckListQuery>);
    afterNextRender(
      () => {
        const chips = this.doc.querySelectorAll<HTMLElement>('.active-filters-reveal.open .filter-chip');
        (chips[Math.min(index, chips.length - 1)] ?? this.searchInput()?.nativeElement)?.focus();
      },
      { injector: this.injector },
    );
  }

  protected clearAll(): void {
    this.setQuery(clearFilters(this.query()));
    this.urlNotice.set(null);
    afterNextRender(() => this.searchInput()?.nativeElement.focus(), { injector: this.injector });
  }

  /**
   * OWN-105 (d) "Show locked decks" (under the count line, and in the no-match state, H-468 (9)): `lock=locked`, `own`
   * cleared. The button goes away with the hint, so focus moves to the search field, as after Clear filters.
   */
  protected showLocked(): void {
    this.patchQuery({ lock: 'locked', own: null });
    afterNextRender(() => this.searchInput()?.nativeElement.focus(), { injector: this.injector });
  }

  /** OWN-105 (a) phone: the full-screen Filters dialog; Show applies and focus returns to the Filters button. */
  protected openFilters(): void {
    const m = this.model();
    const data: DeckFiltersDialogData = {
      query: this.query(),
      formatName: STANDARD.name,
      count: (q) => (m ? queryDecks(m.entries, q).length : 0),
      ownCounts: (q) => (m ? ownershipCounts(m.entries, q) : { all: 0, ready: 0, partial: 0, none: 0 }),
      ownershipDisabled: this.ownershipDisabled(),
      lockDisabled: this.lockDisabled(),
    };
    const ref = this.dialog.open<DeckFiltersDialog, DeckFiltersDialogData, DeckListQuery>(DeckFiltersDialog, {
      ...DIALOG_MOTION,
      data,
      ariaLabelledBy: 'deck-filters-title',
      width: '100vw',
      maxWidth: '100vw',
      height: '100svh',
      maxHeight: '100svh',
      autoFocus: 'first-tabbable',
      restoreFocus: false,
      panelClass: 'deck-filters-panel',
    });
    this.dialogOpen = true;
    ref.afterClosed().subscribe((q) => {
      this.dialogOpen = false;
      if (this.destroyed) return;
      if (q) this.patchQuery(q);
      afterNextRender(() => this.filtersButton()?.nativeElement.focus(), { injector: this.injector });
    });
  }

  protected onDocumentKey(e: KeyboardEvent): void {
    if (e.key !== '/' || this.dialogOpen || this.dialog.openDialogs.length || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    const input = this.searchInput()?.nativeElement;
    if (!input || input.disabled) return;
    e.preventDefault();
    input.focus();
  }

  /** A filter or sort change shows the result from the top of the list (COLL-093 (d)). */
  private scrollListToTop(): void {
    const host = this.gridHost()?.nativeElement;
    if (!host) return;
    const header = this.doc.querySelector('.site-header')?.getBoundingClientRect().height ?? 64;
    const toolbar = this.doc.querySelector('.deck-toolbar')?.getBoundingClientRect().height ?? 56;
    const top = Math.max(0, host.getBoundingClientRect().top + scrollY - header - toolbar);
    if (scrollY > top) scrollTo({ top });
  }

  // ---------------------------------------------------------------- import (OWN-094)

  private dropImportParam(): void {
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
    if (this.guest()) return; // H-679: imports stay sign-in only
    const opener = dialogOpener(this.doc);
    const deckCommitter = this.deckImport;
    const ref = this.dialog.open<ImportDialog, ImportDialogData, ImportDialogResult>(ImportDialog, {
      ...DIALOG_MOTION,
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
