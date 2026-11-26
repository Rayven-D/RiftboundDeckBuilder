import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DeckTileSummary, formatIsoDate } from '../../core/decks';
import { DeckMark } from '../deck-mark';
import { Icon } from '../icon';
import { CardArt } from './card-art';
import { localDateText } from './local-date';
import { DeckStatusChip } from './deck-status-chip';
import { LockBadge } from './lock-badge';
import type { OwnershipState } from './ownership';

let nextId = 0;

/** OWN-103 ban flag lines: "1 banned card" / "3 banned cards"; "1 card banned from Dec 15, 2026". */
export function banFlagLines(bans: DeckTileSummary['bans']): { kind: 'banned' | 'upcoming'; text: string }[] {
  if (!bans) return [];
  const out: { kind: 'banned' | 'upcoming'; text: string }[] = [];
  if (bans.banned > 0) out.push({ kind: 'banned', text: `${bans.banned} banned ${bans.banned === 1 ? 'card' : 'cards'}` });
  if (bans.upcoming > 0 && bans.upcomingFrom) {
    const n = bans.upcoming;
    out.push({ kind: 'upcoming', text: `${n} ${n === 1 ? 'card' : 'cards'} banned from ${formatIsoDate(bans.upcomingFrom)}` });
  }
  return out;
}

/** OWN-100 (b), (e), (f): the Legend art's treatment from the deck fill; no value → full colour, no fill. */
export function deckArtState(fill: number | null): { state: OwnershipState; fill: number } {
  if (fill === null || fill >= 1) return { state: 'full', fill: 1 };
  if (fill <= 0) return { state: 'none', fill: 0 };
  return { state: 'partial', fill };
}

/**
 * SPEC-005 OWN-002 deck tile ([[Decks Components]] §2): one link to `/decks/:id` (RJ 2026-11-25). Everything comes
 * from the engine's `DeckTileSummary` (OWN-073); nothing is recomputed here.
 * - **Art** (OWN-100, OWN-082): the Legend's thumbnail, decorative, lazy, filled left to right by the whole deck
 *   (`completionFill`, A of R), with the deck mark when there is no Legend. Ownership unavailable or R = 0: no fill.
 * - **Completion %** (OWN-101): `completionPercent` under the art, "51%", 16px 600 like the deck name (RJ 2026-11-26,
 *   H-392 (c)). The visible % is aria-hidden; its words "51 percent of copies available" ("… locked in" in a locked
 *   deck) sit in the details after the copies line, so the link's description carries them (H-465 (2)). Nothing
 *   when null.
 * - name + "Read-only" tag (DECK-091), source line (OWN-003), player (OWN-104), the ownership chip, the lock badge
 *   ("Locked" / "Locked · 2 cards short", SHARE-041, no date; kept while ownership is unavailable, SHARE-053 (b))
 *   and the copies line (OWN-102). A locked complete deck (group `locked`) has no ownership chip, only the badge;
 *   a short locked deck shows its group chip (Partly / None available) and the short badge. Then the legality
 *   label (OWN-004), ban flag (OWN-103) and "Updated <date>" (OWN-090).
 * Screen readers hear "Kennen Tempo, link" then the details (name = `aria-labelledby`, rest = `aria-describedby`).
 */
@Component({
  selector: 'app-deck-tile',
  imports: [RouterLink, CardArt, DeckMark, DeckStatusChip, LockBadge, Icon],
  template: `
    @let s = summary();
    <a
      class="deck-tile lift"
      [routerLink]="['/decks', s.deckId]"
      [attr.aria-labelledby]="nameId"
      [attr.aria-describedby]="detailsId"
    >
      <div class="art-col">
        @if (s.legend; as legend) {
          <app-card-art
            class="art"
            [class.art--dim]="art().state !== 'full'"
            [name]="legend.name"
            [imageUrl]="legend.imageUrl"
            [state]="art().state"
            [fill]="art().fill"
            [eager]="eager()"
            decorative
            animateChange
          />
        } @else {
          <div class="mark-box"><app-deck-mark class="mark" /></div>
        }
        @if (s.completionPercent !== null) {
          <!-- H-465 (2): the spoken form sits in the details (after the copies line), inside aria-describedby. -->
          <p class="percent" aria-hidden="true">{{ s.completionPercent }}%</p>
        }
      </div>
      <div class="body">
        <h3 class="name" [id]="nameId">
          <span class="name-text">{{ s.name }}</span>
          @if (s.readOnly) {
            <span class="tag">Read-only</span>
          }
        </h3>
        <div class="details" [id]="detailsId">
          <p class="source" [title]="s.sourceLine">{{ s.sourceLine }}</p>
          @if (s.pilot) {
            <p class="pilot">{{ s.pilot }}</p>
          }
          <p class="ownership">
            <!-- RJ 2026-11-25: the lock is its own badge next to the ownership chip (no date on the tile). -->
            <app-deck-status-chip [filter]="s.ownershipFilter" />
            <app-lock-badge [label]="s.lockBadge" [showDate]="false" />
            <span class="copies">{{ s.ownershipLine }}</span>
          </p>
          @if (s.completionPercent !== null) {
            <!-- H-465 (2): the % in words, inside the link's description, after the copies line. -->
            <p class="visually-hidden percent-text">{{ percentText() }}</p>
          }
          <p class="legality" [class]="'legality legality--' + s.legalityVerdict">
            @if (s.legalityVerdict === 'illegal') {
              <app-icon name="block" />
            } @else if (s.legalityVerdict === 'incomplete') {
              <app-icon name="help" />
            }
            <span>{{ s.legalityLabel }}</span>
          </p>
          @for (b of bans(); track b.kind) {
            <p class="ban" [class]="'ban ban--' + b.kind">
              <app-icon [name]="b.kind === 'banned' ? 'block' : 'schedule'" /><span>{{ b.text }}</span>
            </p>
          }
          <p class="updated">Updated {{ updated() }}</p>
        </div>
      </div>
    </a>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .deck-tile {
      display: grid;
      grid-template-columns: 6rem minmax(0, 1fr);
      gap: var(--space-4);
      height: 100%;
      box-sizing: border-box;
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-rest);
      color: var(--color-text);
      text-decoration: none;
    }
    @media (hover: hover) and (pointer: fine) {
      .deck-tile:hover {
        border-color: var(--color-border-strong);
      }
    }
    /* H-460 (WCAG 2.4.7): the Decks grid li has content-visibility: auto (OWN-084), whose paint
     * containment clips anything outside the li, and this link fills the li. So the ring is drawn
     * inside: offset -2px lays it over the 1px border and the first 1px of padding, following the
     * --radius-lg corners. Its outer edge meets the page and its inner edge the tile surface; teal on
     * bg / surface is 5.05 / 5.47 light and 8.90 / 7.78 dark (Brief H-139), all >= 3:1. */
    .deck-tile:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: -2px;
    }
    .art-col {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      align-items: stretch;
    }
    /* Darkened art keeps a visible edge on a dark page (Decks Components §0 token fix). */
    .art--dim ::ng-deep .art {
      outline: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
    }
    .mark-box {
      display: grid;
      place-items: center;
      aspect-ratio: var(--card-aspect-ratio);
      border-radius: var(--radius-md);
      background: var(--color-surface-raised);
    }
    .mark {
      width: 60%;
    }
    /* RJ 2026-11-26 (H-392 (c)): as loud as the deck name, not louder: 16px 600 in the name's font. */
    .percent {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      line-height: 1.1;
      text-align: center;
    }
    .body {
      min-width: 0;
    }
    .name {
      margin: 0;
      font-size: var(--font-size-md);
      font-weight: 600;
      line-height: 1.3;
    }
    .name-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .tag {
      display: inline-block;
      margin-top: var(--space-1);
      padding: 0 var(--space-1);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
      font-weight: 400;
      color: var(--color-text-muted);
    }
    .details p {
      margin: var(--space-1) 0 0;
    }
    .source,
    .pilot,
    .updated {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .source {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ownership {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-2);
      padding-top: var(--space-1);
    }
    .ownership app-lock-badge {
      --lock-badge-font-size: var(--font-size-xs);
      --lock-badge-icon-size: 14px;
      line-height: 1.4;
      white-space: nowrap;
    }
    .copies {
      min-width: 0;
      font-size: var(--font-size-sm);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    .legality,
    .ban {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-sm);
    }
    .legality {
      color: var(--color-text-muted);
    }
    .legality app-icon,
    .ban app-icon {
      flex: none;
      font-size: 14px;
    }
    .legality--illegal app-icon,
    .ban--banned {
      color: var(--color-danger);
    }
    .ban--upcoming {
      color: var(--color-warning);
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    @media (max-width: 40rem) {
      .deck-tile {
        grid-template-columns: 4.5rem minmax(0, 1fr);
        gap: var(--space-3);
        padding: var(--space-3);
      }
      /* H-468 (8) / H-478: on phones the copies line is always its own line under the chip / lock badge, so locked
       * and unlocked tiles share one rhythm and "66 of 66 copies locked in" never competes with the badge for width. */
      .copies {
        flex-basis: 100%;
      }
    }
    @media (forced-colors: active) {
      .deck-tile {
        border: 1px solid CanvasText;
      }
    }
  `,
})
export class DeckTile {
  readonly summary = input.required<DeckTileSummary>();
  /** First screen of the list: load the Legend art eagerly (it may be the LCP image). */
  readonly eager = input(false, { transform: booleanAttribute });

  protected readonly nameId = `deck-tile-name-${++nextId}`;
  protected readonly detailsId = `deck-tile-details-${nextId}`;
  protected readonly art = computed(() => deckArtState(this.summary().completionFill));
  protected readonly bans = computed(() => banFlagLines(this.summary().bans));
  protected readonly updated = computed(() => localDateText(this.summary().updatedAt) ?? this.summary().updatedAt);
  protected readonly percentText = computed(() => {
    const s = this.summary();
    return `${s.completionPercent} percent of copies ${s.lockBadge ? 'locked in' : 'available'}`;
  });
}
