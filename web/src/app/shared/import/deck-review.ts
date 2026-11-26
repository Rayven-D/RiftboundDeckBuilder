import { Component, ElementRef, Injector, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatOptgroup, MatOption } from '@angular/material/core';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { Icon } from '../icon';
import type { CardKey } from '../storage/records';
import {
  DECK_REVIEW_TEXT,
  DECK_ZONE_ORDER,
  type DeckReview as Review,
  type DeckReviewState,
  type DeckZone,
  EMPTY_REVIEW_STATE,
  MAX_SOURCE_TEXT,
  MAX_SOURCE_URL,
  type PreparedDeck,
  type ZoneQuestion,
  questionKey,
  reviewDeck,
} from './deck-import';
import { SECTION_LABELS } from './parse-card-list';

/** Review-step strings for Deck Import (H-253). SPEC-006 words only the ones in `DECK_REVIEW_TEXT`. */
export const DECK_REVIEW_WORDS = {
  /** H-450 (critique H-341 §4): the review's first heading, where focus lands after Continue. */
  check: 'Check the deck',
  name: 'Deck name',
  fix: 'Lines to fix',
  fixNote: 'Remove a line here, or go Back and fix it in the list.',
  remove: 'Remove line',
  removeLine: (line: number) => `Remove line ${line}`,
  sectionFor: (name: string) => `Section for ${name}`,
  use: (name: string) => `Use ${name}`,
  legendNone: 'This list has no Legend. Pick one, or leave it empty.',
  legendMany: 'Pick the deck\'s Legend. The other Legend lines are left out.',
  championAsk: 'Pick the deck\'s Chosen Champion.',
  championMany: 'Pick the deck\'s Chosen Champion. The other Champion lines are left out.',
  zoneAsk: (line: number, name: string) => `Line ${line}: ${name}. Its card type isn't known, so pick its section.`,
  allMain: 'Put all in Main Deck',
  legend: 'Legend',
  champion: 'Chosen Champion',
  section: 'Section',
  leaveEmpty: 'Leave empty',
  fromList: 'From this list',
  otherCards: 'Other cards',
  inferred: 'Placed by card type',
  inferredNote: 'Change a section if it is wrong.',
  moveTo: (zone: string) => `Move to ${zone}`,
  removed: (n: number) => `${n} ${n === 1 ? 'line is' : 'lines are'} left out of the deck and listed on it.`,
  source: 'Source (optional)',
  sourceHint: 'Where the list comes from, e.g. a player or a site.',
  link: 'Link (optional)',
  linkHint: 'An http or https address. It opens only when you click it.',
} as const;

/**
 * SPEC-006 Deck Import review step (H-253), inside the shared import dialog: name (DECK-070), lines to fix
 * (DECK-041), zone questions (DECK-033…038), inferred zones (DECK-030), section warnings (DECK-022, DECK-023), token
 * and sideboard notices (DECK-026, DECK-037) and the source (DECK-071). The dialog reads `view()` for Save.
 */
@Component({
  selector: 'app-deck-review',
  imports: [MatButton, MatFormField, MatLabel, MatHint, MatInput, MatSelect, MatOption, MatOptgroup, Icon],
  template: `
    @let v = view();
    <h3 class="step-heading review-heading" tabindex="-1">{{ words.check }}</h3>
    <mat-form-field appearance="outline" class="name-field" subscriptSizing="dynamic">
      <mat-label>{{ words.name }}</mat-label>
      <input matInput class="deck-name" maxlength="80" [value]="v.name" (input)="onName($event)" />
      @if (v.nameError; as err) {
        <mat-hint class="field-error">{{ err }}</mat-hint>
      }
    </mat-form-field>

    <p class="sections zone-counts">
      @for (z of zones; track z) {
        @if (v.byZone[z]) {
          <span>{{ label(z) }} {{ v.byZone[z] }}</span>
        }
      }
    </p>

    @if (v.blockers.unresolvedLines || v.blockers.openQuestions) {
      <p class="blockers" role="status">
        @if (v.blockers.unresolvedLines) {
          <span>{{ text.needAttention(v.blockers.unresolvedLines) }}</span>
        }
        @if (v.blockers.openQuestions) {
          <span>{{ text.questions(v.blockers.openQuestions) }}</span>
        }
      </p>
    }

    @if (v.attention.length) {
      <h3 class="step-heading fix-heading" tabindex="-1">{{ words.fix }}</h3>
      <ul class="issues attention">
        @for (l of v.attention; track l.id) {
          <li [attr.data-line]="l.id">
            <app-icon name="error" />
            <span class="grow">
              <strong>Line {{ l.line }}:</strong> {{ l.attention?.message }}
              <span class="line-actions">
                @for (c of l.choices; track c.cardKey) {
                  <button matButton="outlined" type="button" class="pick" (click)="pick(l.id, c.cardKey)">
                    {{ words.use(c.name) }}
                  </button>
                }
                <button
                  matButton
                  type="button"
                  class="remove"
                  [attr.aria-label]="words.removeLine(l.line)"
                  (click)="remove(l.id)"
                >
                  {{ words.remove }}
                </button>
              </span>
            </span>
          </li>
        }
      </ul>
      <p class="note">{{ words.fixNote }}</p>
    }

    @for (q of v.questions; track key(q)) {
      <div class="question" [class.open]="q.answer === null" [attr.data-q]="key(q)">
        @switch (q.kind) {
          @case ('PICK_LEGEND') {
            <p>{{ q.candidates.length ? words.legendMany : words.legendNone }}</p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ words.legend }}</mat-label>
              <mat-select class="pick-legend" [value]="q.answer" (selectionChange)="answerLegend($event.value)">
                @for (c of q.candidates.length ? q.candidates : prepared().legends; track c.cardKey) {
                  <mat-option [value]="c.cardKey">{{ c.name }}</mat-option>
                }
                <mat-option value="empty">{{ words.leaveEmpty }}</mat-option>
              </mat-select>
            </mat-form-field>
          }
          @case ('PICK_CHAMPION') {
            <p>{{ championPrompt(q) }}</p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ words.champion }}</mat-label>
              <mat-select class="pick-champion" [value]="q.answer" (selectionChange)="answerChampion($event.value)">
                @if (q.candidates.length && withCatalog(q)) {
                  <mat-optgroup [label]="words.fromList">
                    @for (c of q.candidates; track c.cardKey) {
                      <mat-option [value]="c.cardKey">{{ c.name }}</mat-option>
                    }
                  </mat-optgroup>
                  <mat-optgroup [label]="words.otherCards">
                    @for (c of otherChampions(q); track c.cardKey) {
                      <mat-option [value]="c.cardKey">{{ c.name }}</mat-option>
                    }
                  </mat-optgroup>
                } @else {
                  @for (c of q.candidates.length ? q.candidates : prepared().champions; track c.cardKey) {
                    <mat-option [value]="c.cardKey">{{ c.name }}</mat-option>
                  }
                }
                <mat-option value="empty">{{ words.leaveEmpty }}</mat-option>
              </mat-select>
            </mat-form-field>
          }
          @case ('PICK_ZONE') {
            <p>{{ words.zoneAsk(lineNo(q.lineIds[0]), lineName(q.lineIds[0])) }}</p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ words.section }}</mat-label>
              <mat-select class="pick-zone" [value]="q.answer" (selectionChange)="answerZone(q, $event.value)">
                @for (z of zones; track z) {
                  <mat-option [value]="z">{{ label(z) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        }
      </div>
    }
    @if (openZoneQuestions()) {
      <button matButton="outlined" type="button" class="all-main" (click)="allMain()">{{ words.allMain }}</button>
    }

    @if (mismatches().length || v.issues.length || v.notes.length) {
      <ul class="issues">
        @for (l of mismatches(); track l.id) {
          <li class="warn">
            <app-icon name="warning" />
            <span class="grow">
              <strong>Line {{ l.line }}:</strong> {{ l.mismatch!.message }}
              <span class="line-actions">
                <button
                  matButton="outlined"
                  type="button"
                  class="move"
                  [attr.data-line]="l.id"
                  (click)="move(l.id, l.mismatch!.moveTo)"
                >
                  {{ words.moveTo(label(l.mismatch!.moveTo)) }}
                </button>
              </span>
            </span>
          </li>
        }
        @for (i of otherIssues(); track $index) {
          <li [class.warn]="i.severity === 'warning'" [class.info]="i.severity === 'info'">
            <app-icon name="warning" />
            <span>
              @if (i.line) {
                <strong>Line {{ i.line }}:</strong>
              }
              {{ i.message }}
            </span>
          </li>
        }
        @for (n of v.notes; track $index) {
          <li class="warn">
            <app-icon name="warning" /><span><strong>Line {{ n.line }}:</strong> {{ n.message }}</span>
          </li>
        }
      </ul>
    }
    @if (v.draft.importRemovedLines?.length; as n) {
      <p class="note">{{ words.removed(n) }}</p>
    }

    @if (inferred().length) {
      <h3 class="step-heading">{{ words.inferred }}</h3>
      <p class="note">{{ words.inferredNote }}</p>
      <ul class="inferred">
        @for (l of inferred(); track l.id) {
          <li>
            <span class="grow">
              <span class="qty">{{ l.qty }}</span> {{ l.name }}
              <span class="reason">{{ l.zoneReason }}</span>
            </span>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="zone-field">
              <mat-label>{{ words.section }}</mat-label>
              <mat-select
                [value]="l.zone"
                [aria-label]="words.sectionFor(l.name)"
                (selectionChange)="setZone(l.id, $event.value)"
              >
                @for (z of zones; track z) {
                  <mat-option [value]="z">{{ label(z) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </li>
        }
      </ul>
    }

    <div class="source">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>{{ words.source }}</mat-label>
        <input matInput class="source-text" [attr.maxlength]="maxText" [value]="state().sourceText" (input)="onSource($event, 'sourceText')" />
        <mat-hint>{{ words.sourceHint }}</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>{{ words.link }}</mat-label>
        <input matInput class="source-url" type="url" [attr.maxlength]="maxUrl" [value]="state().sourceUrl" (input)="onSource($event, 'sourceUrl')" />
        <mat-hint>{{ words.linkHint }}</mat-hint>
      </mat-form-field>
      @if (v.sourceError; as err) {
        <p class="error" role="alert"><app-icon name="error" />{{ err }}</p>
      }
    </div>
  `,
  styleUrl: './import-dialog.scss',
})
export class DeckReview {
  readonly prepared = input.required<PreparedDeck>();
  /** The user's local date for the DECK-070 fallback name; a function so tests can pin it. */
  readonly today = input<() => Date>(() => new Date());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly words = DECK_REVIEW_WORDS;
  protected readonly text = DECK_REVIEW_TEXT;
  protected readonly zones = DECK_ZONE_ORDER;
  protected readonly maxText = MAX_SOURCE_TEXT;
  protected readonly maxUrl = MAX_SOURCE_URL;

  protected readonly state = signal<DeckReviewState>(EMPTY_REVIEW_STATE);
  readonly view = computed<Review>(() => reviewDeck(this.prepared(), this.state(), this.today()()));

  protected readonly mismatches = computed(() => this.view().lines.filter((l) => l.mismatch));
  protected readonly otherIssues = computed(() => this.view().issues.filter((i) => i.code !== 'ZONE_CATEGORY_MISMATCH'));
  /** DECK-030: every line placed without a section label (by card type, or by the user's change), changeable. */
  protected readonly inferred = computed(() =>
    this.view().lines.filter(
      (l) => l.zone !== null && (l.zoneMethod === 'inferred' || (l.zoneMethod === 'user' && !this.prepared().lines[l.id]?.section)),
    ),
  );
  protected readonly openZoneQuestions = computed(
    () => this.view().questions.filter((q) => q.kind === 'PICK_ZONE' && q.answer === null).length,
  );

  protected label(z: DeckZone): string {
    return SECTION_LABELS[z];
  }

  protected lineNo(id: number): number {
    return this.prepared().lines[id]?.line ?? 0;
  }

  protected lineName(id: number): string {
    const l = this.prepared().lines[id];
    return l?.card?.name ?? l?.raw ?? '';
  }

  /** Unsectioned candidates also offer the catalog (DECK-034); a `Champion:` section picks among its lines only. */
  protected withCatalog(q: ZoneQuestion): boolean {
    return q.kind === 'PICK_CHAMPION' && !this.prepared().sections.has('champion');
  }

  protected otherChampions(q: ZoneQuestion): PreparedDeck['champions'] {
    const listed = new Set(q.kind === 'PICK_ZONE' ? [] : q.candidates.map((c) => c.cardKey));
    return this.prepared().champions.filter((c) => !listed.has(c.cardKey));
  }

  protected championPrompt(q: ZoneQuestion): string {
    return this.withCatalog(q) ? this.words.championAsk : this.words.championMany;
  }

  /** DECK-070: once the user types, the name never follows the Legend again. */
  protected onName(event: Event): void {
    const typedName = (event.target as HTMLInputElement).value;
    this.state.update((s) => ({ ...s, typedName }));
  }

  protected onSource(event: Event, field: 'sourceText' | 'sourceUrl'): void {
    const value = (event.target as HTMLInputElement).value;
    this.state.update((s) => ({ ...s, [field]: value }));
  }

  /** DECK-041 / DECK-042. H-450: focus moves to the next line's Remove line, else "Lines to fix", else the top. */
  protected remove(id: number): void {
    const next = this.fixLinesAfter(id).map((n) => `ul.attention li[data-line="${n}"] button.remove`);
    this.state.update((s) => ({ ...s, removed: new Set([...s.removed, id]) }));
    this.focusFirst([...next, '.fix-heading']);
  }

  /** DECK-015: pick the code's card or the named card. H-450: the resolved line leaves the list, as with remove. */
  protected pick(id: number, cardKey: CardKey): void {
    const next = this.fixLinesAfter(id).map((n) => `ul.attention li[data-line="${n}"] button`);
    this.state.update((s) => ({ ...s, picks: new Map([...s.picks, [id, cardKey]]) }));
    this.focusFirst([...next, '.fix-heading']);
  }

  /** DECK-030 changing an inferred zone (the line stays in its list, so its select keeps focus). */
  protected setZone(id: number, zone: DeckZone): void {
    this.state.update((s) => ({ ...s, zones: new Map([...s.zones, [id, zone]]) }));
  }

  /** DECK-023 "Move to". H-450: focus moves to the next line's Move to, else "Check the deck". */
  protected move(id: number, zone: DeckZone): void {
    const ids = this.mismatches().map((l) => l.id);
    const next = ids.slice(ids.indexOf(id) + 1).map((n) => `button.move[data-line="${n}"]`);
    this.setZone(id, zone);
    this.focusFirst(next);
  }

  /** DECK-035 PICK_ZONE. H-450: the answered question leaves the list; focus moves to the next question's select. */
  protected answerZone(q: ZoneQuestion, zone: DeckZone): void {
    const next = this.questionsAfter(q);
    this.setZone(q.lineIds[0], zone);
    this.focusFirst(next);
  }

  /** DECK-035: one explicit action answers every open PICK_ZONE with `main`. H-450: focus the next open question. */
  protected allMain(): void {
    const questions = this.view().questions;
    const open = questions.filter((q) => q.kind === 'PICK_ZONE' && q.answer === null);
    const after = open.length ? this.questionsAfter(open[0]) : [];
    this.state.update((s) => ({
      ...s,
      zones: new Map([...s.zones, ...open.map((q) => [q.lineIds[0], 'main'] as const)]),
    }));
    this.focusFirst(after);
  }

  /** H-450: the review's first heading, focused after Continue (and the last fallback of every focus move). */
  focusStart(): void {
    this.focusFirst([]);
  }

  protected key(q: ZoneQuestion): string {
    return questionKey(q);
  }

  private fixLinesAfter(id: number): number[] {
    const ids = this.view().attention.map((l) => l.id);
    return ids.slice(ids.indexOf(id) + 1);
  }

  private questionsAfter(q: ZoneQuestion): string[] {
    const keys = this.view().questions.map(questionKey);
    return keys.slice(keys.indexOf(questionKey(q)) + 1).map((k) => `[data-q="${k}"] mat-select`);
  }

  /**
   * H-450 (WCAG 2.4.3): once the change has rendered, focus the first target that still exists, else "Check the
   * deck", so focus is never left on `<body>` when the control the user pressed goes away.
   */
  private focusFirst(selectors: readonly string[]): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target = [...selectors, '.review-heading']
          .map((s) => root.querySelector<HTMLElement>(s))
          .find((el) => el !== null);
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected answerLegend(value: CardKey | 'empty'): void {
    this.state.update((s) => ({ ...s, legend: value }));
  }

  protected answerChampion(value: CardKey | 'empty'): void {
    this.state.update((s) => ({ ...s, champion: value }));
  }
}
