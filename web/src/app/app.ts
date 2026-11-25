import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountMenu } from './core/sync/account-menu';
import { AccountTab } from './core/sync/account-tab';
import { ThemeToggle } from './core/theme/theme-toggle';
import { Icon, IconName } from './shared/icon';

interface NavItem {
  path: string;
  label: string;
}

interface TabItem extends NavItem {
  icon: IconName;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, Icon, AccountMenu, ThemeToggle],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '(window:scroll)': 'onScroll()' },
})
export class App {
  /** Main tabs. There is no Import page (SYNC-159): each import opens from its own page. */
  protected readonly nav: NavItem[] = [
    { path: '/decks', label: 'Decks' },
    { path: '/collection', label: 'Collection' },
    { path: '/tournaments', label: 'Tournaments' },
  ];

  /**
   * Phone bottom bar (RJ, 2026-11-24; SYNC-150: no Import), each an icon over its label. The fourth item, the
   * account (SYNC-150 g), comes from the deferred account menu through `accountTab`.
   */
  protected readonly tabs: TabItem[] = [
    { path: '/decks', label: 'Decks', icon: 'playing_cards' },
    { path: '/collection', label: 'Collection', icon: 'stacks' },
    { path: '/tournaments', label: 'Tournaments', icon: 'trophy' },
  ];

  protected readonly accountTab = inject(AccountTab);

  /** The header shows its bottom border once the page has scrolled under it. */
  protected readonly scrolled = signal(false);

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

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
