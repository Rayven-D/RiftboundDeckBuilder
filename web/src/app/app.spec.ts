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

  it('should show Import as the last item in the header, outside the tabs', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const header = (fixture.nativeElement as HTMLElement).querySelector('header .header-row')!;
    const last = header.lastElementChild as HTMLAnchorElement;
    expect(last.classList).toContain('import-action');
    expect(last.getAttribute('href')).toBe('/import');
    expect(last.textContent).toContain('Import');
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

  it('lists Decks, Collection, Tournaments and Import, each with an icon and a label', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('nav.tab-bar')!;
    expect(bar.getAttribute('aria-label')).toBe('Main');
    const links = Array.from(bar.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/decks',
      '/collection',
      '/tournaments',
      '/import',
    ]);
    expect(links.map((a) => a.querySelector('.tab-label')?.textContent?.trim())).toEqual([
      'Decks',
      'Collection',
      'Tournaments',
      'Import',
    ]);
    for (const a of links) expect(a.querySelector('app-icon')).not.toBeNull();
    expect(links[3].classList).toContain('tab--action');
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

    await router.navigateByUrl('/import');
    await fixture.whenStable();
    expect(current()).toEqual(['/import']);

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
          { path: 'import', component: StubPage },
        ]),
      ],
    }).compileComponents();
  });

  it('focuses main without navigating away from a non-root route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/import');
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
