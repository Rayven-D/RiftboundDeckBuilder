import { Component, computed, inject, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Icon } from '../../shared/icon';
import {
  DeckListQuery,
  LOCK_OPTIONS,
  OWN_OPTIONS,
  type OwnOption,
  SOURCE_OPTIONS,
  clearFilters,
  legalityOptions,
} from '../../shared/deck/deck-list';
import { OWNERSHIP_OPTION_LABEL } from '../../shared/deck/deck-status-chip';

export interface DeckFiltersDialogData {
  readonly query: DeckListQuery;
  readonly formatName: string;
  /** Decks the draft query would show ("Show <n> decks"). */
  readonly count: (q: DeckListQuery) => number;
  /** H-468 (7): the Ownership option counts for the draft query, as the desktop chips show them (OWN-102). */
  readonly ownCounts: (q: DeckListQuery) => Record<OwnOption | 'all', number>;
  /** OWN-105 (f): ownership options can't be chosen while ownership is unavailable. */
  readonly ownershipDisabled: boolean;
  /** SHARE-061: the Lock filter is disabled while the lock store is unreadable. */
  readonly lockDisabled: boolean;
}

/**
 * OWN-105 (a) phone Filters ([[Decks Components]] §4): a full-screen dialog with Ownership (with live counts, H-468 (7)),
 * Lock, Legality and Source as native radio groups (44 px rows), and a sticky footer with "Clear filters" and "Show <n> decks" (live
 * count). Closes with the chosen query on Show, nothing on Close / Escape. The search and sort stay on the toolbar.
 */
@Component({
  selector: 'app-deck-filters-dialog',
  imports: [MatButton, MatIconButton, Icon],
  template: `
    <div class="head">
      <h2 id="deck-filters-title">Filters</h2>
      <button matIconButton type="button" class="close" aria-label="Close" (click)="ref.close()">
        <app-icon name="close" />
      </button>
    </div>
    <div class="body">
      <fieldset [disabled]="data.ownershipDisabled">
        <legend>Ownership</legend>
        @if (data.ownershipDisabled) {
          <p class="hint">Not available while ownership is unavailable</p>
        }
        <!-- H-468 (7): each option shows its deck count, as the desktop chips do; heard as "Ready to build, 1 deck". -->
        @let n = ownCounts();
        <label
          ><input type="radio" name="own" [checked]="draft().own === null" (change)="set({ own: null })" />All
          <span class="n"><span class="visually-hidden">, </span>{{ n.all }}<span class="visually-hidden">{{ decks(n.all) }}</span></span></label
        >
        @for (o of own; track o) {
          <label
            ><input type="radio" name="own" [checked]="draft().own === o" (change)="set({ own: o })" />{{ ownLabel[o] }}
            <span class="n"><span class="visually-hidden">, </span>{{ n[o] }}<span class="visually-hidden">{{ decks(n[o]) }}</span></span></label
          >
        }
      </fieldset>
      <fieldset [disabled]="data.lockDisabled">
        <legend>Lock</legend>
        @for (o of lock; track o.label) {
          <label
            ><input type="radio" name="lock" [checked]="draft().lock === o.value" (change)="set({ lock: o.value })" />{{
              o.label
            }}</label
          >
        }
      </fieldset>
      <fieldset>
        <legend>Legality</legend>
        <label
          ><input type="radio" name="legality" [checked]="draft().legality === null" (change)="set({ legality: null })" />Any</label
        >
        @for (o of legality; track o.value) {
          <label
            ><input
              type="radio"
              name="legality"
              [checked]="draft().legality === o.value"
              (change)="set({ legality: o.value })"
            />{{ o.label }}</label
          >
        }
      </fieldset>
      <fieldset>
        <legend>Source</legend>
        <label><input type="radio" name="source" [checked]="draft().source === null" (change)="set({ source: null })" />Any</label>
        @for (o of source; track o.value) {
          <label
            ><input type="radio" name="source" [checked]="draft().source === o.value" (change)="set({ source: o.value })" />{{
              o.label
            }}</label
          >
        }
      </fieldset>
    </div>
    <div class="foot">
      <button matButton type="button" (click)="clear()">Clear filters</button>
      <button matButton="filled" type="button" class="show" (click)="ref.close(draft())">{{ showLabel() }}</button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--color-surface);
      color: var(--color-text);
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    h2 {
      margin: 0;
      font-size: var(--font-size-lg);
    }
    .close {
      width: 44px;
      height: 44px;
    }
    .body {
      flex: 1;
      overflow: auto;
      padding: var(--space-3) var(--space-4);
    }
    fieldset {
      margin: 0 0 var(--space-4);
      padding: 0;
      border: 0;
    }
    fieldset:disabled label {
      opacity: 0.55;
    }
    legend {
      margin-bottom: var(--space-1);
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-muted);
    }
    label {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 44px;
      font-size: var(--font-size-md);
    }
    input {
      width: 20px;
      height: 20px;
      margin: 0;
      accent-color: var(--color-accent);
    }
    .n {
      margin-left: calc(-1 * var(--space-2));
      font-variant-numeric: tabular-nums;
      color: var(--color-text-muted);
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .hint {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .foot {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom));
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
    }
    .foot button {
      min-height: 44px;
    }
  `,
})
export class DeckFiltersDialog {
  protected readonly data = inject<DeckFiltersDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<DeckFiltersDialog, DeckListQuery>>(MatDialogRef);
  protected readonly draft = signal<DeckListQuery>(this.data.query);
  protected readonly own = OWN_OPTIONS;
  protected readonly ownLabel = OWNERSHIP_OPTION_LABEL;
  protected readonly lock = LOCK_OPTIONS;
  protected readonly legality = legalityOptions(this.data.formatName);
  protected readonly source = SOURCE_OPTIONS;
  protected readonly ownCounts = computed(() => this.data.ownCounts(this.draft()));
  protected readonly showLabel = computed(() => {
    const n = this.data.count(this.draft());
    return `Show ${n} ${n === 1 ? 'deck' : 'decks'}`;
  });

  protected decks(n: number): string {
    return n === 1 ? ' deck' : ' decks';
  }

  protected set(patch: Partial<DeckListQuery>): void {
    this.draft.update((q) => ({ ...q, ...patch }));
  }

  /** "Clear filters" clears the four filters here; the search stays (it is on the toolbar). */
  protected clear(): void {
    const q = this.draft();
    this.draft.set({ ...clearFilters(q), text: q.text });
  }
}
