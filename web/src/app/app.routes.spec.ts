import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { provideOpenGate } from './core/sync/testing/open-gate';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      // Signed in and synced: the gate is open (SYNC-009). The gate is covered in pages/gated-pages.spec.ts.
      providers: [provideRouter(routes, withComponentInputBinding()), provideOpenGate()],
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

  it.each(['/import', '/import?type=deck', '/import?type=collection'])(
    'SYNC-159 (a) / AC 80 %s goes to Home like any unknown path (no Import page, no not-found page)',
    async (url) => {
      const harness = await RouterTestingHarness.create(url);
      // The catch-all keeps a query string as for any unknown path (`/nope?x=1` → `/?x=1`): Home either way.
      expect(TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).root.children['primary']).toBeUndefined();
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Own what you need.');
      expect(harness.routeNativeElement?.textContent).not.toMatch(/Import cards to your collection|Import deck lists/);
    },
  );

  it('SYNC-159 (a) there is no import route', () => {
    expect(routes.some((r) => r.path === 'import')).toBe(false);
  });
});
