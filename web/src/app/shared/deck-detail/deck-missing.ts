import { Component, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import type { DeckOwnershipView } from '../../core/decks';
import { Icon } from '../icon';
import { DETAIL_TEXT, cardsLine, copiesLine, excludedLine, missingCopies, missingGroups } from './detail-view';

/** OWN-052 / OWN-053: the two copy actions. */
export type CopyMode = 'sections' | 'merged';

let nextId = 0;

/**
 * The deck summary and missing list (SPEC-005 OWN-050…053; Decks Components §11 `app-deck-summary`): in the Missing tab
 * of the desktop panel (OWN-111 (c), counts shown, **no percentage**) and under the header below 64rem (OWN-051, counts
 * left to the header). The missing list is grouped by section; below 64rem it is collapsed past 10 lines (the panel
 * scrolls instead). "Copy missing list" is a split button with "Copy as one list" (OWN-053); hidden when nothing is
 * missing or ownership is unavailable (OWN-116).
 */
@Component({
  selector: 'app-deck-missing',
  imports: [Icon, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, NgTemplateOutlet],
  template: `
    @let v = view();
    @if (!v.ownershipAvailable) {
      <p class="muted">{{ text.ownershipUnavailable }}</p>
    } @else {
      @if (showCounts()) {
        <div class="counts">
          @if (v.summary.copiesRequired === 0) {
            <p class="copies">{{ text.noCards }}</p>
          } @else {
            <p class="copies">{{ copies() }}</p>
            <p class="cards">{{ cards() }}</p>
            @if (excluded(); as x) {
              <p class="muted small">{{ x }}</p>
            }
          }
        </div>
      }
      @if (v.summary.copiesRequired > 0) {
        @if (v.missing.length === 0) {
          <!-- H-466: nothing missing → a plain "Missing" heading, no "· 0 copies". -->
          <h2 class="missing-title">Missing</h2>
          <p class="all"><app-icon name="check_circle" />{{ text.allAvailable }}</p>
        } @else {
          @if (showCopy() && copyPlacement() === 'heading') {
            <!-- H-669 (RJ 2026-11-26): on desktop the split button sits on the Missing heading row, right-aligned. -->
            <div class="missing-head">
              <h2 class="missing-title">Missing <span class="muted">· {{ total() }} {{ total() === 1 ? 'copy' : 'copies' }}</span></h2>
              <ng-container [ngTemplateOutlet]="copyButton" />
            </div>
          } @else {
            <h2 class="missing-title">Missing <span class="muted">· {{ total() }} {{ total() === 1 ? 'copy' : 'copies' }}</span></h2>
          }
          <div [id]="listId">
            @for (g of shownGroups(); track g.zone) {
              <h3>{{ g.label }}</h3>
              <ul class="lines">
                @for (m of g.lines; track m.cardKey) {
                  <li><span class="qty">{{ m.missing }}</span> {{ m.name }}</li>
                }
              </ul>
            }
          </div>
          @if (collapsible() && lineCount() > 10) {
            <button type="button" class="text-button" [attr.aria-expanded]="expanded()" [attr.aria-controls]="listId" (click)="expanded.set(!expanded())">
              {{ expanded() ? 'Show fewer' : 'Show all ' + lineCount() + ' lines' }}
            </button>
          }
          @if (showCopy() && copyPlacement() === 'end') {
            <ng-container [ngTemplateOutlet]="copyButton" />
          }
        }
      }
    }
    <!-- OWN-052 / OWN-053: one copy control, placed at the end (phone, tablet) or on the heading row (desktop, H-669). -->
    <ng-template #copyButton>
      <div class="copy" [class.copy--head]="copyPlacement() === 'heading'">
        <button matButton="outlined" type="button" class="copy-main" (click)="copyRequested.emit('sections')">
          <app-icon name="content_copy" />Copy missing list
        </button>
        <button matIconButton type="button" class="copy-more" aria-label="More copy options" [matMenuTriggerFor]="copyMenu">
          <app-icon name="expand_more" />
        </button>
        <mat-menu #copyMenu="matMenu" xPosition="before">
          <button mat-menu-item type="button" (click)="copyRequested.emit('merged')">Copy as one list</button>
        </mat-menu>
      </div>
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
    }
    p {
      margin: 0;
      font-size: var(--font-size-sm);
    }
    .counts {
      display: grid;
      gap: 2px;
      margin-bottom: var(--space-4);
    }
    .copies {
      font-size: var(--font-size-md);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .muted {
      color: var(--color-text-muted);
    }
    .small {
      font-size: var(--font-size-xs);
    }
    .missing-title {
      margin: 0 0 var(--space-2);
      font-size: var(--font-size-md);
    }
    .missing-title .muted {
      font-weight: 400;
    }
    h3 {
      margin: var(--space-3) 0 var(--space-1);
      font-family: var(--font-sans);
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: 0;
      color: var(--color-text-muted);
    }
    .lines {
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: var(--font-size-sm);
    }
    .lines li {
      padding: 1px 0;
    }
    .qty {
      display: inline-block;
      min-width: 2ch;
      margin-inline-end: var(--space-1);
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .all {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-accent-text);
      font-weight: 600;
    }
    .text-button {
      min-height: 44px;
      margin-top: var(--space-1);
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-accent-text);
      font: inherit;
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
    }
    .text-button:hover {
      text-decoration: underline;
    }
    .copy {
      display: flex;
      align-items: center;
      margin-top: var(--space-3);
    }
    .missing-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }
    .missing-head .missing-title {
      margin: 0;
    }
    .copy--head {
      flex: none;
      margin-top: 0;
      margin-inline-start: auto;
    }
    .copy-main {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      --mat-button-outlined-container-shape: var(--radius-md) 0 0 var(--radius-md);
    }
    .copy-main app-icon {
      margin-inline-end: var(--space-2);
      font-size: 18px;
    }
    .copy-more {
      width: 40px;
      height: 40px;
      padding: 8px;
      margin-inline-start: -1px;
      border: 1px solid var(--color-border-strong);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      font-size: 24px;
    }
    /* H-461 (A13): both halves 44px on phones / touch (this is the copy button Deck detail shows at 390). */
    @media (pointer: coarse), (max-width: 39.99rem) {
      .copy-main {
        --mat-button-outlined-container-height: 44px;
      }
      .copy-more {
        width: 44px;
        height: 44px;
        padding: 10px;
      }
    }
  `,
})
export class DeckMissing {
  readonly view = input.required<DeckOwnershipView>();
  /** Show the copies and cards lines (the Missing tab); below 64rem the header already carries them. */
  readonly showCounts = input(true);
  readonly showCopy = input(true);
  /** Where the copy control goes: after the list (phone and tablet) or on the heading row, right-aligned (desktop, H-669). */
  readonly copyPlacement = input<'heading' | 'end'>('end');
  /** Collapse the list past 10 lines (below 64rem, OWN-051). */
  readonly collapsible = input(false);
  readonly copyRequested = output<CopyMode>();

  protected readonly text = DETAIL_TEXT;
  protected readonly listId = `missing-list-${++nextId}`;
  protected readonly expanded = signal(false);
  protected readonly copies = computed(() => copiesLine(this.view()));
  protected readonly cards = computed(() => cardsLine(this.view()));
  protected readonly excluded = computed(() => excludedLine(this.view()));
  protected readonly total = computed(() => missingCopies(this.view()));
  protected readonly lineCount = computed(() => this.view().missing.length);
  protected readonly shownGroups = computed(() => {
    const groups = missingGroups(this.view());
    if (!this.collapsible() || this.expanded() || this.lineCount() <= 10) return groups;
    let left = 10;
    return groups
      .map((g) => {
        const lines = g.lines.slice(0, Math.max(0, left));
        left -= lines.length;
        return { ...g, lines };
      })
      .filter((g) => g.lines.length > 0);
  });
}
