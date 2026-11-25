import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Icon, IconName } from './icon';

/** Phones (below 40rem) collapse the button while scrolling down (COLL-094 c). */
const PHONE_QUERY = '(max-width: 40rem)';
/** Scroll distance that counts as a direction change, so tiny jitters don't toggle it. */
const SCROLL_SLOP = 8;

/**
 * SPEC-007 COLL-094 / SPEC-005 OWN-094 (Brief H-175 F1…F7, RJ H-178 decisions 3, 4): the page's extended floating
 * button ("Add to your collection", "Import deck"). Fixed at the bottom right on the content edge, above the phone
 * tab bar; collapses to the icon on phones while scrolling down (the label stays in the DOM, so the accessible name
 * never changes). While it exists, `html.has-fab` reserves room below the footer and lifts snack bars above it
 * (styles.scss). Place it right after the page header so Tab reaches it before the toolbar (F7).
 */
@Component({
  selector: 'app-page-fab',
  imports: [Icon],
  host: { '(window:scroll)': 'onScroll()' },
  template: `
    <button #button type="button" class="page-fab" [class.collapsed]="collapsed()" aria-haspopup="dialog" (click)="pressed.emit()">
      <app-icon [name]="icon()" />
      <span class="label">{{ label() }}</span>
    </button>
  `,
  styles: `
    :host { display: contents; }
    .page-fab {
      position: fixed;
      z-index: 15; /* above page content, below the header and tab bar (20) and every overlay (1000) */
      right: max(var(--content-gutter), calc((100% - var(--content-max-width)) / 2 + var(--content-gutter)));
      bottom: var(--space-5);
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      height: 56px;
      max-width: calc(100% - 2 * var(--content-gutter));
      padding: 0 var(--space-5) 0 var(--space-4);
      overflow: hidden;
      border: 0;
      border-radius: var(--radius-lg);
      background: var(--color-accent);
      color: var(--color-accent-contrast);
      font: inherit;
      font-size: var(--font-size-md);
      font-weight: 600;
      white-space: nowrap;
      box-shadow: var(--shadow-lift);
      cursor: pointer;
      transition:
        background-color var(--dur-fast) var(--ease-out),
        transform var(--dur-fast) var(--ease-out),
        padding var(--dur-med) var(--ease-out),
        gap var(--dur-med) var(--ease-out);
    }
    .page-fab app-icon { font-size: 24px; }
    .page-fab:hover { background: var(--color-accent-hover); transform: translateY(-1px); }
    .page-fab:active { transform: translateY(0) scale(0.98); }
    @media (max-width: 40rem) {
      .page-fab {
        right: var(--content-gutter);
        bottom: calc(var(--tabbar-height) + var(--tabbar-border) + env(safe-area-inset-bottom) + var(--space-4));
      }
      /* Icon only: 56 x 56. The label is hidden visually but stays in the accessibility tree. */
      .page-fab.collapsed { gap: 0; padding: 0 16px; }
      .page-fab.collapsed .label {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .page-fab { transition: background-color var(--dur-fast) var(--ease-out); }
      .page-fab:hover, .page-fab:active { transform: none; }
    }
  `,
})
export class PageFab {
  readonly label = input.required<string>();
  readonly icon = input<IconName>('add');
  readonly pressed = output<void>();

  private readonly doc = inject(DOCUMENT);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  protected readonly collapsed = signal(false);
  private lastY = 0;

  constructor() {
    const html = this.doc.documentElement;
    html.classList.add('has-fab');
    inject(DestroyRef).onDestroy(() => html.classList.remove('has-fab'));
    this.lastY = this.doc.defaultView?.scrollY ?? 0;
  }

  /** The button element, so a dialog opened another way (a `?add=1` address) can return focus to it. */
  element(): HTMLButtonElement {
    return this.button().nativeElement;
  }

  protected onScroll(): void {
    const win = this.doc.defaultView;
    if (!win) return;
    const y = win.scrollY;
    const phone = win.matchMedia?.(PHONE_QUERY).matches ?? false;
    if (!phone || y <= 0) {
      this.collapsed.set(false);
    } else if (y > this.lastY + SCROLL_SLOP) {
      this.collapsed.set(true);
    } else if (y < this.lastY - SCROLL_SLOP) {
      this.collapsed.set(false);
    } else {
      return; // within the slop: keep the reference point
    }
    this.lastY = y;
  }
}
