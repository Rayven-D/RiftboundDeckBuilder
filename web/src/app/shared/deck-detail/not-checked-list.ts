import { Component, computed, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import type { NotEvaluatedItem } from '../../core/legality/types';

/** One line of the "Not checked" list. `names` is set for a reason that lists cards. */
export interface NotCheckedLine {
  readonly text: string;
  readonly names: readonly string[] | null;
}

/**
 * H-676 / SPEC-002 LEGAL-R09 (b), DECK-107: a reason that lists cards is one count line, "<label> {n} cards"
 * ("1 card"), with its names behind a disclosure; "Unknown cards not checked" reads "{n} unknown cards not checked".
 * A reason with no list shows its text. Built from `notEvaluatedItems`, never from the reason text.
 */
export function notCheckedLines(items: readonly NotEvaluatedItem[]): NotCheckedLine[] {
  return items.map((item) => {
    const names = item.cardNames;
    if (!item.label || !names) return { text: item.text, names: null };
    const n = names.length;
    const text =
      item.label === 'Unknown cards not checked'
        ? `${n} unknown ${n === 1 ? 'card' : 'cards'} not checked`
        : `${item.label} ${n} ${n === 1 ? 'card' : 'cards'}`;
    return { text, names };
  });
}

let nextId = 0;

/** H-676: the "Not checked" list (collapsed when it appears, never stored) for the Deck Import review and the Deck detail Rule check dialog. */
@Component({
  selector: 'app-not-checked-list',
  imports: [MatButton],
  template: `
    <ul [class]="listClass()">
      @for (line of lines(); track $index) {
        <li>
          {{ line.text }}
          @if (line.names; as names) {
            <button
              matButton
              type="button"
              class="toggle"
              [attr.aria-expanded]="isOpen($index)"
              [attr.aria-controls]="id + '-' + $index"
              (click)="toggle($index)"
            >
              {{ isOpen($index) ? 'Hide cards' : 'Show cards' }}
            </button>
            @if (isOpen($index)) {
              <ul class="names" [id]="id + '-' + $index">
                @for (n of names; track $index) {
                  <li>{{ n }}</li>
                }
              </ul>
            }
          }
        </li>
      }
    </ul>
  `,
  styles: `
    .toggle {
      min-height: 44px;
      min-width: 44px;
    }
    .names {
      margin: 0;
      padding-inline-start: var(--space-4);
    }
  `,
})
export class NotCheckedList {
  readonly items = input.required<readonly NotEvaluatedItem[]>();
  readonly listClass = input('');

  protected readonly id = `not-checked-${++nextId}`;
  protected readonly lines = computed(() => notCheckedLines(this.items()));
  private readonly open = signal<ReadonlySet<number>>(new Set());

  protected isOpen(i: number): boolean {
    return this.open().has(i);
  }
  protected toggle(i: number): void {
    const next = new Set(this.open());
    if (!next.delete(i)) next.add(i);
    this.open.set(next);
  }
}
