import { Component } from '@angular/core';

/**
 * Our deck-stack mark (three stacked cards, as in the favicon) drawn as a faded outline. Decorative:
 * used behind the home page fan and on empty states. Size it with `width` on the host.
 */
@Component({
  selector: 'app-deck-mark',
  host: { 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 32 32" focusable="false">
      <rect x="12.5" y="1.5" width="17" height="22" rx="1.5" />
      <rect x="7.5" y="5" width="17" height="22" rx="1.5" />
      <rect x="2.5" y="8.5" width="17" height="22" rx="1.5" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: auto;
      fill: none;
      stroke: var(--color-border);
      stroke-width: 0.6;
    }
  `,
})
export class DeckMark {}
