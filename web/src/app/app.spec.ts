import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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

  it('SYNC-158 (a) / AC 79 the footer holds the Theme switch (System, Light, Dark) next to the Riot legal line', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer = (fixture.nativeElement as HTMLElement).querySelector('footer')!;
    const group = footer.querySelector('[role="radiogroup"]')!;
    expect(group).not.toBeNull();
    const labelId = group.getAttribute('aria-labelledby')!;
    expect(footer.querySelector(`#${labelId}`)?.textContent?.trim()).toBe('Theme');
    expect(Array.from(group.querySelectorAll('button')).map((b) => b.textContent?.trim())).toEqual(['System', 'Light', 'Dark']);
    expect(footer.querySelector('.legal')).not.toBeNull();
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

  it('SYNC-150 / AC 71 lists exactly Decks, Collection and Tournaments (no Import tab), each with an icon and a label', async () => {
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
