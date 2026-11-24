import { booleanAttribute, Component, computed, input } from '@angular/core';
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
    <div class="art" [class]="'art art--' + state()" [style.--fill]="fill()">
      @if (imageUrl(); as url) {
        <img class="card-image" [src]="url" [alt]="altText()" loading="lazy" />
        <img class="card-image dimmed" [src]="url" alt="" loading="lazy" aria-hidden="true" />
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
      background: #3a5f7d;
      color: #fff;
      font-size: var(--font-size-sm);
      text-align: center;
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

  protected readonly altText = computed(() =>
    this.decorative() ? '' : (this.alt() ?? this.name()),
  );
}
