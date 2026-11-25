/** SPEC-012 "What's new" page (LOG-020…LOG-025, LOG-070; ACs 4, 5, 6). */
import { TestBed } from '@angular/core/testing';
import { CHANGELOG_DATA } from '../../core/changelog/changelog-data';
import { ChangelogPage } from './changelog-page';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function render(data?: unknown[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [ChangelogPage],
    providers: data ? [{ provide: CHANGELOG_DATA, useValue: data }] : [],
  });
  const fixture = TestBed.createComponent(ChangelogPage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const AC4 = [
  { version: '0.0.3', date: '2026-12-04', title: 'Faster Collection', bullets: ['Pages open faster.'] },
  { version: '0.0.2', date: '2026-11-28', title: 'Deck tweaks', bullets: ['Decks sort by name.', 'Deck names wrap.'] },
  { version: '0.0.1', date: null, title: 'Accounts are here', bullets: ['Sign in with your email.'] },
];

describe('SPEC-012 ChangelogPage', () => {
  it('LOG-002 / LOG-023 one h1 "What\'s new" and the intro line', async () => {
    const el = await render();
    expect(Array.from(el.querySelectorAll('h1')).map(text)).toEqual(["What's new"]);
    expect(text(el.querySelector('.page-lede'))).toBe("What's changed in Rift Builder, newest first.");
  });

  it('LOG-020 / LOG-021 / LOG-070 / AC 4 entries in file order: h2 title, version, <time> date, bullets as a nested <ul>', async () => {
    const el = await render(AC4);
    const items = Array.from(el.querySelectorAll('ol.entries > li'));
    expect(items).toHaveLength(3);
    const first = items[0];
    expect(text(first.querySelector('h2'))).toBe('Faster Collection');
    expect(text(first.querySelector('.meta'))).toContain('Version 0.0.3');
    const time = first.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2026-12-04');
    expect(text(time)).toBe('December 4, 2026');
    expect(Array.from(first.querySelectorAll('ul > li')).map(text)).toEqual(['Pages open faster.']);
    expect(text(items[1].querySelector('h2'))).toBe('Deck tweaks');
    // AC 10: heading order h1, h2, h2, h2
    expect(Array.from(el.querySelectorAll('h1, h2, h3, h4')).map((h) => h.tagName)).toEqual(['H1', 'H2', 'H2', 'H2']);
  });

  it('LOG-070 / H-222 the nested bullet list uses filled disc markers, not the second-level hollow circle', async () => {
    const el = await render(AC4);
    const bullets = el.querySelector('ol.entries ul.bullets')!;
    expect(getComputedStyle(bullets).listStyleType).toBe('disc');
  });

  it('LOG-021 / LOG-052 / AC 4 a null date shows "Coming soon" and no <time> element', async () => {
    const el = await render(AC4);
    const last = el.querySelectorAll('ol.entries > li')[2];
    expect(text(last.querySelector('.meta'))).toContain('Coming soon');
    expect(last.querySelector('time')).toBeNull();
  });

  it('LOG-024 / AC 5 skips an entry with no bullets and one with version 1.0.0, shows the valid one, and does not throw', async () => {
    const el = await render([
      { version: '0.0.3', date: '2026-12-04', title: 'Empty', bullets: [] },
      { version: '1.0.0', date: '2026-12-01', title: 'Wrong version', bullets: ['Something.'] },
      { version: '0.0.1', date: '2026-11-27', title: 'Valid', bullets: ['Something real.'] },
    ]);
    expect(Array.from(el.querySelectorAll('h2')).map(text)).toEqual(['Valid']);
    expect(el.textContent).not.toContain('Nothing to show yet.');
  });

  it('LOG-023 / LOG-024 / AC 5 an empty array, or only bad entries, shows "Nothing to show yet."', async () => {
    for (const data of [[], [{ version: 'x' }, null]]) {
      TestBed.resetTestingModule();
      const el = await render(data);
      expect(text(el.querySelector('.empty'))).toBe('Nothing to show yet.');
      expect(el.querySelector('ol')).toBeNull();
    }
  });

  it('LOG-022 title and bullet text is plain text, never HTML', async () => {
    const el = await render([{ version: '0.0.1', date: null, title: '<b>Bold</b>', bullets: ['<img src=x>'] }]);
    expect(el.querySelector('b, img')).toBeNull();
    expect(text(el.querySelector('h2'))).toBe('<b>Bold</b>');
  });

  it('LOG-050 / LOG-052 / AC 6 with the shipped file the only entry is Version 0.0.1, Coming soon, Accounts are here, 5 bullets', async () => {
    const el = await render();
    const items = el.querySelectorAll('ol.entries > li');
    expect(items).toHaveLength(1);
    expect(text(items[0].querySelector('h2'))).toBe('Accounts are here');
    expect(text(items[0].querySelector('.meta'))).toContain('Version 0.0.1');
    expect(text(items[0].querySelector('.meta'))).toContain('Coming soon');
    expect(items[0].querySelectorAll('ul > li')).toHaveLength(5);
  });

  it('LOG-025 shows no appVersion, build id or statistic', async () => {
    const el = await render();
    expect(el.textContent).not.toMatch(/web-(prod|preview|dev)|win rate|play rate|tier/i);
  });
});
