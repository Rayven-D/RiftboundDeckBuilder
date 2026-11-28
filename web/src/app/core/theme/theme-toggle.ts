import { DOCUMENT } from '@angular/common';
import { ApplicationRef, Component, computed, inject, signal } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { Icon } from '../../shared/icon';
import { canAnimate, startScopedTransition } from '../../shared/scoped-transition';
import { ThemeService } from './theme.service';

/**
 * SPEC-010 SYNC-158 (v0.17.0, H-246): the one theme control, a light/dark icon toggle in the header for everyone.
 *
 * A native button with the fixed name "Dark theme" and `aria-pressed` (true while the effective theme is dark).
 * The icon shows the current theme (moon while dark, sun while light; RJ accepted, brief choice 1); the tooltip
 * describes the action. Not part of the deferred account code: it renders at once, loads no Firebase and makes no
 * request (SYNC-002), so the header doesn't shift when the account control arrives.
 */
@Component({
  selector: 'app-theme-toggle',
  imports: [Icon, MatTooltip],
  template: `
    <button
      type="button"
      class="theme-toggle"
      aria-label="Dark theme"
      [attr.aria-pressed]="dark()"
      [matTooltip]="tooltip()"
      matTooltipPosition="below"
      [matTooltipShowDelay]="300"
      (click)="toggle()"
    >
      <!-- Re-created on every change, so the swap animation plays (only after a toggle, never on load). H-468 (1): an
           @switch, not a one-item @for tracked by identity (that re-creation raised the dev warning NG0956). -->
      @switch (dark()) {
        @case (true) {
          <app-icon [class.swap]="swapped()" name="dark_mode" />
        }
        @default {
          <app-icon [class.swap]="swapped()" name="light_mode" />
        }
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    /* Brief H-246 T2: 44 x 44 hit area, icon centred, no border; muted at rest, the account trigger's hover. The
       pressed state is carried by the icon, not by a fill. */
    .theme-toggle {
      display: inline-grid;
      place-items: center;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-muted);
      font-size: 22px;
      cursor: pointer;
      transition:
        color var(--dur-fast) var(--ease-out),
        background-color var(--dur-fast) var(--ease-out);
    }
    .theme-toggle:hover {
      color: var(--color-text);
      background: var(--color-surface-raised);
    }
    .swap {
      animation: theme-icon-in var(--dur-fast) var(--ease-out);
    }
    @keyframes theme-icon-in {
      from {
        opacity: 0;
        transform: rotate(-30deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .swap {
        animation: none;
      }
    }
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly dark = computed(() => this.theme.effective() === 'dark');
  protected readonly tooltip = computed(() => (this.dark() ? 'Switch to light theme' : 'Switch to dark theme'));
  /** The icon animates only after the user toggles, not on the first paint or a reload. */
  protected readonly swapped = signal(false);

  private readonly doc = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);

  /**
   * Brief H-716 S3: the page, header, tab bar and footer change together in one cross-fade (`vt-theme`, styles.scss).
   * Without view transitions or under reduced motion: `theme-switching` turns transitions off for two frames, so
   * everything changes in the same frame.
   */
  protected toggle(): void {
    this.swapped.set(true);
    if (canAnimate(this.doc)) {
      void startScopedTransition(
        () => {
          this.theme.toggle();
          this.appRef.tick();
        },
        'vt-theme',
        this.doc,
      );
      return;
    }
    const root = this.doc.documentElement;
    root.classList.add('theme-switching');
    this.theme.toggle();
    const raf = this.doc.defaultView?.requestAnimationFrame?.bind(this.doc.defaultView);
    if (raf) raf(() => raf(() => root.classList.remove('theme-switching')));
    else root.classList.remove('theme-switching');
  }
}
