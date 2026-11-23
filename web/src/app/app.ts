import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly nav: NavItem[] = [
    { path: '/decks', label: 'Decks I can build' },
    { path: '/collection', label: 'My collection' },
    { path: '/import', label: 'Import' },
    { path: '/tournaments', label: 'Tournaments' },
  ];
}
