import { Component, InjectionToken, computed, input } from '@angular/core';
import { CardKeyword, EMPTY_KEYWORD_INDEX, KeywordIndex, keywordSourceLine } from '../../core/cards/keywords';

/**
 * The loaded keyword glossary (SPEC-011). Empty until ADR-0008 is accepted and a glossary ships (KW-003), so the
 * Keywords section is hidden on every card (KW-056). Tests provide a fixture index.
 */
export const KEYWORD_INDEX = new InjectionToken<KeywordIndex>('KEYWORD_INDEX', {
  providedIn: 'root',
  factory: () => EMPTY_KEYWORD_INDEX,
});

/**
 * The rows of the card dialog's Keywords section (SPEC-011 KW-050, KW-051, KW-055; Collection Components §6.5):
 * an outlined chip, the definition as visible text and a muted source line, read in that order. Chips are text,
 * not controls. The dialog owns the heading and hides the section when there are no rows (KW-053).
 */
@Component({
  selector: 'app-keyword-list',
  template: `
    <ul class="keywords">
      @for (row of view(); track row.keywordId) {
        <li>
          <span class="chip">{{ row.label }}</span>
          <p class="definition">{{ row.definition }}</p>
          <p class="source">{{ row.source }}</p>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .keywords {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .chip {
      display: inline-block;
      margin-bottom: var(--space-1);
      padding: 2px var(--space-2);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
    p {
      margin: 0;
    }
    .definition {
      font-size: var(--font-size-sm);
    }
    .source {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class KeywordList {
  readonly rows = input.required<readonly CardKeyword[]>();

  protected readonly view = computed(() =>
    this.rows().map((row) => ({
      keywordId: row.keywordId,
      label: row.label,
      definition: row.entry.definition,
      source: keywordSourceLine(row.entry),
    })),
  );
}
