import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { CardTile } from '../../shared/deck/card-tile';
import { sampleCardArt } from '../../shared/deck/sample-art';
import { Icon, IconName } from '../../shared/icon';
import { OwnershipFan } from './ownership-fan';
import { TopEightPanel } from './top-eight-panel';

export interface FanCard {
  readonly name: string;
  readonly owned: number;
  readonly required: number;
  readonly color: string;
}

interface StepTile {
  readonly icon: IconName;
  readonly title: string;
  readonly subtitle: string;
  readonly link: string;
  readonly query?: Record<string, string>;
}

/**
 * Home page (RJ, 2026-11-23, after the Rift Atlas reference and ui-builder's proposal): what Rift
 * Decks does, the ownership fan, three steps, and two feature sections. All card visuals are
 * abstract placeholders until card art comes from the Riot API. No meta statistics.
 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, MatButton, Icon, CardTile, OwnershipFan, TopEightPanel],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  protected readonly steps: readonly StepTile[] = [
    {
      icon: 'stacks',
      title: 'Add your cards',
      subtitle: 'Paste a list, CSV or Excel',
      link: '/import',
      query: { type: 'collection' },
    },
    {
      icon: 'playing_cards',
      title: 'Add a deck',
      subtitle: 'Paste any deck list',
      link: '/import',
      query: { type: 'deck' },
    },
    {
      icon: 'content_copy',
      title: "See what's missing",
      subtitle: 'Card by card, for every deck',
      link: '/decks',
    },
  ];

  /** Example deck panel, in ascending ownership: 0, 1, 2, then 3 copies owned. */
  protected readonly showcase: readonly FanCard[] = [
    { name: 'Void Gate', owned: 0, required: 2, color: '#6c4fa3' },
    { name: 'Rally Banner', owned: 1, required: 3, color: '#b8563a' },
    { name: 'Storm Caller', owned: 2, required: 3, color: '#2f8f6b' },
    { name: 'Hextech Ray', owned: 3, required: 3, color: '#3f6fb8' },
  ];

  protected art(card: FanCard, i: number): string {
    return sampleCardArt(card.color, i);
  }
}
