import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes, withComponentInputBinding())] });
  });

  it('redirects the root path to /decks', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/decks');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Decks I can build');
  });

  it.each([
    ['/import', 'Import collection'],
    ['/collection', 'My collection'],
    ['/tournaments', 'Tournaments'],
    ['/decks/abc', 'Deck detail'],
  ])('renders %s', async (url, title) => {
    const harness = await RouterTestingHarness.create(url);
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(title);
  });

  it('passes the deck id route param into the deck detail page', async () => {
    const harness = await RouterTestingHarness.create('/decks/abc');
    expect(harness.routeNativeElement?.textContent).toContain('Deck abc');
  });

  it('redirects unknown paths to /decks', async () => {
    await RouterTestingHarness.create('/nope');
    expect(TestBed.inject(Router).url).toBe('/decks');
  });
});
