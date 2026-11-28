import { booleanAttribute, Component, computed, input, signal } from '@angular/core';
import { OwnershipState } from './ownership';

/**
 * Card image with the ownership treatment (SPEC-005 OWN-030..036): full color, left-to-right
 * partial fill with a 1px divider, or dimmed. Only the image is darkened. Used by the deck tile and
 * the home page fan.
 *
 * Accessibility: the image's alt text is the card name by default (or `alt` when given). Set
 * `decorative` when the name is already shown or announced next to the image (e.g. the card tile's
 * heading); the image then gets `alt=""` and the missing-image placeholder is hidden from assistive
 * technology, so the name is not read twice.
 */
@Component({
  selector: 'app-card-art',
  template: `
    <div
      class="art"
      [class]="'art art--' + state()"
      [class.art--fill-in]="animateFill()"
      [class.art--fill-change]="animateChange()"
      [class.art--landscape]="isLandscape()"
      [style.--fill]="fill()"
    >
      @if (imageUrl(); as url) {
        <img
          class="card-image"
          [src]="url"
          [alt]="altText()"
          [attr.loading]="eager() ? 'eager' : 'lazy'"
          [attr.fetchpriority]="eager() ? 'high' : null"
          (load)="onLoad($event)"
        />
        <img
          class="card-image dimmed"
          [src]="url"
          alt=""
          [attr.loading]="eager() ? 'eager' : 'lazy'"
          aria-hidden="true"
        />
      } @else {
        <div class="card-image placeholder" [attr.aria-hidden]="decorative() ? 'true' : null">
          {{ name() }}
        </div>
        <div class="card-image placeholder dimmed" aria-hidden="true">{{ name() }}</div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .art {
      position: relative;
    }
    /* The dimmed copy covers the part that is not owned: everything right of the fill edge. */
    .dimmed {
      position: absolute;
      inset: 0;
      filter: grayscale(1) brightness(0.55);
      clip-path: inset(0 0 0 calc(var(--fill) * 100%));
    }
    .art--full .dimmed {
      display: none;
    }
    /* Landscape art (battlefields) is shown whole inside the 63:88 frame, letterboxed on the
       raised surface, never cropped (H-095 fix 2). */
    .art--landscape .card-image {
      object-fit: contain;
      background: var(--color-surface-raised);
    }
    .art--partial::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: calc(var(--fill) * 100%);
      width: 1px;
      background: rgb(255 255 255 / 85%);
    }
    .placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      background: var(--color-art-placeholder);
      color: #fff;
      font-size: var(--font-size-sm);
      text-align: center;
    }
    /*
     * Optional one-time fill (home hero, RJ 2026-11-24): the color fills left to right from the
     * dimmed state to the owned fraction. CSS only, and the end state is the resting style, so the
     * art is correct if the animation never runs. Timing comes from --fill-delay / --fill-duration.
     */
    @media (prefers-reduced-motion: no-preference) {
      .art--fill-in .dimmed {
        animation: fill-in var(--fill-duration, 600ms) var(--ease-out) var(--fill-delay, 0ms)
          backwards;
      }
      .art--fill-in.art--full .dimmed {
        display: block;
        clip-path: inset(0 0 0 100%);
      }
      .art--fill-in.art--partial::after {
        animation: divider-in var(--fill-duration, 600ms) var(--ease-out) var(--fill-delay, 0ms)
          backwards;
      }
    }
    @keyframes fill-in {
      from {
        clip-path: inset(0 0 0 0);
      }
    }
    @keyframes divider-in {
      from {
        left: 0;
        opacity: 0;
      }
    }
    /* OWN-035 (v0.9, H-060): a fill that changes while the view is open moves over --dur-fill (180 ms); the first
       render has nothing to transition from, and reduced motion makes it instant (global rule). */
    .art--fill-change .dimmed {
      transition: clip-path var(--dur-fill, 180ms) var(--ease-out);
    }
    .art--fill-change::after {
      transition: left var(--dur-fill, 180ms) var(--ease-out);
    }
    @media (forced-colors: active) {
      .art--partial::after {
        background: CanvasText;
      }
    }
  `,
})
export class CardArt {
  readonly name = input.required<string>();
  readonly state = input.required<OwnershipState>();
  /** Owned fraction in [0, 1]. */
  readonly fill = input.required<number>();
  readonly imageUrl = input<string | null>(null);
  /** Image alt text; defaults to the card name. Ignored when `decorative` is set. */
  readonly alt = input<string>();
  /** The name is already shown or announced nearby: render the image with `alt=""`. */
  readonly decorative = input(false, { transform: booleanAttribute });
  /** Play the left-to-right fill once when first shown (decorative use on the home page). */
  readonly animateFill = input(false, { transform: booleanAttribute });

  /** Animate a fill change after the first render over `--dur-fill` (OWN-035; the deck tile's Legend art). */
  readonly animateChange = input(false, { transform: booleanAttribute });

  /** First row of a list: load now, not lazily (it is likely the LCP image; NG0913). */
  readonly eager = input(false, { transform: booleanAttribute });

  /**
   * Known orientation from the caller (e.g. the card's category is battlefield). When set it wins
   * from the first frame, so a battlefield never flashes cropped. null = measure the loaded image.
   */
  readonly landscape = input<boolean | null>(null);

  /**
   * Orientation measured from the last loaded image, with the card it belongs to. It is kept across
   * URL changes for the same card (thumbnail → full swap) until the new image loads, and only
   * applies while the card name matches (a recycled tile showing another card starts as cover).
   */
  private readonly measured = signal<{ name: string; landscape: boolean } | null>(null);
  /** Shown whole with `contain` (H-095 fix 2). */
  protected readonly isLandscape = computed(() => {
    const known = this.landscape();
    if (known !== null) return known;
    const m = this.measured();
    return m !== null && m.name === this.name() && m.landscape;
  });

  protected onLoad(e: Event): void {
    const img = e.target as HTMLImageElement;
    this.measured.set({ name: this.name(), landscape: img.naturalWidth > img.naturalHeight });
  }

  protected readonly altText = computed(() =>
    this.decorative() ? '' : (this.alt() ?? this.name()),
  );
}
