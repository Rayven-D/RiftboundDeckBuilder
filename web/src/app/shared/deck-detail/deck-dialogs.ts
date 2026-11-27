import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import type { UserDeck } from '../../core/decks';
import { sourceLine } from '../../core/decks';
import { deckSource } from '../import/deck-import';
import { LIMITS } from '../storage/records';
import { Icon } from '../icon';
import { NotCheckedList } from './not-checked-list';
import { RULE_CHECK_WORDS, RenameForm, RenameResult, RuleCheckContent, applyRename } from './detail-view';

// ---------------------------------------------------------------- Rename (OWN-118, DECK-081)

export interface RenameDialogData {
  readonly deck: UserDeck;
  /** Writes the renamed deck; resolves to an error message to show in the dialog, or null when saved. */
  save(result: Extract<RenameResult, { ok: true }>): Promise<string | null>;
}

/**
 * More → Rename (SPEC-005 OWN-118 (a); SPEC-006 DECK-081): Name (required, 1–80 after trimming), Description (the
 * deck's `notes`, up to 4,000 characters, DECK-073) and, for an imported deck, Source text and URL (DECK-071). A
 * tournament deck's source is shown, not editable (DECK-061). Errors keep the dialog open and the old values stored.
 */
@Component({
  selector: 'app-rename-deck-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <h2 mat-dialog-title>Rename deck</h2>
    <form (submit)="$event.preventDefault(); submit()">
      <mat-dialog-content class="fields">
        <label class="field">
          <span class="label">Name</span>
          <input
            #name
            type="text"
            autocomplete="off"
            [value]="form.name"
            [attr.aria-invalid]="errors().name ? 'true' : null"
            [attr.aria-describedby]="errors().name ? 'rename-name-error' : null"
            (input)="form.name = name.value"
          />
          @if (errors().name; as e) {
            <span id="rename-name-error" class="error">{{ e }}</span>
          }
        </label>
        <label class="field">
          <span class="label">Description <span class="optional">(optional)</span></span>
          <textarea
            #desc
            rows="4"
            [value]="form.description"
            [attr.aria-invalid]="errors().description ? 'true' : null"
            aria-describedby="rename-desc-hint"
            (input)="form.description = desc.value; descLength.set(desc.value.trim().length)"
          ></textarea>
          <span id="rename-desc-hint" class="hint" [class.error]="errors().description">
            {{ errors().description ?? descLength().toLocaleString('en-US') + ' of ' + maxNotes + ' characters' }}
          </span>
        </label>
        @if (data.deck.source.kind === 'user') {
          <label class="field">
            <span class="label">Source <span class="optional">(optional)</span></span>
            <input
              #srcText
              type="text"
              autocomplete="off"
              placeholder="Where the list is from"
              [value]="form.sourceText"
              [attr.aria-invalid]="errors().source ? 'true' : null"
              [attr.aria-describedby]="errors().source ? 'rename-source-error' : null"
              (input)="form.sourceText = srcText.value"
            />
            @if (errors().source; as e) {
              <span id="rename-source-error" class="error">{{ e }}</span>
            }
          </label>
          <label class="field">
            <span class="label">Source link <span class="optional">(optional)</span></span>
            <input #srcUrl type="url" autocomplete="off" placeholder="https://" [value]="form.sourceUrl" (input)="form.sourceUrl = srcUrl.value" />
          </label>
        } @else {
          <div class="field">
            <span class="label">Source</span>
            <p class="readonly">{{ tournamentSource }}</p>
            <p class="hint">Decks from Tournaments keep their source.</p>
          </div>
        }
        @if (saveError(); as e) {
          <p class="error" role="alert">{{ e }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Cancel</button>
        <button matButton="filled" type="submit" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields {
      display: grid;
      gap: var(--space-4);
    }
    .field {
      display: grid;
      gap: var(--space-1);
    }
    .label {
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
    .optional {
      font-weight: 400;
      color: var(--color-text-muted);
    }
    input,
    textarea {
      width: 100%;
      min-height: 44px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text);
      font: inherit;
    }
    textarea {
      resize: vertical;
    }
    input[aria-invalid='true'],
    textarea[aria-invalid='true'] {
      border-color: var(--color-danger);
    }
    .hint,
    .readonly {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .readonly {
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }
    .error {
      margin: 0;
      font-size: var(--font-size-xs);
      color: var(--color-danger);
    }
  `,
})
export class RenameDeckDialog {
  protected readonly data = inject<RenameDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<RenameDeckDialog, boolean>>(MatDialogRef);
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('name');
  private readonly descInput = viewChild<ElementRef<HTMLTextAreaElement>>('desc');
  private readonly srcInput = viewChild<ElementRef<HTMLInputElement>>('srcText');
  protected readonly maxNotes = LIMITS.maxDeckNotes.toLocaleString('en-US');
  protected readonly form: RenameForm = {
    name: this.data.deck.name,
    description: this.data.deck.notes,
    sourceText: this.data.deck.source.kind === 'user' ? (this.data.deck.source.text ?? '') : '',
    sourceUrl: this.data.deck.source.kind === 'user' ? (this.data.deck.source.url ?? '') : '',
  };
  protected readonly tournamentSource = this.data.deck.source.kind === 'tournament' ? sourceLine(this.data.deck) : '';
  protected readonly descLength = signal(this.data.deck.notes.length);
  protected readonly errors = signal<Partial<Record<'name' | 'description' | 'source', string>>>({});
  protected readonly saveError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected async submit(): Promise<void> {
    if (this.saving()) return;
    const result = applyRename(this.data.deck, this.form, deckSource);
    if (!result.ok) {
      this.errors.set(result.errors);
      const first = result.errors.name ? this.nameInput() : result.errors.description ? this.descInput() : this.srcInput();
      first?.nativeElement.focus();
      return;
    }
    this.errors.set({});
    if (!result.changed) {
      this.ref.close(false);
      return;
    }
    this.saving.set(true);
    const error = await this.data.save(result);
    this.saving.set(false);
    if (error) this.saveError.set(error);
    else this.ref.close(true);
  }
}

export function openRenameDialog(dialog: MatDialog, data: RenameDialogData): MatDialogRef<RenameDeckDialog, boolean> {
  return dialog.open<RenameDeckDialog, RenameDialogData, boolean>(RenameDeckDialog, {
    data,
    width: '32rem',
    maxWidth: 'calc(100vw - 2rem)',
    autoFocus: 'first-tabbable',
  });
}

// ---------------------------------------------------------------- Delete (DECK-082, SHARE-024)

export interface DeleteDialogData {
  readonly name: string;
  readonly locked: boolean;
}

/**
 * DECK-082: "Delete '<name>'?"; a locked deck adds "Its locked cards will count toward your other decks again."
 * (SHARE-024). No "This can't be undone." (v0.11: Undo exists, DECK-083). Cancel first, Delete (danger) last.
 */
@Component({
  selector: 'app-delete-deck-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <h2 mat-dialog-title>Delete '{{ data.name }}'?</h2>
    @if (data.locked) {
      <mat-dialog-content>
        <p>Its locked cards will count toward your other decks again.</p>
      </mat-dialog-content>
    }
    <mat-dialog-actions align="end">
      <button matButton type="button" mat-dialog-close>Cancel</button>
      <button matButton="filled" type="button" class="danger" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
})
export class DeleteDeckDialog {
  protected readonly data = inject<DeleteDialogData>(MAT_DIALOG_DATA);
}

export async function confirmDelete(dialog: MatDialog, data: DeleteDialogData): Promise<boolean> {
  const ref = dialog.open<DeleteDeckDialog, DeleteDialogData, boolean>(DeleteDeckDialog, {
    data,
    width: '28rem',
    maxWidth: 'calc(100vw - 2rem)',
    autoFocus: 'first-tabbable',
  });
  return (await firstValueFrom(ref.afterClosed())) === true;
}

// ---------------------------------------------------------------- Rule check (OWN-117)

/**
 * OWN-117 Rule check: the legality label, the failed rules (LEGAL-R07 messages), what was not checked (DECK-052) and
 * every banned or upcoming-banned card with its zone and date (DECK-051 wording). Changes nothing. Close only.
 */
@Component({
  selector: 'app-rule-check-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, Icon, NotCheckedList],
  template: `
    <h2 mat-dialog-title>{{ words.title }}</h2>
    <mat-dialog-content>
      <p class="verdict">
        <app-icon [name]="data.verdict === 'legal' ? 'check_circle' : data.verdict === 'illegal' ? 'block' : 'help'" />{{ data.label }}
      </p>
      @if (data.failed.length) {
        <h3>{{ words.failed }}</h3>
        <ul>
          @for (f of data.failed; track $index) {
            <li>{{ f }}</li>
          }
        </ul>
      }
      @if (data.notCheckedItems.length) {
        <h3>{{ words.notChecked }}</h3>
        <app-not-checked-list [items]="data.notCheckedItems" />
      }
      @if (data.banned.length) {
        <h3>{{ words.banned }}</h3>
        <ul>
          @for (b of data.banned; track $index) {
            <li>{{ b.text }} <span class="muted">· {{ b.zone }}</span></li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="filled" type="button" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .verdict {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-weight: 600;
    }
    h3 {
      margin: var(--space-4) 0 var(--space-1);
      font-family: var(--font-sans);
      font-size: var(--font-size-sm);
      font-weight: 600;
      letter-spacing: 0;
      color: var(--color-text-muted);
    }
    ul {
      margin: 0;
      padding-inline-start: var(--space-5);
    }
    .muted {
      color: var(--color-text-muted);
    }
  `,
})
export class RuleCheckDialog {
  protected readonly data = inject<RuleCheckContent>(MAT_DIALOG_DATA);
  protected readonly words = RULE_CHECK_WORDS;
}

export function openRuleCheck(dialog: MatDialog, data: RuleCheckContent): MatDialogRef<RuleCheckDialog> {
  return dialog.open(RuleCheckDialog, { data, width: '32rem', maxWidth: 'calc(100vw - 2rem)', autoFocus: 'first-tabbable' });
}
