import { Component, computed, effect, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OwnershipCard } from '../../core/decks';
import { CardArt } from '../deck/card-art';
import { Icon } from '../icon';
import { StatusLabel, StatusVariant } from '../status-label';
import { NameLockAction, NameLockContext } from './name-lock-action';
import {
  DETAIL_TEXT,
  ZONE_LABEL,
  allocationLine,
  banText,
  breakdownLines,
  cardFacts,
  labelParts,
  otherUseText,
  printingRowLabel,
  printingRowText,
} from './detail-view';

/**
 * The card content of SPEC-005 OWN-112, shown in the Card tab of the desktop panel (OWN-111) and in the card dialog
 * below 64rem (OWN-113), in this order: (a) art with its fill, (b) ban label, (c) zone and count label with the
 * per-zone allocation, (d) This deck (SHARE-043 word for word), (e) Your printings (OWN-041, rows link to Collection,
 * OWN-044), (f) Other decks using this card (each a link to that deck), (g) Card facts (OWN-014, OWN-060). It never
 * shows the completion percentage (OWN-101 (d)). H-665: under "This deck", the per-name "Lock these copies" /
 * "Unlock these copies" control (SHARE-094 (a), `app-name-lock-action`), the only place it appears.
 */
@Component({
  selector: 'app-deck-card-content',
  imports: [CardArt, StatusLabel, Icon, RouterLink, NameLockAction],
  template: `
    @let c = card();
    @if (headingLevel() === 2) {
      <h2 class="title" [id]="titleId()">{{ c.name }}</h2>
    }
    <div class="body" [class.body--wide]="wide()">
      <div class="art-col">
        <div class="art-frame" [class.art-frame--dim]="c.state !== 'full'">
          <app-card-art [name]="c.name" [state]="c.state" [fill]="c.fill" [imageUrl]="artUrl()" [landscape]="landscape()" animateChange />
        </div>
        @if (ban(); as b) {
          <app-status-label class="ban" [variant]="b.variant" [text]="b.text" />
        }
        @if (c.flags.includes('preview')) {
          <span class="flag">Preview</span>
        }
      </div>
      <div class="info">
        @if (unknown()) {
          <p class="lead">{{ text.unknownCard }}</p>
        } @else {
          @if (!ownershipAvailable()) {
            <p class="lead lead--plain">{{ zoneLabel() }}</p>
            <p class="muted">{{ text.ownershipUnavailable }}</p>
          } @else {
            <div class="section">
              <p class="lead">{{ zoneLabel() }} · {{ parts().count }}</p>
              @if (splitLine(); as split) {
                <p class="muted">{{ split }}</p>
              }
            </div>
            <section class="section">
              <h3>This deck</h3>
              <ul class="plain lines">
                @for (line of breakdown(); track $index) {
                  <li>{{ line }}</li>
                }
              </ul>
              @if (lockContext(); as ctx) {
                <!-- H-665 (SHARE-094 (a)): the per-name Lock / Unlock control lives here only. -->
                <app-name-lock-action [card]="c" [context]="ctx" />
              }
            </section>
            <section class="section">
              <h3>Your printings</h3>
              @if (c.printingsOwned.length === 0) {
                <p class="muted">{{ text.notOwned }}</p>
              } @else {
                <p class="group">Counts toward this deck</p>
                <ul class="plain links">
                  @for (row of c.printingsOwned; track $index) {
                    <li>
                      <a
                        routerLink="/collection"
                        [queryParams]="{ q: c.name }"
                        [attr.aria-label]="rowLabel(row)"
                        (click)="navigated.emit()"
                        ><span class="link-text">{{ rowText(row) }}</span><app-icon name="chevron_right" class="chev" aria-hidden="true"
                      /></a>
                    </li>
                  }
                </ul>
              }
              @if (c.excludedPrintings.length > 0) {
                <p class="group">Owned · excluded from decks</p>
                <ul class="plain links links--excluded">
                  @for (row of c.excludedPrintings; track $index) {
                    <li>
                      <a
                        routerLink="/collection"
                        [queryParams]="{ q: c.name }"
                        [attr.aria-label]="rowLabel(row)"
                        (click)="navigated.emit()"
                        ><span class="link-text">{{ rowText(row) }}</span><app-icon name="chevron_right" class="chev" aria-hidden="true"
                      /></a>
                    </li>
                  }
                </ul>
              }
            </section>
            <section class="section">
              <h3>Other decks using this card</h3>
              @if (c.otherUses.length === 0) {
                <p class="muted">{{ text.noOtherDeck }}</p>
              } @else {
                <ul class="plain links">
                  @for (use of c.otherUses; track use.deckId) {
                    <li>
                      <a [routerLink]="['/decks', use.deckId]" (click)="navigated.emit()"
                        ><span class="link-text"
                          >@if (use.locked) {
                            <app-icon name="lock" class="lock" />
                          }{{ useText(use) }}</span
                        ><app-icon name="chevron_right" class="chev" aria-hidden="true"
                      /></a>
                    </li>
                  }
                </ul>
              }
            </section>
          }
          @if (facts(); as f) {
            <section class="section">
              <h3>Card</h3>
              <p>{{ f.typeLine }}</p>
              <p>{{ f.domains }}</p>
              @if (f.stats) {
                <p>{{ f.stats }}</p>
              }
              @if (f.text) {
                <p class="rules">{{ f.text }}</p>
              }
            </section>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .title {
      margin: 0 0 var(--space-3);
      font-size: var(--font-size-lg);
      line-height: 1.2;
    }
    .body {
      display: grid;
      gap: var(--space-4);
    }
    /* In the dialog at tablet width: art beside the facts. */
    .body--wide {
      grid-template-columns: 14rem minmax(0, 1fr);
      align-items: start;
    }
    @media (max-width: 40rem) {
      .body--wide {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    .art-col {
      display: grid;
      justify-items: center;
      gap: var(--space-2);
    }
    .art-frame {
      width: min(100%, 14rem);
      border-radius: var(--radius-md);
    }
    .art-frame--dim {
      outline: 1px solid var(--color-border-strong);
    }
    .flag {
      padding: 0 var(--space-1);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-xs);
    }
    .section + .section {
      margin-top: var(--space-4);
    }
    h3 {
      margin: 0 0 var(--space-1);
      font-family: var(--font-sans);
      font-size: var(--font-size-xs);
      font-weight: 600;
      letter-spacing: 0;
      color: var(--color-text-muted);
    }
    p {
      margin: 0;
      font-size: var(--font-size-sm);
    }
    .lead {
      font-size: var(--font-size-md);
      font-weight: 600;
    }
    .muted {
      color: var(--color-text-muted);
    }
    .group {
      margin-top: var(--space-1);
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .plain {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .lines li {
      font-size: var(--font-size-sm);
      font-variant-numeric: tabular-nums;
    }
    .links li {
      display: flex;
      align-items: center;
      min-height: 32px;
      font-size: var(--font-size-sm);
    }
    .links a {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      min-height: 32px;
      overflow-wrap: anywhere;
    }
    @media (pointer: coarse), (max-width: 40rem) {
      .links li,
      .links a {
        min-height: 44px;
      }
    }
    .link-text {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }
    .chev {
      display: none;
    }
    /* Brief H-698 S3 (phones, the dialog only: the desktop panel is 64rem and wider): one rhythm for both card
       dialogs. Every section after the lead starts with a hairline; headings sm / 600 / muted; every list one row
       style (>= 44 px, hairlines between rows, full-width tap target, no underline); rows that leave the dialog end
       in a chevron. */
    @media (max-width: 40rem) {
      .art-frame {
        width: min(60vw, 15rem);
      }
      .info > section.section {
        margin-top: var(--space-4);
        padding-top: var(--space-4);
        border-top: 1px solid var(--color-border);
      }
      .info > .lead--plain + .muted {
        margin-top: var(--space-1);
      }
      h3 {
        margin-bottom: var(--space-2);
        font-size: var(--font-size-sm);
      }
      .lines li {
        display: flex;
        align-items: center;
        min-height: 44px;
      }
      .lines li + li,
      .links li + li {
        border-top: 1px solid var(--color-border);
      }
      .links a {
        flex: 1;
        justify-content: space-between;
        gap: var(--space-2);
        text-decoration: none;
      }
      .chev {
        display: inline-block;
        flex: none;
        font-size: 20px;
        color: var(--color-text-muted);
      }
    }
    .links--excluded a {
      color: var(--color-text-muted);
    }
    .lock {
      font-size: 14px;
    }
    .rules {
      margin-top: var(--space-2);
      white-space: pre-line;
    }
  `,
})
export class DeckCardContent {
  readonly card = input.required<OwnershipCard>();
  /** Kept for the page's bindings; v0.6 the breakdown follows the card's own name lock (`card.nameLocked`). */
  readonly locked = input(false);
  /** H-665: the deck and lock facts for the per-name control (SHARE-094 (a)); null = no control (e.g. previews). */
  readonly lockContext = input<NameLockContext | null>(null);
  readonly ownershipAvailable = input(true);
  /** OWN-016: the full art of the default printing; the thumbnail shows until it has loaded. */
  readonly fullUrl = input<string | null>(null);
  /** 2 in the panel (the card name is the panel's heading); 0 in the dialog (its title is the dialog's). */
  readonly headingLevel = input<0 | 2>(2);
  readonly titleId = input<string | null>(null);
  /** Art beside the facts (the dialog at 40rem and wider). */
  readonly wide = input(false);
  /** A link was followed (the dialog closes, OWN-113). */
  readonly navigated = output<void>();

  protected readonly text = DETAIL_TEXT;
  protected readonly unknown = computed(() => this.card().flags.includes('unknown-card'));
  protected readonly zoneLabel = computed(() => ZONE_LABEL[this.card().zone]);
  protected readonly parts = computed(() => labelParts(this.card().label));
  protected readonly landscape = computed(() => (this.card().card?.category === 'battlefield' ? true : null));
  /** "2 of 3 in this deck · Main Deck 2 of 2 · Sideboard 0 of 1" (only when split, OWN-042). */
  protected readonly splitLine = computed(() => {
    const total = this.parts().total;
    const zones = allocationLine(this.card());
    return [total, zones].filter(Boolean).join(' · ') || null;
  });
  protected readonly breakdown = computed(() => breakdownLines(this.card()));
  protected readonly facts = computed(() => cardFacts(this.card()));
  /** OWN-015: the ban label in every case, "Ban status unknown" included. */
  protected readonly ban = computed((): { variant: StatusVariant; text: string } | null => {
    const b = this.card().banStatus;
    const t = banText(b);
    if (!t) return null;
    return { variant: b.status === 'banned' ? 'banned' : b.status === 'upcoming' ? 'upcoming' : 'unknown', text: t };
  });
  protected readonly rowText = printingRowText;
  protected readonly rowLabel = printingRowLabel;
  protected readonly useText = otherUseText;

  /** Thumbnail first, swapped for the full image once it has loaded (no layout shift; as Collection's dialog). */
  private readonly loadedFull = signal<string | null>(null);
  protected readonly artUrl = computed(() => {
    const full = this.fullUrl();
    return full && this.loadedFull() === full ? full : (this.card().imageUrl ?? full);
  });

  constructor() {
    effect(() => {
      const full = this.fullUrl();
      if (!full || full === this.card().imageUrl || typeof Image === 'undefined') return;
      const img = new Image();
      img.onload = () => this.loadedFull.set(full);
      img.src = full;
    });
  }
}
