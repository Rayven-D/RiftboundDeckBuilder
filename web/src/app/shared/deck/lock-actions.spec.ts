/**
 * `app-lock-actions` (H-060, for the Deck detail header H-254): SPEC-008 SHARE-020…023, SHARE-029, SHARE-061,
 * SHARE-063 and SPEC-005 OWN-116 on screen; SPEC-008 AC 23 (feedback and reason line), AC 13 and AC 19 (Unlock while
 * ownership is unavailable).
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { lock, makeCatalog, makeDeck } from '../../core/decks/engine-fixtures';
import type { NameLock, StoredDeckLocks, UserDeck } from '../../core/decks';
import { AppStores } from '../../core/storage/app-stores';
import { BrowserStores, createBrowserStores } from '../../core/storage/browser-stores';
import { MemoryBackend } from '../../core/storage/kv-backend';
import { STORAGE_KEYS } from '../../core/storage/local-stores';
import { DeckListEntry, DeckListModel, buildDeckList } from './deck-list';
import { DeckLocks } from './deck-locks.service';
import { LockActions } from './lock-actions';

const CATALOG = makeCatalog(['Hextech Ray']);
const TEMPO_ID = '00000000-0000-4000-9000-0000000000a1';
const OTHER_ID = '00000000-0000-4000-9000-0000000000a2';

@Component({
  imports: [LockActions],
  template: `
    @if (entry(); as e) {
      <app-lock-actions
        [deck]="e.deck"
        [view]="e.view"
        [pool]="model()!.pool"
        [readOnly]="e.summary.readOnly"
        [locksUnreadable]="model()!.locksUnreadable"
        [variant]="variant()"
      />
    }
  `,
})
class Host {
  readonly model = signal<DeckListModel | null>(null);
  readonly entry = signal<DeckListEntry | null>(null);
  readonly variant = signal<'button' | 'icon'>('button');
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const snack = () => text(document.querySelector('mat-snack-bar-container'));
const dialog = () => document.querySelector('mat-dialog-container');

let backend: MemoryBackend;
let stores: BrowserStores;

async function setup(opts: { owned: number; locks?: NameLock[] | 'newer'; collection?: 'unreadable'; tempo?: Partial<UserDeck>; variant?: 'icon' }) {
  backend = new MemoryBackend();
  stores = createBrowserStores(backend, { now: () => Date.now(), changed: () => undefined, readOnly: () => false });
  const tempo = { ...makeDeck(TEMPO_ID, 'Kennen Tempo', { main: [['Hextech Ray', 3]] }), ...opts.tempo } as UserDeck;
  const other = makeDeck(OTHER_ID, 'Kennen Control', { main: [['Hextech Ray', 3]] });
  await stores.raw.decks.put(tempo);
  await stores.raw.decks.put(other);
  if (opts.locks === 'newer') backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 3, updatedAt: 'x', locks: [] }));
  else if (opts.locks) backend.set(STORAGE_KEYS.locks, JSON.stringify({ schemaVersion: 2, updatedAt: 'x', locks: opts.locks }));
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [
      { provide: AppStores, useValue: { stores, majorAction: () => undefined } },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  if (opts.variant) fixture.componentInstance.variant.set(opts.variant);
  const locks = TestBed.inject(DeckLocks);
  const refresh = async () => {
    const stored = await locks.load();
    const model = buildDeckList({
      decks: [tempo, other],
      locks: stored,
      collection:
        opts.collection === 'unreadable'
          ? null
          : {
              collection: {
                schemaVersion: 1,
                updatedAt: '',
                catalogVersion: '0.3+test',
                cards: { 'hextech ray': { quantity: opts.owned, byPrinting: {} } },
              },
              tags: { schemaVersion: 3, updatedAt: '', tags: [], assignments: {} },
              printingCodes: { schemaVersion: 1, updatedAt: '', codes: {} },
            },
      catalog: CATALOG,
      banData: null,
      today: '2026-11-25',
      format: null,
    });
    fixture.componentInstance.model.set(model);
    fixture.componentInstance.entry.set(model.entries.find((e) => e.deck.id === TEMPO_ID)!);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  locks.changed.subscribe(() => void refresh());
  await refresh();
  return { el: fixture.nativeElement as HTMLElement, fixture, refresh };
}

const settle = async (fixture: { whenStable(): Promise<unknown>; detectChanges(): void }) => {
  for (let i = 0; i < 4; i++) {
    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
  }
};

describe('SPEC-008 app-lock-actions (SHARE-020…023, SHARE-029; SPEC-005 OWN-116)', () => {
  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((n) => (n.innerHTML = ''));
  });

  it('SPEC-008 AC 23 incomplete deck: Lock in is aria-disabled, focusable, with the visible reason as its aria-describedby', async () => {
    const { el } = await setup({ owned: 2 });
    const button = el.querySelector<HTMLButtonElement>('button.lock-in')!;
    expect(text(button)).toBe('Lock in');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
    const reason = el.querySelector('.reason')!;
    expect(text(reason)).toBe('Lock in needs every card available: 1 card short');
    expect(button.getAttribute('aria-describedby')).toBe(reason.id);
    button.click();
    expect(dialog()).toBeNull();
  });

  it('SPEC-008 AC 23 / SHARE-021 / SHARE-029 confirm Lock in: dialog text, "Locking in…", badge state, snack "Kennen Tempo is locked in."', async () => {
    const { el, fixture } = await setup({ owned: 6 });
    const button = el.querySelector<HTMLButtonElement>('button.lock-in')!;
    expect(button.getAttribute('aria-disabled')).not.toBe('true');
    expect(el.querySelector('.reason')).toBeNull();
    button.click();
    await settle(fixture);
    expect(text(dialog()!.querySelector('h2'))).toBe("Lock in 'Kennen Tempo'?");
    expect(text(dialog())).toContain("Its cards won't count toward your other decks until you unlock or delete it.");
    expect(text(dialog())).toContain('1 other deck uses some of these cards: Kennen Control');
    expect(document.activeElement?.classList).toContain('confirm');
    let release!: () => void;
    const locks = TestBed.inject(DeckLocks);
    const real = locks.lockDeck.bind(locks);
    vi.spyOn(locks, 'lockDeck').mockImplementation((d) => new Promise<void>((r) => (release = () => void real(d).then(r))));
    dialog()!.querySelector<HTMLButtonElement>('button.confirm')!.click();
    await settle(fixture);
    const saving = el.querySelector<HTMLButtonElement>('button.lock-in')!;
    expect(text(saving)).toBe('Locking in…');
    expect(saving.getAttribute('aria-disabled')).toBe('true');
    release();
    await vi.waitFor(async () => {
      await settle(fixture);
      expect(el.querySelector('button.unlock')).not.toBeNull();
    });
    expect(snack()).toContain('Kennen Tempo is locked in.');
    expect(snack()).not.toContain('Undo');
    const stored = JSON.parse(backend.get(STORAGE_KEYS.locks)!) as StoredDeckLocks;
    expect(stored.locks.map((l) => l.deckId)).toEqual([TEMPO_ID]);
  });

  it('SHARE-029 (d) Cancel / Escape in the confirmation changes nothing', async () => {
    const { el, fixture } = await setup({ owned: 3 });
    el.querySelector<HTMLButtonElement>('button.lock-in')!.click();
    await settle(fixture);
    Array.from(dialog()!.querySelectorAll('button')).find((b) => text(b) === 'Cancel')!.click();
    await settle(fixture);
    expect(backend.get(STORAGE_KEYS.locks)).toBeNull();
    expect(el.querySelector('button.lock-in')).not.toBeNull();
  });

  it('SPEC-008 AC 23 / SHARE-023 Unlock: at once, no confirmation, snack with "Its cards count toward your other decks again." and no Undo', async () => {
    const { el, fixture } = await setup({ owned: 3, locks: lock(TEMPO_ID) });
    const unlock = el.querySelector<HTMLButtonElement>('button.unlock')!;
    expect(text(unlock)).toBe('Unlock');
    unlock.click();
    await vi.waitFor(async () => {
      await settle(fixture);
      expect(el.querySelector('button.lock-in')).not.toBeNull();
    });
    expect(dialog()).toBeNull();
    expect(snack()).toContain('Kennen Tempo is unlocked. Its cards count toward your other decks again.');
    expect(snack()).not.toContain('Undo');
    expect((JSON.parse(backend.get(STORAGE_KEYS.locks)!) as StoredDeckLocks).locks).toEqual([]);
  });

  it('SPEC-008 AC 23 / SHARE-063 a failed save: "Couldn\'t save the lock. Try again." and nothing changes', async () => {
    const { el, fixture } = await setup({ owned: 3 });
    vi.spyOn(stores.locks, 'save').mockRejectedValue(new Error('quota'));
    el.querySelector<HTMLButtonElement>('button.lock-in')!.click();
    await settle(fixture);
    dialog()!.querySelector<HTMLButtonElement>('button.confirm')!.click();
    await vi.waitFor(async () => {
      await settle(fixture);
      expect(snack()).toContain("Couldn't save the lock. Try again.");
    });
    expect(backend.get(STORAGE_KEYS.locks)).toBeNull();
    expect(text(el.querySelector('button.lock-in'))).toBe('Lock in');
  });

  it('SPEC-008 AC 19 / SHARE-053 (c) ownership unavailable, locked: Unlock stays enabled and works', async () => {
    const { el, fixture } = await setup({ owned: 3, locks: lock(TEMPO_ID), collection: 'unreadable' });
    const unlock = el.querySelector<HTMLButtonElement>('button.unlock')!;
    expect(unlock.getAttribute('aria-disabled')).not.toBe('true');
    unlock.click();
    await vi.waitFor(async () => {
      await settle(fixture);
      expect(el.querySelector('button.lock-in')).not.toBeNull();
    });
    expect(text(el.querySelector('.reason'))).toBe('Ownership unavailable');
  });

  it('SPEC-008 AC 13 / SHARE-061 lock store unreadable: Lock in disabled "Locked decks could not be read"; the record is unchanged', async () => {
    const { el } = await setup({ owned: 3, locks: 'newer' });
    const button = el.querySelector<HTMLButtonElement>('button.lock-in')!;
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(text(el.querySelector('.reason'))).toBe('Locked decks could not be read');
    expect(JSON.parse(backend.get(STORAGE_KEYS.locks)!).schemaVersion).toBe(3);
  });

  it('SPEC-008 AC 15 / SHARE-020 an empty deck: "Lock in needs at least one card"; read-only: "This deck is read-only"', async () => {
    const empty = await setup({ owned: 3, tempo: { main: [] } });
    expect(text(empty.el.querySelector('.reason'))).toBe('Lock in needs at least one card');
    TestBed.resetTestingModule();
    const ro = await setup({ owned: 3, tempo: { schemaVersion: 2 as unknown as 1 } });
    expect(text(ro.el.querySelector('.reason'))).toBe('This deck is read-only');
  });

  describe('H-675: the icon toggle answers every blocked reason with "Cannot lock. <reason>"', () => {
    const toggle = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button.lock-toggle')!;
    const press = async (fixture: { whenStable(): Promise<unknown>; detectChanges(): void }, el: HTMLElement) => {
      toggle(el).click();
      await settle(fixture);
    };

    it('H-675 AC 40 read-only deck: notice "Cannot lock. This deck is read-only.", nothing locked', async () => {
      const { el, fixture } = await setup({ owned: 3, variant: 'icon', tempo: { schemaVersion: 2 as unknown as 1 } });
      expect(toggle(el).getAttribute('aria-disabled')).toBe('true'); // SHARE-097 (c): stays aria-disabled and focusable
      await press(fixture, el);
      expect(snack()).toBe("Can't lock. This deck is read-only.");
      expect(dialog()).toBeNull();
      expect(toggle(el).getAttribute('aria-pressed')).toBe('false');
      expect(backend.get(STORAGE_KEYS.locks)).toBeNull();
    });

    it('H-675 AC 40 ownership unavailable: notice "Cannot lock. Ownership unavailable", nothing locked', async () => {
      const { el, fixture } = await setup({ owned: 3, variant: 'icon', collection: 'unreadable' });
      expect(toggle(el).getAttribute('aria-disabled')).toBe('true'); // SHARE-097 (c): stays aria-disabled and focusable
      await press(fixture, el);
      expect(snack()).toBe("Can't lock. Ownership unavailable.");
      expect(dialog()).toBeNull();
      expect(backend.get(STORAGE_KEYS.locks)).toBeNull();
    });

    it('H-675 AC 40 locks unreadable: notice "Cannot lock. Locked decks could not be read", the record is unchanged', async () => {
      const { el, fixture } = await setup({ owned: 3, variant: 'icon', locks: 'newer' });
      expect(toggle(el).getAttribute('aria-disabled')).toBe('true'); // SHARE-097 (c): stays aria-disabled and focusable
      await press(fixture, el);
      expect(snack()).toBe("Can't lock. Locked decks could not be read.");
      expect(dialog()).toBeNull();
      expect(JSON.parse(backend.get(STORAGE_KEYS.locks)!).schemaVersion).toBe(3);
    });

    it('H-675 AC 40 no cards: notice "Cannot lock. Lock in needs at least one card", nothing locked', async () => {
      const { el, fixture } = await setup({ owned: 3, variant: 'icon', tempo: { main: [] } });
      expect(toggle(el).getAttribute('aria-disabled')).toBe('true'); // SHARE-097 (c): stays aria-disabled and focusable
      await press(fixture, el);
      expect(snack()).toBe("Can't lock. Lock in needs at least one card.");
      expect(dialog()).toBeNull();
      expect(backend.get(STORAGE_KEYS.locks)).toBeNull();
    });

    it('H-675 AC 40 missing cards keeps H-670: "Cannot lock. Missing 3 cards."', async () => {
      const { el, fixture } = await setup({ owned: 0, variant: 'icon' });
      await press(fixture, el);
      expect(snack()).toBe("Can't lock. Missing 3 cards.");
    });

    it('H-675 AC 41 saving: aria-disabled and a press shows no notice and does nothing', async () => {
      const { el, fixture } = await setup({ owned: 3, variant: 'icon' });
      toggle(el).click();
      await settle(fixture);
      const confirm = dialog()!.querySelector<HTMLButtonElement>('button.confirm')!;
      let release!: () => void;
      vi.spyOn(TestBed.inject(DeckLocks), 'lockDeck').mockImplementation(() => new Promise<void>((r) => (release = r)));
      confirm.click();
      await settle(fixture);
      expect(toggle(el).getAttribute('aria-disabled')).toBe('true');
      document.querySelectorAll('mat-snack-bar-container').forEach((n) => n.remove());
      toggle(el).click();
      await settle(fixture);
      expect(snack()).toBe('');
      release();
      await settle(fixture);
    });
  });
});
