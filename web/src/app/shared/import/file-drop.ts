import { Component, input, output, signal } from '@angular/core';
import { Icon } from '../icon';
import { hasFiles } from './import-dialog';

/**
 * SPEC-007 COLL-094 (i) / SPEC-005 OWN-094 (SHOULD; keeps the H-085 drop feature, Brief H-175 F9): while `enabled`,
 * dragging a file over the window shows a drop overlay over the content with `text`; dropping emits the file, which
 * the page passes to its import dialog's one upload path (IMP-062). In any other state a dropped file is ignored
 * without the browser opening it. Only file drags are taken; text and link drags keep the native behaviour.
 */
@Component({
  selector: 'app-file-drop',
  imports: [Icon],
  host: {
    '(window:dragenter)': 'onDragEnter($event)',
    '(window:dragover)': 'onDragOver($event)',
    '(window:dragleave)': 'onDragLeave($event)',
    '(window:drop)': 'onDrop($event)',
  },
  template: `
    @if (active()) {
      <div class="drop-overlay" aria-hidden="true">
        <p><app-icon name="upload_file" />{{ text() }}</p>
      </div>
    }
  `,
  styles: `
    :host { display: contents; }
    .drop-overlay {
      position: fixed;
      z-index: 18; /* over the page and its floating button, under the header and tab bar */
      inset: var(--header-height) 0 0;
      display: grid;
      place-items: center;
      margin: var(--space-2);
      border: 2px dashed var(--color-accent);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--color-accent) 12%, var(--color-bg));
      pointer-events: none;
    }
    .drop-overlay p {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      margin: 0;
      color: var(--color-text);
      font-size: var(--font-size-lg);
      font-weight: 600;
    }
  `,
})
export class FileDrop {
  readonly enabled = input(false);
  readonly text = input.required<string>();
  readonly dropped = output<File>();
  protected readonly active = signal(false);
  /** dragenter / dragleave fire for every child element: count them, so the overlay doesn't flicker. */
  private depth = 0;

  protected onDragEnter(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    this.depth++;
    if (this.enabled() && !document.querySelector('mat-dialog-container')) this.active.set(true);
  }

  protected onDragOver(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault(); // never let the browser open the file
    if (e.dataTransfer) e.dataTransfer.dropEffect = this.enabled() ? 'copy' : 'none';
  }

  protected onDragLeave(e: DragEvent): void {
    if (!hasFiles(e)) return;
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) this.active.set(false);
  }

  protected onDrop(e: DragEvent): void {
    if (!hasFiles(e)) return;
    e.preventDefault();
    this.depth = 0;
    this.active.set(false);
    // While a dialog is open a drop belongs to it (its text box loads the file itself); nothing opens here.
    if (!this.enabled() || document.querySelector('mat-dialog-container')) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.dropped.emit(file);
  }
}
