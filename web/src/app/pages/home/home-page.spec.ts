import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home-page';

describe('HomePage', () => {
  async function render() {
    TestBed.configureTestingModule({ imports: [HomePage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the headline with the accent line and both import actions', async () => {
    const el = await render();
    expect(el.querySelector('h1')?.textContent).toContain('Know what you own.');
    expect(el.querySelector('h1 .accent')?.textContent).toContain('See what you need.');
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
    expect(chips).toEqual(['0 of 2 owned', '1 of 3 owned', '3 of 3 owned']);
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
});
