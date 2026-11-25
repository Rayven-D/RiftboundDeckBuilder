import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { SIGN_IN_ENABLED } from './core/sync/sign-in-flag';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      // Local-only mode (SYNC-008): no sign-in gate. The gate is covered in pages/gated-pages.spec.ts.
      providers: [provideRouter(routes, withComponentInputBinding()), { provide: SIGN_IN_ENABLED, useValue: false }],
    });
  });

  it('shows the home page at the root path', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Own what you need.',
    );
  });

  it('renders /decks', async () => {
    const harness = await RouterTestingHarness.create('/decks');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Decks');
  });

  it.each([
    ['/import', 'Import'],
    ['/collection', 'Collection'],
    ['/tournaments', 'Tournaments'],
    ['/decks/abc', 'Deck detail'],
    ['/styleguide', 'Kennen: ASC Evansrhim'],
  ])('renders %s', async (url, title) => {
    const harness = await RouterTestingHarness.create(url);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(title);
  });

  it('passes the deck id route param into the deck detail page', async () => {
    const harness = await RouterTestingHarness.create('/decks/abc');
    expect(harness.routeNativeElement?.textContent).toContain('Deck abc');
  });

  it('redirects unknown paths to the home page', async () => {
    await RouterTestingHarness.create('/nope');
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
