import { Component } from '@angular/core';
import { sampleCardArt } from '../../shared/deck/sample-art';
import { Icon } from '../../shared/icon';

interface ExamplePlacing {
  readonly placing: string;
  readonly player: string;
  readonly legend: string;
  readonly color: string;
}

interface ExampleEvent {
  readonly name: string;
  readonly when: string;
  readonly top8: readonly ExamplePlacing[];
}

const LEGEND_COLORS = [
  '#6c4fa3',
  '#b8563a',
  '#2f8f6b',
  '#3f6fb8',
  '#a3456c',
  '#8a7a2f',
  '#2f7f8f',
  '#5a6170',
];
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

function exampleTop8(offset: number): readonly ExamplePlacing[] {
  return ORDINALS.map((placing, i) => {
    const l = (i + offset) % LEGEND_COLORS.length;
    return {
      placing,
      player: `Player ${i + 1}`,
      legend: `Legend ${String.fromCharCode(65 + l)}`,
      color: LEGEND_COLORS[l],
    };
  });
}

/**
 * Home page "Winning decks" example (RJ, 2026-11-23): events as the top level, each expanding to its
 * Top 8 with the Legend card, player and Legend name. Phones swipe through a
 * row of Legend cards; tablets and desktops show a grid (4 or 8 across). Invented example data,
 * placings only (CAT-011), no stats (ADR-0003). Uses native details/summary for expand/collapse.
 */
@Component({
  selector: 'app-top-eight-panel',
  imports: [Icon],
  template: `
    @for (event of events; track event.name; let first = $first) {
      <details class="event" [open]="first">
        <summary class="event-summary">
          <span class="event-text">
            <span class="event-name">{{ event.name }}</span>
            <span class="event-when">{{ event.when }} · Top 8</span>
          </span>
          <app-icon class="event-chevron" name="chevron_right" />
        </summary>
        <ol class="top8">
          @for (p of event.top8; track p.placing; let i = $index) {
            <li class="entry">
              <span class="art-wrap">
                <img class="legend-art" [src]="art(p, i)" [alt]="p.legend" loading="lazy" />
                <span class="placing">{{ p.placing }}</span>
              </span>
              <span class="who">
                <span class="player">{{ p.player }}</span>
                <span class="legend">{{ p.legend }}</span>
              </span>
            </li>
          }
        </ol>
      </details>
    }
  `,
  styleUrl: './top-eight-panel.scss',
})
export class TopEightPanel {
  protected readonly events: readonly ExampleEvent[] = [
    { name: 'Example Regional Championship', when: 'Nov 2026', top8: exampleTop8(0) },
    { name: 'Example Regional Qualifier', when: 'Oct 2026', top8: exampleTop8(3) },
    { name: 'Example Store Championship', when: 'Oct 2026', top8: exampleTop8(5) },
  ];

  protected art(p: ExamplePlacing, i: number): string {
    return sampleCardArt(p.color, i);
  }
}
