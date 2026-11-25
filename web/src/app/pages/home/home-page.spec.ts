import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { environment as devEnvironment } from '../../../environments/environment.development';
import { HomePage } from './home-page';

describe('HomePage', () => {
  async function render() {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('SYNC-159 (d) / IMP-060 / DECK-001 shows the headline and both import actions, linking to their pages', async () => {
    const el = await render();
    expect(el.querySelector('h1')?.textContent).toContain('Know what you own.');
    expect(el.querySelector('h1 .accent')?.textContent).toContain('Own what you need.');
    const hrefs = Array.from(el.querySelectorAll('.hero-actions a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/collection?add=1', '/decks?import=1']);
    const labels = Array.from(el.querySelectorAll('.hero-actions a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Add to your collection', 'Import deck']);
  });

  it('SYNC-159 (d) / AC 80 the "Import your cards" button and the step tiles open the dialogs; nothing links to /import', async () => {
    const el = await render();
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.filter((h) => h.startsWith('/import'))).toEqual([]);
    const steps = Array.from(el.querySelectorAll('.steps a')).map((a) => a.getAttribute('href'));
    expect(steps).toEqual(['/collection?add=1', '/decks?import=1', '/decks']);
    const cards = Array.from(el.querySelectorAll('.feature-actions a')).find((a) => a.textContent?.includes('Import your cards'));
    expect(cards?.getAttribute('href')).toBe('/collection?add=1');
  });

  it('shows the three ownership states in the fan, each with a text label', async () => {
    const el = await render();
    const chips = Array.from(el.querySelectorAll('.fan app-ownership-chip')).map((c) =>
      c.textContent?.trim(),
    );
    expect(chips).toEqual(['0 of 2 available', '1 of 3 available', '3 of 3 available']);
  });

  it('lists example events, the first open with its Top 8 Legend cards', async () => {
    const el = await render();
    const events = Array.from(el.querySelectorAll<HTMLDetailsElement>('details.event'));
    expect(events.length).toBe(3);
    expect(events.map((e) => e.open)).toEqual([true, false, false]);
    const entries = events[0].querySelectorAll('.entry');
    expect(entries.length).toBe(8);
    expect(entries[0].querySelector('.placing')?.textContent).toContain('1st');
    expect(entries[0].querySelector('.player')?.textContent).toContain('Player 1');
    expect(entries[0].querySelector('img')?.getAttribute('alt')).toBe('Legend A');
  });

  it('uses no meta wording', async () => {
    const text = (await render()).textContent!.toLowerCase();
    for (const word of [
      'win rate',
      'play rate',
      'tier',
      'meta',
      'trending',
      'popular',
      'best deck',
    ]) {
      expect(text).not.toContain(word);
    }
  });

  it('H-126 / SPEC-010 AC 63: the hero note reads "Free account" (every build is account-only)', async () => {
    const el = await render();
    expect(el.querySelector('.hero-note')?.textContent?.trim()).toBe('Free account');
  });

  it('SPEC-010 AC 35 / AC 63: no environment has a sign-in flag; production and development differ only in build settings', () => {
    // SPEC-013 TEST-001 (H-205): `testDataEnabled` is a feature flag for the test-data tool, not a sign-in flag.
    const keys = ['apiBaseUrl', 'appVersion', 'authProviders', 'firebase', 'production', 'testDataEnabled'];
    expect(Object.keys(environment).sort()).toEqual(keys);
    expect(Object.keys(devEnvironment).sort()).toEqual(keys);
    expect(devEnvironment.authProviders).toEqual(environment.authProviders);
    expect(devEnvironment.testDataEnabled).toBe(environment.testDataEnabled);
  });
});
