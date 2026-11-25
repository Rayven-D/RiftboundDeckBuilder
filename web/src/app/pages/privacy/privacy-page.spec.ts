/** SPEC-010 privacy notice page `/privacy` (SYNC-101, SYNC-103, SYNC-104 b, g; ACs 65, 66), H-180. */
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PRIVACY_NOTICE_TEXT } from '../../core/privacy/privacy-notice-text';
import { PrivacyPage } from './privacy-page';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const DATE_MARKER = '[set on release: date dev → main ships sign-in]';
/** The date line as the sign-in release step left it (2026-11-25). */
const RELEASED_LINE = 'Effective 2026-11-25 · Last updated 2026-11-25';
/** AC 66 (v0.17.2, H-249): case-sensitive strings the notice text must not contain. */
const ABSENT = ['Dallas', 'Texas', 'us-south1', 'Firestore', 'Firebase Authentication', 'Firebase Hosting', 'or system'];

async function render(notice?: string): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [PrivacyPage],
    providers: [
      provideRouter([{ path: 'changelog', children: [] }]),
      ...(notice !== undefined ? [{ provide: PRIVACY_NOTICE_TEXT, useValue: notice }] : []),
    ],
  });
  const fixture = TestBed.createComponent(PrivacyPage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('SPEC-010 PrivacyPage (SYNC-104)', () => {
  it('SYNC-104 (b, g) / AC 65 one h1 "Privacy notice", then the effective and last-updated date line', async () => {
    const el = await render();
    expect(Array.from(el.querySelectorAll('h1')).map(text)).toEqual(['Privacy notice']);
    const dates = el.querySelector('h1 + p.dates');
    expect(text(dates)).toBe(RELEASED_LINE);
  });

  it('SYNC-103 / AC 66 a notice still holding the release-day date marker shows it as written, nothing invented', async () => {
    const real = TestBed.inject(PRIVACY_NOTICE_TEXT);
    TestBed.resetTestingModule();
    expect(real).toContain(RELEASED_LINE);
    const el = await render(real.replace(RELEASED_LINE, `Effective ${DATE_MARKER} · Last updated ${DATE_MARKER}`));
    expect(text(el).split(DATE_MARKER)).toHaveLength(3); // exactly twice
    expect(text(el)).not.toMatch(/Effective \d{4}-\d{2}-\d{2}/);
  });

  it("SYNC-101 / AC 66 the release step replaced the marker with the day's date: the shipped page shows 2026-11-25 twice and no marker", async () => {
    const el = await render();
    expect(text(el.querySelector('p.dates'))).toBe(RELEASED_LINE);
    expect(text(el).split('2026-11-25')).toHaveLength(3); // exactly twice
    expect(text(el)).not.toContain('[set on release');
  });

  it('SYNC-101 / SYNC-103 / AC 66 the page states every checklist string the AC names', async () => {
    const el = await render();
    const all = text(el);
    for (const s of [
      'Rift Builder, an independent fan project',
      'riftbuilder.support@gmail.com',
      'IP address and user agent',
      'United States',
      '180 days',
      'Do Not Track',
      'Global Privacy Control',
      'no cookies',
      'Riot Games does not endorse or sponsor this project.',
      'under 16',
      'request logs',
      'Google (Firebase)',
      'light or dark',
      'public changelog',
      'No Riot account, Riot login or Riot account data.',
    ]) {
      expect(all, s).toContain(s);
    }
  });

  it('SYNC-103 items 5, 6, 9, 10, 12 / AC 66 (v0.17.2) the page names no city, region or Firebase product and no "system" theme', async () => {
    const all = text(await render());
    for (const s of ABSENT) {
      expect(all, s).not.toContain(s);
    }
  });

  it('SYNC-103 items 1–22 / AC 66 each item has its own heading, in the order of the draft', async () => {
    const el = await render();
    expect(Array.from(el.querySelectorAll('h2')).map(text)).toEqual([
      'Who we are',
      'What we store',
      'What Google collects for us',
      'What we do not collect',
      'Why we use it',
      'Legal basis (for people in the EU and UK)',
      'Who receives it',
      'Where it is stored',
      'Who can read it',
      'What your browser keeps',
      'Do Not Track and Global Privacy Control',
      'How long we keep it',
      'Your choices',
      'Your rights (people in the EU and UK)',
      'Is giving us data required?',
      'No automated decisions',
      'Children',
      'Security',
      'Changes',
      'Contact',
    ]);
  });

  it('Privacy Notice Draft approval rule: the built page shows no Confirm marker, no RJ note and no Google sign-in (SYNC-103 item 24)', async () => {
    const el = await render();
    const all = text(el);
    expect(all).not.toMatch(/Confirm/i);
    expect(all).not.toMatch(/\bRJ\b/);
    expect(all).not.toContain('research note');
    expect(all).not.toContain('AC 70');
    expect(all).not.toMatch(/Google sign-in|Sign in with Google/i);
    expect(all).not.toContain('[builder');
  });

  it('SYNC-103 item 3 the "What\'s new page" text links to /changelog in the same tab', async () => {
    const el = await render();
    const link = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) => text(a) === "the What's new page")!;
    expect(link.getAttribute('href')).toBe('/changelog');
    expect(link.getAttribute('target')).toBeNull();
    link.click();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/changelog'));
  });

  it('SYNC-103 item 1 the contact address is a mailto link; text is bound as text (no HTML from the file)', async () => {
    const el = await render('# Privacy notice\n\nP <b>bold</b> [mail](mailto:a@b.c)\n');
    expect(el.querySelector('b')).toBeNull();
    expect(text(el.querySelector('p'))).toContain('<b>bold</b>');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('mailto:a@b.c');
  });
});
