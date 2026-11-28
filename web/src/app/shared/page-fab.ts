import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { fabDock } from './fab-dock';
import { Icon, IconName } from './icon';

/** Phones (below 40rem) collapse the button while scrolling down (COLL-094 c). */
const PHONE_QUERY = '(max-width: 40rem)';
/** Scroll distance that counts as a direction change, so tiny jitters don't toggle it. */
const SCROLL_SLOP = 8;
/** Brief H-245 D1: start measuring once the footer is within this distance below the viewport. */
const FOOTER_NEAR_MARGIN = '0px 0px 120px 0px';

/**
 * SPEC-007 COLL-094 / SPEC-005 OWN-094 (Brief H-175 F1…F7, RJ H-178 decisions 3, 4): the page's extended floating
 * button ("Add to your collection", "Import deck"). Fixed at the bottom right on the content edge, above the phone
 * tab bar; collapses to the icon on phones while scrolling down (the label stays in the DOM, so the accessible name
 * never changes). Place it right after the page header so Tab reaches it before the toolbar (F7).
 *
 * H-245 (Brief H-245 D1…D3, RJ 2026-11-25: it never overlaps the footer): while the footer is in reach the button
 * docks 16px above it. The offset lives in `--fab-dock` on <html> (px, 0 at rest) and is applied with the
 * `translate` property, which has no transition, so the button tracks the footer 1:1. While it exists,
 * `html.has-fab` reserves room for it above the footer (inside <main>) and lifts snack bars above it (styles.scss).
 */
@Component({
  selector: 'app-page-fab',
  imports: [Icon],
  host: { '(window:scroll)': 'onScroll()', '(window:resize)': 'scheduleDock()' },
  template: `
    <button
      #button
      type="button"
      class="page-fab"
      [class.collapsed]="collapsed()"
      [class.arriving]="arriving()"
      aria-haspopup="dialog"
      (click)="pressed.emit()"
      (animationend)="arriving.set(false)"
    >
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
      height: var(--fab-size);
      max-width: calc(100% - 2 * var(--content-gutter));
      translate: 0 calc(-1 * var(--fab-dock, 0px)); /* H-245 D1: no transition, it tracks the footer */
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
      /* Brief H-733 S11: its own group in a route change (styles.scss): it morphs between pages that both have one,
         and fades in (and out) with the page otherwise. */
      view-transition-name: page-fab;
      transition:
        background-color var(--dur-fast) var(--ease-out),
        transform var(--dur-fast) var(--ease-out),
        padding var(--dur-med) var(--ease-out),
        gap var(--dur-med) var(--ease-out);
    }
    /* Brief H-733 S11: the button fades in from 92% when it is created, 60 ms after the page. It often comes after the
       route change (it waits for the page's data), so this is its own animation, not the view transition's. */
    .page-fab.arriving { animation: fab-in var(--dur-med) var(--ease-enter) 60ms backwards; }
    .page-fab app-icon { flex: none; font-size: 24px; }
    /* S11: the label narrows and fades with the padding and gap (one --dur-med move), never leaving the layout in
       one frame; it stays in the accessibility tree (no display: none, no visibility: hidden). */
    .label {
      display: inline-block;
      max-width: 16rem;
      overflow: hidden;
      transition:
        max-width var(--dur-med) var(--ease-out),
        opacity var(--dur-med) var(--ease-out);
    }
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
        max-width: 0;
        opacity: 0;
      }
    }
    @keyframes fab-in {
      from { opacity: 0; transform: scale(0.92); }
    }
    @media (prefers-reduced-motion: reduce) {
      .page-fab.arriving { animation: none; }
      .page-fab,
      .label { transition: background-color var(--dur-fast) var(--ease-out); }
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
  /** S11: plays its own arrival once, also inside a route's view transition (its live picture shows it). */
  protected readonly arriving = signal(false);
  private lastY = 0;

  /** True while the footer is near the viewport (no IntersectionObserver: always measure). */
  private footerNear = true;
  private frame = 0;
  private lastDock = -1;

  constructor() {
    const html = this.doc.documentElement;
    html.classList.add('has-fab');
    this.lastY = this.doc.defaultView?.scrollY ?? 0;
    this.arriving.set(!(this.doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true));

    const observers: { disconnect(): void }[] = [];
    afterNextRender(() => {
      const win = this.doc.defaultView;
      const footer = this.doc.querySelector('.site-footer');
      if (win && footer && typeof win.IntersectionObserver === 'function') {
        const io = new win.IntersectionObserver(
          (entries) => {
            this.footerNear = entries[entries.length - 1].isIntersecting;
            this.scheduleDock();
          },
          { rootMargin: FOOTER_NEAR_MARGIN },
        );
        io.observe(footer);
        observers.push(io);
      }
      if (win && typeof win.ResizeObserver === 'function') {
        // The footer's height changes when its text wraps; <main> growing (a list loading) moves the footer.
        const ro = new win.ResizeObserver(() => this.scheduleDock());
        for (const target of [footer, this.doc.querySelector('.site-main')]) if (target) ro.observe(target);
        observers.push(ro);
      }
      this.scheduleDock();
    });

    inject(DestroyRef).onDestroy(() => {
      observers.forEach((o) => o.disconnect());
      if (this.frame) this.doc.defaultView?.cancelAnimationFrame(this.frame);
      html.classList.remove('has-fab');
      html.style.removeProperty('--fab-dock');
    });
  }

  /** The button element, so a dialog opened another way (a `?add=1` address) can return focus to it. */
  element(): HTMLButtonElement {
    return this.button().nativeElement;
  }

  /** Recompute the dock on the next animation frame, at most once per frame (Brief H-245 D1). */
  protected scheduleDock(): void {
    const win = this.doc.defaultView;
    if (!win || this.frame) return;
    this.frame = win.requestAnimationFrame(() => {
      this.frame = 0;
      this.updateDock();
    });
  }

  private updateDock(): void {
    const win = this.doc.defaultView;
    const footer = this.doc.querySelector('.site-footer');
    let dock = 0;
    if (win && footer && this.footerNear) {
      // Rest bottom edge: the resolved `bottom` offset is unaffected by translate and the hover transform.
      const restBottom = this.doc.documentElement.clientHeight - parseFloat(win.getComputedStyle(this.element()).bottom);
      dock = fabDock(restBottom, footer.getBoundingClientRect().top);
      if (!Number.isFinite(dock)) dock = 0;
    }
    if (dock === this.lastDock) return;
    this.lastDock = dock;
    this.doc.documentElement.style.setProperty('--fab-dock', `${dock}px`);
  }

  protected onScroll(): void {
    this.scheduleDock();
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
