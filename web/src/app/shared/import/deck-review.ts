import {
  Component,
  ElementRef,
  Injector,
  afterEveryRender,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { type ErrorStateMatcher, MatOptgroup, MatOption } from '@angular/material/core';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
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
  deckSource,
  questionKey,
  reviewDeck,
} from './deck-import';
import { SECTION_LABELS } from './parse-card-list';

/** H-451: the review's one status region; the dialog's Save button is described by it. */
export const DECK_REVIEW_STATUS_ID = 'deck-review-status';

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
  /** H-451: a PICK_ZONE select names its card and line, so three questions never read as three "Section". */
  sectionForLine: (name: string, line: number) => `Section for ${name} (line ${line})`,
  /** H-451 (critique H-341 §4): an open question says so in text, not by its border colour only (WCAG 1.4.1). */
  needsAnswer: 'Needs an answer',
  /** H-451 (§4): the status line when nothing blocks Save. */
  ready: 'Ready to save.',
  /** H-451 (§4): heading of the warnings list (the Owned Cards review's "Check these:" without the colon). */
  checks: 'Check these',
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
  imports: [MatButton, MatFormField, MatLabel, MatHint, MatError, MatInput, MatSelect, MatOption, MatOptgroup, Icon],
  template: `
    @let v = view();
    <h3 class="step-heading review-heading" tabindex="-1">{{ words.check }}</h3>
    <mat-form-field appearance="outline" class="name-field" subscriptSizing="dynamic">
      <mat-label>{{ words.name }}</mat-label>
      <input
        #nameInput
        matInput
        class="deck-name"
        maxlength="80"
        required
        [errorStateMatcher]="nameErrorState"
        [value]="v.name"
        (input)="onName($event)"
      />
      @if (v.nameError; as err) {
        <mat-error class="field-error">{{ err }}</mat-error>
      }
    </mat-form-field>

    <p class="sections zone-counts">
      @for (z of zones; track z) {
        @if (v.byZone[z]) {
          <span>{{ label(z) }} {{ v.byZone[z] }}</span>
        }
      }
    </p>

    <!-- H-451 (WCAG 4.1.3): one status region, always in the DOM, so "Ready to save." is announced too. -->
    <p class="blockers" role="status" [id]="statusId" [class.ready]="v.canSave">
      @if (v.canSave) {
        <span>{{ words.ready }}</span>
      } @else {
        @if (v.blockers.unresolvedLines) {
          <span>{{ text.needAttention(v.blockers.unresolvedLines) }}</span>
        }
        @if (v.blockers.openQuestions) {
          <span>{{ text.questions(v.blockers.openQuestions) }}</span>
        }
        @if (v.nameError; as err) {
          <span>{{ err }}</span>
        }
        @if (v.sourceError; as err) {
          <span>{{ err }}</span>
        }
      }
    </p>

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
      <!-- H-451: each question is a group named by its prompt; an open one says so in text. -->
      <div
        class="question"
        role="group"
        [class.open]="q.answer === null"
        [attr.data-q]="key(q)"
        [attr.aria-labelledby]="promptId(q)"
      >
        @if (q.answer === null) {
          <span class="needs-answer">{{ words.needsAnswer }}</span>
        }
        @switch (q.kind) {
          @case ('PICK_LEGEND') {
            <p [id]="promptId(q)">{{ q.candidates.length ? words.legendMany : words.legendNone }}</p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ words.legend }}</mat-label>
              <mat-select
                class="pick-legend"
                [value]="q.answer"
                [aria-describedby]="promptId(q)"
                (selectionChange)="answerLegend($event.value)"
              >
                @for (c of q.candidates.length ? q.candidates : prepared().legends; track c.cardKey) {
                  <mat-option [value]="c.cardKey">{{ c.name }}</mat-option>
                }
                <mat-option value="empty">{{ words.leaveEmpty }}</mat-option>
              </mat-select>
            </mat-form-field>
          }
          @case ('PICK_CHAMPION') {
            <p [id]="promptId(q)">{{ championPrompt(q) }}</p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ words.champion }}</mat-label>
              <mat-select
                class="pick-champion"
                [value]="q.answer"
                [aria-describedby]="promptId(q)"
                (selectionChange)="answerChampion($event.value)"
              >
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
            <p [id]="promptId(q)">{{ words.zoneAsk(lineNo(q.lineIds[0]), lineName(q.lineIds[0])) }}</p>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>{{ words.section }}</mat-label>
              <mat-select
                class="pick-zone"
                [value]="q.answer"
                [aria-label]="words.sectionForLine(lineName(q.lineIds[0]), lineNo(q.lineIds[0]))"
                [aria-describedby]="promptId(q)"
                (selectionChange)="answerZone(q, $event.value)"
              >
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

    @if (mismatches().length || otherIssues().length || v.notes.length) {
      <h3 class="step-heading checks-heading">{{ words.checks }}</h3>
      <ul class="issues checks">
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
        <input
          matInput
          class="source-text"
          [attr.maxlength]="maxText"
          [value]="state().sourceText"
          [aria-describedby]="v.sourceError ? sourceErrorId : ''"
          (input)="onSource($event, 'sourceText')"
        />
        <mat-hint>{{ words.sourceHint }}</mat-hint>
      </mat-form-field>
      @if (v.sourceError; as err) {
        <!-- Announced by the status line; linked to the Source field. -->
        <p class="error" [id]="sourceErrorId"><app-icon name="error" />{{ err }}</p>
      }
      <div>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="link-field">
          <mat-label>{{ words.link }}</mat-label>
          <input
            matInput
            class="source-url"
            type="url"
            [attr.maxlength]="maxUrl"
            [value]="state().sourceUrl"
            [aria-describedby]="linkWarning() ? linkWarningId : ''"
            (input)="onSource($event, 'sourceUrl')"
            (blur)="checkLink()"
          />
          <mat-hint>{{ words.linkHint }}</mat-hint>
        </mat-form-field>
        <!-- H-451 (WCAG 3.3.1): SOURCE_URL_INVALID under Link, checked on blur, not on every keystroke. -->
        @if (linkWarning(); as warn) {
          <p class="field-warn" [id]="linkWarningId"><app-icon name="warning" />{{ warn }}</p>
        }
      </div>
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
  /** Mismatches have their own rows; SOURCE_URL_INVALID shows under the Link field (H-451). */
  protected readonly otherIssues = computed(() =>
    this.view().issues.filter((i) => i.code !== 'ZONE_CATEGORY_MISMATCH' && i.code !== 'SOURCE_URL_INVALID'),
  );

  /** H-451: ids the dialog's Save button and the fields point at (one review is open at a time). */
  readonly statusId = DECK_REVIEW_STATUS_ID;
  protected readonly sourceErrorId = 'deck-review-source-error';
  protected readonly linkWarningId = 'deck-review-link-warning';
  /** The Link value as of the last blur; the warning is only for that value (typing hides it until the next blur). */
  private readonly checkedUrl = signal<string | null>(null);
  protected readonly linkWarning = computed(() => {
    const url = this.state().sourceUrl;
    if (this.checkedUrl() !== url) return null;
    return deckSource('', url).urlInvalid ? DECK_REVIEW_TEXT.sourceUrlInvalid : null;
  });

  /** H-451 (WCAG 3.3.1): the name field shows Material's error state while the name is empty. */
  protected readonly nameErrorState: ErrorStateMatcher = { isErrorState: () => this.view().nameError !== null };
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly nameMatInput = viewChild('nameInput', { read: MatInput });
  /** DECK-030: every line placed without a section label (by card type, or by the user's change), changeable. */
  protected readonly inferred = computed(() =>
    this.view().lines.filter(
      (l) => l.zone !== null && (l.zoneMethod === 'inferred' || (l.zoneMethod === 'user' && !this.prepared().lines[l.id]?.section)),
    ),
  );
  protected readonly openZoneQuestions = computed(
    () => this.view().questions.filter((q) => q.kind === 'PICK_ZONE' && q.answer === null).length,
  );

  constructor() {
    // H-451 (WCAG 3.3.1): Material leaves `aria-invalid` off an empty required field; the review's accept check wants
    // the empty name announced as invalid, so it is set after each render (Material doesn't rewrite it while empty).
    afterEveryRender({
      write: () => {
        const el = this.nameInput()?.nativeElement;
        if (el && this.view().nameError && el.getAttribute('aria-invalid') !== 'true') el.setAttribute('aria-invalid', 'true');
      },
    });
  }

  /** H-451: the prompt's id, which names the question's group and describes its select. */
  protected promptId(q: ZoneQuestion): string {
    return `deck-q-${q.kind}-${q.lineIds[0] ?? 'none'}`;
  }

  /** H-451 (WCAG 3.3.1): the Link warning is checked when the field loses focus, not per keystroke. */
  protected checkLink(): void {
    this.checkedUrl.set(this.state().sourceUrl);
  }

  /**
   * H-451: Save pressed while blocked moves focus to the first open item: a line to fix, else an open question's
   * select, else the name field, else the Source field.
   */
  focusFirstOpen(): void {
    const v = this.view();
    const targets: string[] = [];
    if (v.attention.length) targets.push('ul.attention li button');
    if (v.blockers.openQuestions) targets.push('.question.open mat-select');
    if (v.nameError) targets.push('input.deck-name');
    if (v.sourceError) targets.push('input.source-text');
    this.focusFirst(targets);
  }

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
    // No form control here, so Material doesn't re-check the error state by itself (H-451).
    this.nameMatInput()?.updateErrorState();
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
