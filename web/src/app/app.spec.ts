/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Component } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the text wordmark and main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.wordmark')?.textContent).toContain('Rift Builder');
    const links = Array.from(el.querySelectorAll('.site-nav a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/decks', '/collection', '/tournaments']);
  });

  it('SYNC-150 / AC 71 the header has no Import button: the account control (deferred) is the only item after the tabs', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const header = (fixture.nativeElement as HTMLElement).querySelector('header .header-row')!;
    expect(header.querySelector('.import-action')).toBeNull();
    expect(Array.from(header.querySelectorAll('a')).map((a) => a.getAttribute('href'))).not.toContain('/import');
    expect(header.textContent).not.toMatch(/\bImport\b/);
  });

  it('SYNC-158 (a) / AC 79 / AC 82 the header holds one theme toggle "Dark theme", after the tabs and immediately before the account control, rendered at once (not deferred)', async () => {
    const fixture = TestBed.createComponent(App);
    const header = (fixture.nativeElement as HTMLElement).querySelector('header .header-row')!;
    // before any change detection or defer block has run, the toggle is already in the template's first render
    fixture.detectChanges();
    const toggles = header.querySelectorAll('button[aria-label="Dark theme"]');
    expect(toggles).toHaveLength(1);
    const actions = header.querySelector('.header-actions')!;
    expect(actions.previousElementSibling?.matches('nav.site-nav')).toBe(true);
    expect(actions.firstElementChild?.tagName.toLowerCase()).toBe('app-theme-toggle');
    await fixture.whenStable();
    // the deferred account control follows the toggle in the same group (DOM and Tab order: tabs, toggle, account)
    expect(actions.children[1]?.tagName.toLowerCase()).toBe('app-account-menu');
  });

  it('SYNC-158 (d) / SYNC-104 (e) / AC 69 / AC 79 the footer holds no Theme control (v0.17.0)', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;
    expect(footer.querySelector('app-theme-switch, app-theme-toggle, [role="radiogroup"], button')).toBeNull();
    expect(footer.textContent).not.toMatch(/Theme|System/);
    expect(footer.querySelector('.legal')).not.toBeNull();
  });

  it("SPEC-012 LOG-010 / LOG-012 / AC 2 the footer has a real What's new link to /changelog in the footer links row, same tab", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;
    const links = Array.from(footer.querySelectorAll<HTMLAnchorElement>('.footer-row a'));
    const link = links.find((a) => a.textContent?.trim() === "What's new")!;
    expect(link.getAttribute('href')).toBe('/changelog');
    expect(link.getAttribute('target')).toBeNull();
    link.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/changelog');
  });

  it('SYNC-104 (e, g) / AC 69 the footer has a real Privacy notice link to /privacy, first in the links row, above the unchanged Riot legal line, same tab', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;
    const links = Array.from(footer.querySelectorAll<HTMLAnchorElement>('.footer-links a'));
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Privacy notice', "What's new"]);
    const link = links[0];
    expect(link.getAttribute('href')).toBe('/privacy');
    expect(link.getAttribute('target')).toBeNull();
    expect(link.tabIndex).toBe(0);
    expect(link.closest('.footer-row')?.nextElementSibling?.classList.contains('legal')).toBe(true);
    expect(footer.querySelector('.legal')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      `Rift Builder was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.`,
    );
    expect(link.getAttribute('aria-current')).toBeNull();
    link.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/privacy');
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it("SPEC-012 LOG-070 / H-222 the footer What's new link has aria-current=\"page\" on /changelog only", async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const link = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.footer-links a')).find(
        (a) => a.textContent?.trim() === "What's new",
      )!;
    await router.navigateByUrl('/');
    await fixture.whenStable();
    expect(link().getAttribute('aria-current')).toBeNull();
    await router.navigateByUrl('/changelog');
    await fixture.whenStable();
    expect(link().getAttribute('aria-current')).toBe('page');
    await router.navigateByUrl('/decks');
    await fixture.whenStable();
    expect(link().getAttribute('aria-current')).toBeNull();
  });

  it("SPEC-012 LOG-012 What's new is not in the main tabs or the phone tab bar", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    for (const nav of ['.site-nav', 'nav.tab-bar']) {
      expect(el.querySelector(nav)?.textContent).not.toContain("What's new");
      expect(el.querySelector(`${nav} a[href="/changelog"]`)).toBeNull();
    }
  });

  it('should show the Legal Jibber Jabber notice in the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer =
      (fixture.nativeElement as HTMLElement).querySelector('footer')?.textContent ?? '';
    expect(footer).toContain(`created under Riot Games' "Legal Jibber Jabber" policy`);
    expect(footer).toContain('Riot Games does not endorse or sponsor this project.');
  });
});

@Component({ template: '<h1>Stub page</h1>' })
class StubPage {}

describe('App phone tab bar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('SYNC-150 / AC 71 / AC 81 the links are exactly Decks, Collection and Tournaments (no Import tab), each with an icon and a label, then the account column', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('nav.tab-bar')!;
    expect(bar.getAttribute('aria-label')).toBe('Main');
    const links = Array.from(bar.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/decks',
      '/collection',
      '/tournaments',
    ]);
    expect(links.map((a) => a.querySelector('.tab-label')?.textContent?.trim())).toEqual([
      'Decks',
      'Collection',
      'Tournaments',
    ]);
    for (const a of links) expect(a.querySelector('app-icon')).not.toBeNull();
    // SYNC-150 (g): the fourth column, after Tournaments, is the account (filled by the deferred account menu)
    const items = Array.from(bar.querySelectorAll(':scope > ul > li'));
    expect(items).toHaveLength(4);
    expect(items[3].classList).toContain('tab-account');
    expect(items[3].querySelector('a')).toBeNull();
  });

  it('SYNC-150 (g) / AC 81 four equal columns at phone width; the column is reserved before the account code loads', () => {
    const scss = readFileSync(resolve(process.cwd(), 'src/app/app.scss'), 'utf8');
    expect(scss).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
      deferBlockBehavior: DeferBlockBehavior.Manual, // the deferred account menu hasn't loaded yet
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const col = (fixture.nativeElement as HTMLElement).querySelector('nav.tab-bar .tab-account')!;
    expect(col).not.toBeNull();
    expect(col.querySelector('button, a, [tabindex]')).toBeNull();
  });

  it('marks only the current page with aria-current="page"', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const bar = () => (fixture.nativeElement as HTMLElement).querySelector('nav.tab-bar')!;
    const current = () =>
      Array.from(bar().querySelectorAll('a'))
        .filter((a) => a.getAttribute('aria-current') === 'page')
        .map((a) => a.getAttribute('href'));

    await router.navigateByUrl('/collection');
    await fixture.whenStable();
    expect(current()).toEqual(['/collection']);

    await router.navigateByUrl('/tournaments');
    await fixture.whenStable();
    expect(current()).toEqual(['/tournaments']);

    await router.navigateByUrl('/');
    await fixture.whenStable();
    expect(current()).toEqual([]);
  });
});

describe('App skip link', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: StubPage },
          { path: 'tournaments', component: StubPage },
        ]),
      ],
    }).compileComponents();
  });

  it('focuses main without navigating away from a non-root route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/tournaments');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const skip = el.querySelector<HTMLAnchorElement>('.skip-link')!;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    skip.dispatchEvent(click);
    await fixture.whenStable();

    // jsdom never follows an anchor click, so the real guard against the old bug
    // (href="#main" resolving to "/#main" under <base href="/">) is that the click is cancelled.
    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(el.querySelector('main'));
  });
});
