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

  it('shows the headline with the accent line and both import actions', async () => {
    const el = await render();
    expect(el.querySelector('h1')?.textContent).toContain('Know what you own.');
    expect(el.querySelector('h1 .accent')?.textContent).toContain('Own what you need.');
    const hrefs = Array.from(el.querySelectorAll('.hero-actions a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/import?type=collection', '/import?type=deck']);
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
    const keys = ['apiBaseUrl', 'appVersion', 'authProviders', 'firebase', 'production'];
    expect(Object.keys(environment).sort()).toEqual(keys);
    expect(Object.keys(devEnvironment).sort()).toEqual(keys);
    expect(devEnvironment.authProviders).toEqual(environment.authProviders);
  });
});
