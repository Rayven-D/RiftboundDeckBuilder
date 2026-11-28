import { injectNotices } from '../../shared/notice/notice-snack-bar';
import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  Component,
  DestroyRef,
  ElementRef,
  InjectionToken,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { CardData } from '../../core/cards/card-data';
import {
  computeDeckOwnership,
  computeSharedPool,
  summarizeDeck,
  type CollectionCatalogView,
  type CollectionOwnership,
  type NameLock,
  type DeckOwnershipInput,
  type DeckOwnershipView,
  type DeckTileSummary,
  type DeckZone,
  type OwnershipCard,
  type SharedPool,
  type StoredTags,
  type UserDeck,
  type ZoneSection,
} from '../../core/decks';
import { gridMove } from '../../shared/collection/collection-view';
import { CollectionImport } from '../../core/import/collection-import';
import { DECK_SAVE_TEXT, DeckImport, NEW_DECK_ID } from '../../core/import/deck-import';
import { AppStores } from '../../core/storage/app-stores';
import { GuestTestData } from '../../core/test-data/guest-test-data';
import { GuestBanner } from '../collection/guest-banner';
import { KEY_PREFIX } from '../../core/storage/kv-backend';
import { DeckStoreError, STORAGE_KEYS } from '../../core/storage/local-stores';
import { refocusAfterDialog } from '../../core/sync/sync.service';
import { DeckCardContent } from '../../shared/deck-detail/deck-card-content';
import {
  DECK_CARD_DIALOG_KIND,
  DECK_CARD_DIALOG_TITLE_ID,
  DeckCardDialog,
  DeckCardDialogData,
  DeckCardDialogResult,
} from '../../shared/deck-detail/deck-card-dialog';
import { DeckCardRow } from '../../shared/deck-detail/deck-card-row';
import { PHONE as SHEET_PHONE, cardDialogConfig } from '../../shared/card-sheet/card-sheet';
import { takeDialogReopen } from '../../shared/dialog-history';
import { routeTransitionDone } from '../../shared/route-transition';
import { startScopedTransition } from '../../shared/scoped-transition';
import { SectionBox, anchorScrollDelta, captureAnchor } from '../../shared/deck-detail/view-anchor';
import { ListItems, restoreListScroll, saveListScrollOnLeave, takeListScroll } from '../../shared/list-scroll';

/** The page's card tiles / rows for the Back scroll restore, keyed by card id. */
const DECK_CARDS: ListItems = { selector: '[data-card]', key: (el) => el.getAttribute('data-card') };
import type { NameLockContext } from '../../shared/deck-detail/name-lock-action';
import { DeckCardTile } from '../../shared/deck-detail/deck-card-tile';
import { confirmDelete, openRenameDialog, openRuleCheck } from '../../shared/deck-detail/deck-dialogs';
import { CopyMode, DeckMissing } from '../../shared/deck-detail/deck-missing';
import {
  DECK_VIEW_KEY,
  DETAIL_TEXT,
  DeckViewMode,
  ZONE_LABEL,
  cardId,
  duplicateDeck,
  exportDeckText,
  exportFileName,
  findCard,
  firstCardId,
  fullArtUrl,
  headerSummary,
  isReadOnlyDeck,
  mergedMissingText,
  navLabel,
  neighbourId,
  newerDeckRecord,
  parseViewMode,
  ruleCheckContent,
  sectionCounts,
  sourceParts,
} from '../../shared/deck-detail/detail-view';
import { DeckListFocus } from '../../shared/deck/deck-list-focus';
import { DeckLocks } from '../../shared/deck/deck-locks.service';
import { LockActions } from '../../shared/deck/lock-actions';
import { EmptyState } from '../../shared/empty-state';
import { Icon } from '../../shared/icon';
import type { StoredPrintingCodes } from '../../shared/storage/records';
import { NOTICE_POSITION, noticeOptions } from '../../shared/sync/notice';
import { ReadOnlyAreaError } from '../../shared/sync/tracked-stores';

/**
 * DECK-091: reads a deck record as stored (raw JSON), for one the store refuses because it has a newer
 * `schemaVersion`; Deck detail then shows it read-only. Replaceable in tests (the stores there use a memory backend).
 */
export const RAW_DECK_RECORD = new InjectionToken<(id: string) => string | null>('RAW_DECK_RECORD', {
  providedIn: 'root',
  factory: () => (id) => {
    try {
      return globalThis.localStorage?.getItem(`${STORAGE_KEYS.deckPrefix}${id}`) ?? null;
    } catch {
      return null;
    }
  },
});

/** OWN-114: where the Card view / List view choice is kept (this device only). Replaceable in tests. */
export const DEVICE_STORAGE = new InjectionToken<Pick<Storage, 'getItem' | 'setItem'> | null>('DEVICE_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  },
});

type Phase = 'loading' | 'ready' | 'not-found';
type PanelTab = 'card' | 'missing';

interface Loaded {
  deck: UserDeck;
  readOnly: boolean;
  view: DeckOwnershipView;
  tile: DeckTileSummary;
  catalog: CollectionCatalogView | null;
  /** The shared pool for Lock in (SHARE-020); null while ownership is unavailable. */
  pool: SharedPool | null;
  /** SHARE-061: the lock store could not be read (locks ignored, Lock in / Unlock refused). */
  locksUnreadable: boolean;
  /** OWN-062: the collection or its tags could not be read. */
  collectionUnreadable: boolean;
  banUnknown: boolean;
}

const PHONE = '(max-width: 39.99rem)';
const DESKTOP = '(min-width: 64rem)';
const SKELETON_DELAY_MS = 200;
/** OWN-110: gap between the sticky bars and a section heading after a jump; the current-section test uses the same line. */
const LAND_GAP = 12;
/** OWN-110: a jump counts as finished after this long without a scroll event (for browsers without `scrollend`). */
const JUMP_IDLE_MS = 150;
/** OWN-110: room left beside the current link when the section bar scrolls sideways to show it. */
const NAV_MARGIN = 8;
const DELETE_UNDO_MS = 10_000;
const EMPTY_TAGS: StoredTags = { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} };
const EMPTY_CODES: StoredPrintingCodes = { schemaVersion: 1, updatedAt: '', codes: {} };

/** Local calendar date as `YYYY-MM-DD` (SPEC-002 LEGAL-R02 "today"). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Deck detail (`/decks/:id`; SPEC-005 OWN-010, OWN-011, OWN-110…119; brief brain/04-UI/Decks.md §6–§10 as changed by
 * RJ's H-260 answers; Decks Components §5, §8, §9, §11, §12, §13). One scrolling page: the header with the summary and
 * the completion percentage (`view.summary.completionPercent`, as it is), the sticky section bar with the Card / List
 * view toggle, the six sections in Riot order, and on desktop (64rem and wider) the persistent panel with the Card and
 * Missing tabs, the first card selected on load. Below 64rem a press opens the card dialog and the missing list sits
 * under the header. Rename only (no card editor, DECK-080 deferred).
 *
 * Every number comes from `computeDeckOwnership` / `summarizeDeck` over all decks and one `computeSharedPool` run, as on
 * the list (OWN-073). Lock in / Unlock is H-060's shared `app-lock-actions`, since H-662 an icon-only toggle right after
 * the deck name (no lock badge or lock date in the header); a lock change re-reads the page through `DeckLocks.changed`.
 */
@Component({
  selector: 'app-deck-detail',
  imports: [
    RouterLink,
    GuestBanner,
    EmptyState,
    Icon,
    DeckCardTile,
    DeckCardRow,
    DeckCardContent,
    DeckMissing,
    LockActions,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatDivider,
  ],
  templateUrl: './deck-detail.html',
  styleUrls: ['./deck-detail.scss', './deck-detail-sections.scss'],
  host: {
    '(window:scroll)': 'onScroll()',
    '(window:scrollend)': 'endJump()',
    '(window:focus)': 'checkToday()',
    '(document:visibilitychange)': 'checkToday()',
  },
})
export class DeckDetail {
  /** The deck id from the route. Another deck's link (an "Other decks" row) changes it in place. */
  readonly deckId = input.required<string>();

  private readonly app = inject(AppStores);
  /** H-679: signed-out guest test data (memory only): the guest banner shows (TEST-063). */
  protected readonly guest = this.app.guest;
  private readonly stores = this.app.stores;
  private readonly cardData = inject(CardData);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = injectNotices();
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly appRef = inject(ApplicationRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deckImport = inject(DeckImport);
  private readonly collectionImport = inject(CollectionImport);
  private readonly newId = inject(NEW_DECK_ID);
  private readonly rawRecord = inject(RAW_DECK_RECORD);
  private readonly device = inject(DEVICE_STORAGE);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly deckLocks = inject(DeckLocks);
  private readonly listFocus = inject(DeckListFocus);

  protected readonly text = DETAIL_TEXT;
  protected readonly zoneLabel = ZONE_LABEL;
  protected readonly phase = signal<Phase>('loading');
  protected readonly showSkeleton = signal(false);
  protected readonly skeletonTiles = [0, 1, 2, 3, 4];
  protected readonly loaded = signal<Loaded | null>(null);
  protected readonly view = computed(() => this.loaded()?.view ?? null);
  /** A polite status line (OWN-111 (b), OWN-119 (b)). */
  protected readonly status = signal('');
  protected readonly banDismissed = signal(false);

  // ---- layout
  protected readonly isPhone = toSignal(this.breakpoints.observe(PHONE).pipe(map((s) => s.matches)), { initialValue: false });
  protected readonly isDesktop = toSignal(this.breakpoints.observe(DESKTOP).pipe(map((s) => s.matches)), { initialValue: true });

  // ---- header
  protected readonly header = computed(() => {
    const v = this.view();
    return v ? headerSummary(v) : null;
  });
  protected readonly source = computed(() => {
    const d = this.loaded();
    return d ? sourceParts(d.deck) : { pilot: null, sourceUrl: null };
  });
  protected readonly locked = computed(() => this.view()?.lock?.locked ?? false);
  /** H-665 (SHARE-094 (a)): what the card dialog / panel's per-name Lock / Unlock reads. */
  protected readonly lockContext = computed((): NameLockContext | null => {
    const d = this.loaded();
    return d ? { deck: d.deck, pool: d.pool, readOnly: d.readOnly, locksUnreadable: d.locksUnreadable } : null;
  });
  protected readonly nameExpanded = signal(false);
  /** H-668: the clamped name overflows its two lines (measured on render and resize). */
  protected readonly nameOverflows = signal(false);
  /** H-668: the name is a toggle only when it is (or was, while expanded) actually clamped. */
  protected readonly nameInteractive = computed(() => this.nameOverflows() || this.nameExpanded());
  private readonly nameText = viewChild<ElementRef<HTMLElement>>('nameText');
  protected readonly descExpanded = signal(false);
  protected readonly descOverflows = signal(false);
  private readonly desc = viewChild<ElementRef<HTMLElement>>('desc');

  // ---- sections, view mode and selection (OWN-110…114)
  protected readonly mode = signal<DeckViewMode>(parseViewMode(this.readDevice()));
  protected readonly currentZone = signal<DeckZone>('legend');
  /** The card the user picked; null = the first card (OWN-111 (b)). Never stored. */
  private readonly picked = signal<string | null>(null);
  protected readonly selectedId = computed(() => {
    const v = this.view();
    if (!v) return null;
    const p = this.picked();
    return p !== null && findCard(v, p) ? p : firstCardId(v);
  });
  protected readonly selected = computed(() => {
    const v = this.view();
    return v ? findCard(v, this.selectedId()) : null;
  });
  protected readonly tab = signal<PanelTab>('card');
  /** Roving tab stop per section grid (OWN-038). */
  private readonly active = signal<Partial<Record<DeckZone, number>>>({});
  private readonly panelBody = viewChild<ElementRef<HTMLElement>>('panelBody');

  private loadSeq = 0;
  private reloadScheduled = false;
  private today = localToday();
  private destroyed = false;
  private loadedId: string | null = null;
  /** OWN-110: a section-bar jump in flight, and the section it pinned as current once it ended. */
  private jumping: { zone: DeckZone } | null = null;
  private pinned: { zone: DeckZone; y: number } | null = null;
  private jumpTimer: ReturnType<typeof setTimeout> | undefined;
  /** Set once a delete is under way: the page is leaving, so lock-change re-reads are skipped. */
  private leaving = false;

  constructor() {
    // OWN-084 / COLL-093 (e): this deck's scroll position, saved when the page is left (the component is reused from
    // deck to deck, so the key is read then); restored by afterBack().
    saveListScrollOnLeave(this.router, () => `/decks/${this.deckId()}`, () => this.phase() === 'ready', DECK_CARDS);
    // A new id (first load, or another deck's link): reset what belongs to the old deck and read again.
    effect(() => {
      const id = this.deckId();
      untracked(() => {
        this.picked.set(null);
        this.tab.set('card');
        this.active.set({});
        this.descExpanded.set(false);
        this.nameExpanded.set(false);
        this.banDismissed.set(false);
        this.loadedId = null;
        void this.load(id, true);
      });
    });

    // OWN-111 (b): a picked card that left the deck is replaced by the first card, with a polite status.
    effect(() => {
      const v = this.view();
      const p = untracked(this.picked);
      if (v && p !== null && !findCard(v, p)) {
        untracked(() => {
          this.picked.set(null);
          this.status.set(DETAIL_TEXT.cardLeft);
        });
      }
    });

    // Document title: "<deck name> · Rift Builder" (brief §6).
    effect(() => {
      const d = this.loaded();
      const phase = this.phase();
      if (phase === 'ready' && d) this.title.setTitle(`${d.deck.name} · Rift Builder`);
      else if (phase === 'not-found') this.title.setTitle('Deck detail · Rift Builder');
    });

    // H-668: the name is interactive only when the two-line clamp actually cuts it (no polling: ResizeObserver).
    effect((onCleanup) => {
      const el = this.nameText()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        this.nameOverflows.set(false);
        return;
      }
      const measure = () => {
        if (!untracked(this.nameExpanded)) this.nameOverflows.set(el.scrollHeight > el.clientHeight + 1);
      };
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      measure();
      onCleanup(() => ro.disconnect());
    });

    // OWN-010 (c): "Show more" only when the description is longer than three lines.
    effect((onCleanup) => {
      const el = this.desc()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') {
        this.descOverflows.set(false);
        return;
      }
      const measure = () => {
        if (!this.descExpanded()) this.descOverflows.set(el.scrollHeight > el.clientHeight + 1);
      };
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      measure();
      onCleanup(() => ro.disconnect());
    });

    // OWN-070 / OWN-071: another tab changed the stores → recompute in place (scroll, selection and dialog stay).
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || (e.key.startsWith(KEY_PREFIX) && e.key !== STORAGE_KEYS.viewState)) this.scheduleReload();
    };
    addEventListener('storage', onStorage);
    this.deckImport.saved.pipe(takeUntilDestroyed()).subscribe(() => this.scheduleReload());
    this.collectionImport.written.pipe(takeUntilDestroyed()).subscribe(() => this.scheduleReload());
    // H-679: the catalog source changed (a pull brought test data): read again, so "Card data not loaded" clears.
    this.cardData.sourceChanged.pipe(takeUntilDestroyed()).subscribe(() => this.scheduleReload());
    inject(GuestTestData).changed.pipe(takeUntilDestroyed()).subscribe(() => this.scheduleReload());
    // SHARE-029 / SHARE-064: a lock change this tab wrote raises no storage event; recompute in place.
    this.deckLocks.changed.pipe(takeUntilDestroyed()).subscribe(() => this.scheduleReload());
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      clearTimeout(this.jumpTimer);
      removeEventListener('storage', onStorage);
    });
  }

  // ---------------------------------------------------------------- data

  private scheduleReload(): void {
    if (this.reloadScheduled) return;
    this.reloadScheduled = true;
    const run = () => {
      this.reloadScheduled = false;
      if (!this.destroyed && !this.leaving) void this.load(this.deckId(), false);
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  /** OWN-072: a new local date while the page is open → ban status and legality on the next focus or visibility. */
  protected checkToday(): void {
    if (this.doc.visibilityState === 'hidden') return;
    const now = localToday();
    if (now === this.today) return;
    this.today = now;
    this.scheduleReload();
  }

  private async load(id: string, first: boolean): Promise<void> {
    const seq = ++this.loadSeq;
    const current = () => seq === this.loadSeq && !this.destroyed;
    if (first) {
      this.phase.set('loading');
      this.loaded.set(null);
    }
    const timer = first ? setTimeout(() => current() && this.showSkeleton.set(true), SKELETON_DELAY_MS) : undefined;
    try {
      const result = await this.read(id);
      if (!current()) return;
      if (result === null) {
        // OWN-119 (b): also when the open deck is deleted elsewhere, with a polite status.
        if (this.loadedId === id) this.status.set(DETAIL_TEXT.deletedElsewhere);
        this.loadedId = null;
        this.loaded.set(null);
        this.phase.set('not-found');
        return;
      }
      this.loadedId = id;
      this.loaded.set(result);
      this.phase.set('ready');
      if (first) this.afterBack(id);
    } finally {
      clearTimeout(timer);
      if (current()) this.showSkeleton.set(false);
    }
  }

  /**
   * H-699 (RJ 2026-11-28): reached by Back / Forward, this deck page gets its scroll position back (OWN-084, COLL-093
   * (e)), then the card dialog that was open when a link in it was followed opens again on its own history entry, on
   * the card it showed (the current step). Desktop has no dialog: the card is selected in the panel instead. A record
   * for a card no longer in the deck opens nothing.
   */
  private afterBack(id: string): void {
    const pos = takeListScroll(this.router, `/decks/${id}`);
    const reopen = takeDialogReopen(this.router, DECK_CARD_DIALOG_KIND);
    if (pos === null && !reopen) return;
    afterNextRender(
      () => {
        void (pos ? restoreListScroll(pos, DECK_CARDS, this.doc) : Promise.resolve()).then(() => {
          const v = this.view();
          if (!reopen || this.destroyed || this.loadedId !== id || !v || !findCard(v, reopen.id)) return;
          if (this.isDesktop()) {
            this.picked.set(reopen.id);
            this.tab.set('card');
          } else {
            // After the route's view transition: an overlay added mid-transition crashed Chromium (H-699 e2e).
            void routeTransitionDone().then(() => {
              if (!this.destroyed && this.loadedId === id && this.dialog.openDialogs.length === 0) this.openCard(reopen.id, reopen.token);
            });
          }
        });
      },
      { injector: this.injector },
    );
  }

  /** Reads every input of the engine and computes this deck's view (OWN-025, OWN-073); null = no such deck. */
  private async read(id: string): Promise<Loaded | null> {
    const s = this.stores;
    let deck: UserDeck | null;
    let readOnly = false;
    try {
      deck = await s.decks.get(id);
    } catch {
      // DECK-091: a newer record is shown read-only (and never overwritten); a corrupt one is not shown.
      deck = newerDeckRecord(this.rawRecord(id), id);
      readOnly = deck !== null;
    }
    if (!deck) return null;
    readOnly ||= isReadOnlyDeck(deck);

    let collectionUnreadable = false;
    const [decks, locks, collection, tags, printingCodes] = await Promise.all([
      s.decks.list().catch((): UserDeck[] => []),
      s.locks.load().then(
        (l): readonly NameLock[] => l?.locks ?? [],
        () => null, // SHARE-061: unreadable → locks ignored
      ),
      s.collection.load().catch(() => {
        collectionUnreadable = true; // OWN-062
        return null;
      }),
      s.tags.load().catch(() => {
        collectionUnreadable = true; // OWN-062: exclusions unknown
        return null;
      }),
      s.printingCodes.load().catch(() => null),
    ]);
    // OWN-063 / OWN-015: a card data or ban list failure degrades the page (banner, "ban status unknown"), never breaks it.
    const catalogResult = await Promise.resolve()
      .then(() => this.cardData.loadCatalog())
      .catch(() => null);
    const catalog = catalogResult?.status === 'ok' ? catalogResult.catalog : null;
    const banData = await Promise.resolve()
      .then(() => this.cardData.loadBans())
      .catch(() => null);

    const all = decks.some((d) => d.id === deck.id) ? decks.map((d) => (d.id === deck.id ? deck : d)) : [...decks, deck];
    let ownership: CollectionOwnership;
    if (collectionUnreadable || !catalog) {
      ownership = { status: 'unavailable', locks };
    } else {
      const input: DeckOwnershipInput = {
        collection: collection ?? { schemaVersion: 1, updatedAt: '', catalogVersion: catalog.catalogVersion, cards: {} },
        tags: tags ?? EMPTY_TAGS,
        printingCodes: printingCodes ?? EMPTY_CODES,
        catalog,
      };
      ownership = { status: 'ok', input, shared: computeSharedPool({ decks: all, locks, ownership: input }) };
    }
    const view = computeDeckOwnership(deck, ownership, catalog, banData, this.today);
    const pool = ownership.status === 'ok' ? ownership.shared : null;
    // No SPEC-002 engine or format data in `web/` yet (H-194): legality is "Not fully checked" (OWN-004).
    const tile = summarizeDeck(deck, view, null, null);
    return { deck, readOnly, view, tile, pool, locksUnreadable: locks === null, catalog, collectionUnreadable, banUnknown: banData === null };
  }

  protected async retryCatalog(): Promise<void> {
    await this.cardData.reload();
    await this.load(this.deckId(), false);
  }

  // ---------------------------------------------------------------- sections

  protected sectionCounts(s: ZoneSection): string {
    const v = this.view();
    return v ? sectionCounts(s, v) : '';
  }

  protected readonly navLabel = navLabel;
  protected readonly cardId = cardId;

  protected isActive(zone: DeckZone, i: number): boolean {
    return (this.active()[zone] ?? 0) === i;
  }

  /**
   * OWN-110: the section in view gets `aria-current="location"`: the last section whose heading has reached the
   * landing line (the bottom of the sticky bars plus `LAND_GAP`, the same line `jump()` scrolls a heading to). While a
   * jump is in flight the target stays current; after it, the target stays current until the page scrolls again
   * (a section near the end of the page may not be able to reach the line).
   */
  protected onScroll(): void {
    const v = this.view();
    if (!v) return;
    const y = this.scrollY();
    if (this.jumping) {
      this.armJumpEnd();
      return;
    }
    if (this.pinned) {
      if (Math.abs(y - this.pinned.y) < 2) return;
      this.pinned = null;
    }
    const line = this.stickyOffset() + LAND_GAP + 2;
    let current: DeckZone = v.sections[0]?.zone ?? 'legend';
    for (const s of v.sections) {
      const el = this.doc.getElementById(`zone-${s.zone}`);
      if (el && el.getBoundingClientRect().top <= line) current = s.zone;
    }
    this.setCurrentZone(current);
  }

  private scrollY(): number {
    return this.doc.defaultView?.scrollY ?? 0;
  }

  private stickyOffset(): number {
    const header = this.doc.querySelector('.site-header')?.getBoundingClientRect().height ?? 64;
    const bar = this.doc.querySelector('.deck-bar')?.getBoundingClientRect().height ?? 52;
    return header + bar;
  }

  /** Marks the current section and keeps its link visible in the bar by scrolling only the bar (never the page). */
  private setCurrentZone(zone: DeckZone): void {
    if (zone === this.currentZone()) return;
    this.currentZone.set(zone);
    const nav = this.doc.querySelector<HTMLElement>('.section-nav');
    const link = nav?.querySelector<HTMLElement>(`a[data-zone="${zone}"]`);
    if (!nav || !link) return;
    const n = nav.getBoundingClientRect();
    const l = link.getBoundingClientRect();
    // Instant and on the bar only: a page scroll (a jump in flight) is never touched.
    if (l.left < n.left) nav.scrollLeft += Math.floor(l.left - n.left) - NAV_MARGIN;
    else if (l.right > n.right) nav.scrollLeft += Math.ceil(l.right - n.right) + NAV_MARGIN;
  }

  /**
   * OWN-110: an in-page link scrolls the page so the section heading lands just under the sticky bars (smoothly
   * unless reduced motion), focuses the heading and marks the section current at once. The page scroll is the only
   * scroll started; `onScroll` leaves it alone until it ends (`scrollend`, or no scroll event for `JUMP_IDLE_MS`).
   */
  protected jump(e: Event, zone: DeckZone): void {
    e.preventDefault();
    const heading = this.doc.getElementById(`zone-${zone}`);
    const win = this.doc.defaultView;
    if (!heading || !win) return;
    const reduce = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    const top = Math.max(0, Math.round(this.scrollY() + heading.getBoundingClientRect().top - this.stickyOffset() - LAND_GAP));
    this.pinned = null;
    this.jumping = { zone };
    this.setCurrentZone(zone);
    heading.focus({ preventScroll: true });
    win.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    this.armJumpEnd();
  }

  /** Called on `scrollend` (window listener) or by the idle timer. */
  protected endJump(): void {
    if (!this.jumping) return;
    clearTimeout(this.jumpTimer);
    this.pinned = { zone: this.jumping.zone, y: this.scrollY() };
    this.jumping = null;
  }

  private armJumpEnd(): void {
    clearTimeout(this.jumpTimer);
    this.jumpTimer = setTimeout(() => this.endJump(), JUMP_IDLE_MS);
  }

  /**
   * OWN-114 Card / List. Brief H-716 S1: the section at the reading line stays where it was (the views differ in
   * height, so the browser would otherwise clamp or keep a scroll offset that lands elsewhere), and the cards
   * cross-fade in place (`vt-view-swap`, styles.scss; the header, section bar and panel stay still). Reduced motion
   * or no view transitions: the same anchor, an instant swap.
   */
  protected setMode(mode: DeckViewMode): void {
    const v = this.view();
    const win = this.doc.defaultView;
    if (mode !== this.mode() && v && win) {
      const zones = v.sections.map((s) => s.zone);
      const line = this.stickyOffset() + LAND_GAP + 2;
      const anchor = captureAnchor(this.sectionBoxes(zones), line, this.scrollY());
      void startScopedTransition(
        () => {
          this.mode.set(mode);
          this.appRef.tick();
          const after = anchor ? this.sectionBoxes(zones)[anchor.index] : undefined;
          if (anchor && after) {
            const dy = Math.round(anchorScrollDelta(anchor, after, line));
            if (dy !== 0) win.scrollBy({ top: dy, behavior: 'instant' });
          }
        },
        'vt-view-swap',
        this.doc,
      );
    } else this.mode.set(mode);
    try {
      this.device?.setItem(DECK_VIEW_KEY, mode);
    } catch {
      // a full or blocked storage keeps the choice for this page only
    }
  }

  /** Each section's heading top and section bottom, in viewport coordinates (S1 anchor). */
  private sectionBoxes(zones: readonly DeckZone[]): SectionBox[] {
    return zones.map((z) => {
      const top = this.doc.getElementById(`zone-${z}`)?.getBoundingClientRect().top ?? 0;
      const bottom = this.doc.getElementById(`section-${z}`)?.getBoundingClientRect().bottom ?? top;
      return { top, bottom };
    });
  }

  private readDevice(): string | null {
    try {
      return this.device?.getItem(DECK_VIEW_KEY) ?? null;
    } catch {
      return null;
    }
  }

  /** OWN-038: arrow-key roving inside one section's grid or list (one Tab stop per section). */
  protected onGridKey(e: KeyboardEvent, section: ZoneSection): void {
    const list = e.currentTarget as HTMLElement;
    const buttons = Array.from(list.querySelectorAll<HTMLElement>('[data-card]'));
    const index = buttons.indexOf((e.target as HTMLElement).closest<HTMLElement>('[data-card]')!);
    if (index < 0) return;
    const top = buttons[0].offsetTop;
    const cols = Math.max(1, buttons.filter((b) => b.offsetTop === top).length);
    const next = gridMove(e.key, e.ctrlKey || e.metaKey, index, buttons.length, cols);
    if (next === null) return;
    e.preventDefault();
    this.active.update((a) => ({ ...a, [section.zone]: next }));
    buttons[next]?.focus();
  }

  protected onGridFocus(e: FocusEvent, section: ZoneSection): void {
    const list = e.currentTarget as HTMLElement;
    const buttons = Array.from(list.querySelectorAll<HTMLElement>('[data-card]'));
    const i = buttons.indexOf((e.target as HTMLElement).closest<HTMLElement>('[data-card]')!);
    if (i >= 0 && i !== this.active()[section.zone]) this.active.update((a) => ({ ...a, [section.zone]: i }));
  }

  /** OWN-038: select the card in the panel (desktop) or open the card dialog (below 64rem). */
  protected press(card: OwnershipCard): void {
    const id = cardId(card);
    if (this.isDesktop()) {
      this.picked.set(id);
      this.tab.set('card');
      // H-468 (10): tell screen-reader users where the result went (the panel updates silently otherwise).
      this.status.set(DETAIL_TEXT.showing(card.name));
      this.panelBody()?.nativeElement.scrollTo?.({ top: 0 });
      return;
    }
    this.openCard(id);
  }

  // ---------------------------------------------------------------- panel tabs (OWN-111 (c))

  protected selectTab(tab: PanelTab, focus = false): void {
    this.tab.set(tab);
    if (focus) afterNextRender(() => this.doc.getElementById(`deck-tab-${tab}`)?.focus(), { injector: this.injector });
  }

  protected onTabKey(e: KeyboardEvent): void {
    const order: PanelTab[] = ['card', 'missing'];
    const i = order.indexOf(this.tab());
    let next: PanelTab | null = null;
    if (e.key === 'ArrowRight') next = order[(i + 1) % 2];
    else if (e.key === 'ArrowLeft') next = order[(i + 1) % 2];
    else if (e.key === 'Home') next = 'card';
    else if (e.key === 'End') next = 'missing';
    if (next === null) return;
    e.preventDefault();
    this.selectTab(next, true);
  }

  protected fullUrl(card: OwnershipCard): string | null {
    return fullArtUrl(card, this.loaded()?.catalog ?? null);
  }

  // ---------------------------------------------------------------- card dialog (OWN-113)

  private openCard(id: string, historyToken: string | null = null): void {
    const data: DeckCardDialogData = {
      cardId: id,
      historyToken,
      card: (cid) => {
        const v = this.view();
        return v ? findCard(v, cid) : null;
      },
      fullUrl: (c) => this.fullUrl(c),
      neighbour: (cid, step) => {
        const v = this.view();
        return v ? neighbourId(v, cid, step) : null;
      },
      locked: () => this.locked(),
      ownershipAvailable: () => this.view()?.ownershipAvailable ?? false,
      lockContext: () => this.lockContext(),
    };
    const ref = this.dialog.open<DeckCardDialog, DeckCardDialogData, DeckCardDialogResult>(DeckCardDialog, {
      data,
      ariaLabelledBy: DECK_CARD_DIALOG_TITLE_ID,
      restoreFocus: false,
      // H-699 (Brief H-698): phones get the bottom sheet; tablets the centred dialog, sized as before.
      ...cardDialogConfig(this.breakpoints.isMatched(SHEET_PHONE), {
        width: 'min(44rem, calc(100vw - 2 * var(--content-gutter)))',
        maxHeight: 'min(90svh, 52rem)',
      }, historyToken !== null),
    });
    ref.afterClosed().subscribe((result) => {
      if (this.destroyed || result?.navigated) return; // H-699: a link left the page (its scroll is saved as it was)
      if (result?.gone) {
        this.snackBar.open(DETAIL_TEXT.cardLeftDialog, undefined, noticeOptions('success'));
        refocusAfterDialog(undefined, this.doc);
        return;
      }
      const target = result?.cardId ?? id;
      const el = this.doc.querySelector<HTMLElement>(`[data-card="${CSS.escape(target)}"]`);
      if (el) {
        el.scrollIntoView?.({ block: 'nearest' });
        el.focus();
      } else refocusAfterDialog(undefined, this.doc);
    });
  }

  // ---------------------------------------------------------------- header actions

  protected openRuleCheck(): void {
    const d = this.loaded();
    if (!d) return;
    openRuleCheck(this.dialog, ruleCheckContent(d.view, d.tile.legalityLabel, d.tile.legalityVerdict));
  }

  /** OWN-052 / OWN-053: the DECK-085 layout, or the merged list. */
  protected async copyMissing(mode: CopyMode): Promise<void> {
    const v = this.view();
    if (!v) return;
    await this.copyText(mode === 'sections' ? v.missingText : mergedMissingText(v.missing), DETAIL_TEXT.missingCopied);
  }

  /** DECK-085 Export: copy the deck list. */
  protected async copyDeckList(): Promise<void> {
    const d = this.loaded();
    if (d) await this.copyText(exportDeckText(d.deck, d.catalog), DETAIL_TEXT.deckListCopied);
  }

  /** DECK-085 Export: download `<name>.txt`. */
  protected downloadDeckList(): void {
    const d = this.loaded();
    if (!d) return;
    const blob = new Blob([exportDeckText(d.deck, d.catalog)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = this.doc.createElement('a');
    a.href = url;
    a.download = exportFileName(d.deck.name);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async copyText(value: string, done: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.snackBar.open(done, undefined, noticeOptions('success'));
    } catch {
      this.snackBar.open(DETAIL_TEXT.copyFailed, 'OK', noticeOptions('error'));
    }
  }

  /** DECK-084: a copy, unlocked (SHARE-026); the page stays and the snack bar offers Open. */
  protected async duplicate(): Promise<void> {
    const d = this.loaded();
    if (!d || d.readOnly) return;
    const copy = duplicateDeck(d.deck, this.newId(), new Date().toISOString());
    try {
      await this.stores.decks.create(copy);
    } catch (err) {
      this.snackBar.open(saveErrorText(err), 'OK', noticeOptions('error'));
      return;
    }
    this.scheduleReload(); // the shared lines of this deck change too
    this.app.majorAction(); // SYNC-126 (a) 5: Duplicate
    const ref = this.snackBar.open(DETAIL_TEXT.duplicated, DETAIL_TEXT.open, noticeOptions('success'));
    ref.onAction().subscribe(() => void this.router.navigate(['/decks', copy.id]));
  }

  /** OWN-118 / DECK-081: Rename on every deck, locked and tournament decks included; read-only decks excepted. */
  protected rename(): void {
    const d = this.loaded();
    if (!d || d.readOnly) return;
    const opener = this.doc.activeElement as HTMLElement | null;
    const ref = openRenameDialog(this.dialog, {
      deck: d.deck,
      save: async (result) => {
        try {
          const outcome = await this.stores.decks.update(result.deck, d.deck.updatedAt);
          if (outcome === 'conflict') {
            this.scheduleReload();
            return DETAIL_TEXT.saveConflict;
          }
        } catch (err) {
          return err instanceof ReadOnlyAreaError ? err.message : DETAIL_TEXT.saveFailed;
        }
        await this.load(this.deckId(), false);
        this.snackBar.open(result.nameChanged ? DETAIL_TEXT.renamed : DETAIL_TEXT.changesSaved, undefined, noticeOptions('success'));
        return null;
      },
    });
    ref.afterClosed().subscribe(() => {
      if (!this.destroyed) afterNextRender(() => this.focusMore(opener), { injector: this.injector });
    });
  }

  // H-462: `read: ElementRef`; without it the ref is the MatIconButton instance, which has no nativeElement.
  private readonly moreButtonRef = viewChild('moreButton', { read: ElementRef<HTMLElement> });
  private moreButton(): HTMLElement | undefined {
    return this.moreButtonRef()?.nativeElement;
  }

  /**
   * H-462 (WCAG 2.4.3): after a dialog opened from the More menu closes, focus goes back to More actions (the menu
   * item that opened it is gone). Always moved: the dialog's own restore leaves focus on `<main>`, not `<body>`, so
   * `refocusAfterDialog` alone would keep it there.
   */
  private focusMore(fallback?: HTMLElement | null): void {
    const more = this.moreButton();
    if (more?.isConnected) more.focus();
    else refocusAfterDialog(fallback?.isConnected ? fallback : undefined, this.doc);
  }

  /**
   * DECK-082 / DECK-083 / SHARE-024: confirm, delete the deck and its lock, go to `/decks`, "Deck deleted." with Undo
   * for 10 s; Undo restores the identical record, unlocked.
   */
  protected async delete(): Promise<void> {
    const d = this.loaded();
    if (!d || d.readOnly) return;
    const ok = await confirmDelete(this.dialog, { name: d.deck.name, locked: this.locked() });
    if (!ok) {
      afterNextRender(() => this.focusMore(), { injector: this.injector });
      return;
    }
    let removed: UserDeck | null;
    this.leaving = true;
    // H-681: the Undo writes back into the same stores instance, and only while the mode is unchanged.
    const pin = this.app.pin();
    try {
      removed = await pin.stores.decks.delete(d.deck.id);
    } catch (err) {
      this.leaving = false;
      this.snackBar.open(err instanceof ReadOnlyAreaError ? err.message : DETAIL_TEXT.saveFailed, 'OK', noticeOptions('error'));
      return;
    }
    if (!removed) {
      this.leaving = false;
      return;
    }
    // SHARE-024 / SYNC-035 / AC 87: the deck's name locks stay stored, ignored while the deck is gone (SHARE-062), and
    // leave with the deck tombstone when the 10 s Undo window ends; an Undo keeps them as they were.
    const stores = pin.stores;
    const saved = this.deckImport.saved;
    const listFocus = this.listFocus;
    listFocus.request({ kind: 'first' }); // H-462: the first tile, or the empty state's Import deck
    void this.router.navigate(['/decks']);
    const ref = this.snackBar.open(DETAIL_TEXT.deleted, DETAIL_TEXT.undo, { duration: DELETE_UNDO_MS, politeness: 'polite', ...NOTICE_POSITION });
    // H-681: a sign-in, sign-out or guest switch inside the window ends the Undo and closes its notice.
    const ended = pin.ended.subscribe(() => ref.dismiss());
    ref.afterDismissed().subscribe(() => ended.unsubscribe());
    ref.onAction().subscribe(async () => {
      if (!pin.valid()) return;
      try {
        listFocus.request({ kind: 'deck', deckId: removed.id }); // H-462: the restored deck's tile
        await stores.decks.create(removed); // SYNC-035: within the window this cancels the tombstone
        saved.next(removed); // the Decks page re-reads its list (DECK-098 seam)
      } catch (err) {
        this.snackBar.open(saveErrorText(err), 'OK', noticeOptions('error'));
      }
    });
  }

  /** `app-lock-actions` saved a change: recompute (DeckLocks.changed does the same; the reload is coalesced). */
  protected lockChanged(): void {
    this.scheduleReload();
  }

  /** H-668: a tap (or Enter / Space) on a clamped name shows it in full, or clamps it again. */
  protected toggleName(): void {
    if (!this.nameInteractive()) return;
    this.nameExpanded.update((x) => !x);
  }

  protected onNameKey(e: KeyboardEvent): void {
    if (!this.nameInteractive()) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggleName();
    } else if (e.key === 'Escape' && this.nameExpanded()) {
      e.preventDefault();
      this.nameExpanded.set(false);
    }
  }

  /** H-668: losing focus clamps the name again (tapping elsewhere, Tab away). */
  protected collapseName(): void {
    this.nameExpanded.set(false);
  }

  protected toggleDesc(): void {
    this.descExpanded.update((x) => !x);
  }
}

function saveErrorText(err: unknown): string {
  if (err instanceof DeckStoreError) {
    if (err.code === 'DECK_LIMIT') return DECK_SAVE_TEXT.limit;
    if (err.code === 'STORAGE_FULL') return DECK_SAVE_TEXT.storageFull;
    if (err.code === 'DECK_TOO_LARGE') return DECK_SAVE_TEXT.tooLarge;
  }
  if (err instanceof ReadOnlyAreaError) return err.message;
  return DETAIL_TEXT.saveFailed;
}
