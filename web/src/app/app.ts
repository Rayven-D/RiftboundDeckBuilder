import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountMenu } from './core/sync/account-menu';
import { SIGN_IN_ENABLED } from './core/sync/sign-in-flag';
import { Icon, IconName } from './shared/icon';

interface NavItem {
  path: string;
  label: string;
}

interface TabItem extends NavItem {
  icon: IconName;
  /** The main action (Import): drawn in the accent so it still reads as the primary button. */
  action?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButton, Icon, AccountMenu],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '(window:scroll)': 'onScroll()' },
})
export class App {
  /** Main tabs. Import is not a tab: it is the raised action at the far right of the header. */
  protected readonly nav: NavItem[] = [
    { path: '/decks', label: 'Decks' },
    { path: '/collection', label: 'Collection' },
    { path: '/tournaments', label: 'Tournaments' },
  ];

  /** Phone bottom bar (RJ, 2026-11-24): the same tabs plus Import, each an icon over its label. */
  protected readonly tabs: TabItem[] = [
    { path: '/decks', label: 'Decks', icon: 'playing_cards' },
    { path: '/collection', label: 'Collection', icon: 'stacks' },
    { path: '/tournaments', label: 'Tournaments', icon: 'trophy' },
    { path: '/import', label: 'Import', icon: 'upload', action: true },
  ];

  /** The header shows its bottom border once the page has scrolled under it. */
  protected readonly scrolled = signal(false);

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /** SPEC-010 SYNC-007: the account control (and the sync code) loads only when sign-in is enabled. */
  protected readonly signInEnabled = inject(SIGN_IN_ENABLED);

  protected onScroll(): void {
    this.scrolled.set(window.scrollY > 4);
  }

  /**
   * With `<base href="/">` a bare `#main` href resolves to `/#main`, which would navigate home from
   * any other route. Keep the href for semantics, but move focus to `<main>` in place instead.
   */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
