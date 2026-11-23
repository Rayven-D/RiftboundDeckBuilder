import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from './shared/icon';

interface NavItem {
  path: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButton, Icon],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Main tabs. Import is not a tab: it is the raised action at the far right of the header. */
  protected readonly nav: NavItem[] = [
    { path: '/decks', label: 'Decks' },
    { path: '/collection', label: 'Collection' },
    { path: '/tournaments', label: 'Tournaments' },
  ];
}
