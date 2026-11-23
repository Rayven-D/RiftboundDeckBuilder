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
    const links = Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/decks', '/collection', '/tournaments']);
  });

  it('should show Import as the last item in the header, outside the tabs', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const header = (fixture.nativeElement as HTMLElement).querySelector('header')!;
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
