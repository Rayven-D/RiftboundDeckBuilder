/**
 * SPEC-011 Keywords section in the card dialog (KW-050…056), with the spec's placeholder terms. The production
 * glossary is empty (KW-003), so the default `KEYWORD_INDEX` hides the section on every card.
 */
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { KeywordEntry, KeywordIndex, indexGlossary } from '../../core/cards/keywords';
import { CardDialog, CardDialogData } from './card-dialog';
import { CardDetail } from './collection-view';
import { KEYWORD_INDEX } from './keyword-list';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const alpha: KeywordEntry = {
  keywordId: 'alpha',
  displayName: 'Alpha',
  definition: 'Definition A.',
  takesValue: null,
  source: { title: 'Core Rules', locator: '900.1.b', url: null, documentDate: null },
  asOf: '2026-11-24',
  status: 'verified',
  introducedIn: null,
};

function detail(keywords: string[] | null, category = 'unit', cardText = ''): CardDetail {
  return {
    tile: { standIn: false, thumbnailUrl: null, fullUrl: null },
    card: { name: 'Test Card', card: { category, keywords, text: cardText } },
    printingLine: 'OGN-001 · 1 copy',
    excludedLine: null,
    details: null,
    ownedHeading: null,
    printings: [],
    lockedIn: [],
    couldFit: [],
    couldFitEmpty: 'None of your decks use this card.',
    decksUnreadable: false,
    ban: null,
  } as unknown as CardDetail;
}

function render(d: CardDetail, index?: KeywordIndex) {
  const data: CardDialogData = { entryId: 'e1', detail: () => d, neighbour: () => null, stepping: false };
  const ref = {
    close: () => undefined,
    disableClose: false,
    backdropClick: () => new Subject<MouseEvent>(),
    keydownEvents: () => new Subject<KeyboardEvent>(),
    afterClosed: () => new Subject<unknown>(),
  };
  TestBed.configureTestingModule({
    imports: [CardDialog],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: ref },
      ...(index ? [{ provide: KEYWORD_INDEX, useValue: index }] : []),
    ],
  });
  const fixture = TestBed.createComponent(CardDialog);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const headings = (el: HTMLElement) => [...el.querySelectorAll('h3')].map(text);
const withAlpha = () => indexGlossary({ schemaVersion: 1, asOf: '2026-11-24', entries: [alpha] });

describe('SPEC-011 card dialog Keywords section (KW-050…056)', () => {
  it('AC 1 / KW-050 / KW-051: chip, visible definition and source line with an American date', () => {
    const el = render(detail(['Alpha']), withAlpha());
    expect(headings(el)).toContain('Keywords');
    const li = el.querySelector('app-keyword-list li')!;
    expect(text(li.querySelector('.chip'))).toBe('Alpha');
    expect(text(li.querySelector('.definition'))).toBe('Definition A.');
    expect(text(li.querySelector('.source'))).toBe('Source: Core Rules 900.1.b, as of Nov 24, 2026');
  });

  it('AC 20 / KW-055: chip, definition, source in reading order; nothing in the list is focusable', () => {
    const el = render(detail(['Alpha']), withAlpha());
    const li = el.querySelector('app-keyword-list li')!;
    expect([...li.children].map((c) => c.className)).toEqual(['chip', 'definition', 'source']);
    expect(el.querySelector('app-keyword-list')!.querySelectorAll('button, a, [tabindex]').length).toBe(0);
  });

  it('AC 13 / KW-053 / KW-030: no Keywords heading for no keywords, only unknown ones, or null', () => {
    for (const kw of [[], ['Gamma'], null]) {
      TestBed.resetTestingModule();
      const el = render(detail(kw), withAlpha());
      expect(headings(el)).not.toContain('Keywords');
      expect(el.querySelector('app-keyword-list')).toBeNull();
    }
  });

  it('AC 14 / KW-056 / KW-003: with the shipped (empty) glossary the section is hidden and the dialog still works', () => {
    const el = render(detail(['Alpha']));
    expect(headings(el)).not.toContain('Keywords');
    expect(headings(el)).toContain('Could fit in');
    expect(text(el.querySelector('.title'))).toBe('Test Card');
  });

  it('AC 16 / KW-004: card text is never shown as a keyword definition', () => {
    const el = render(detail(['Gamma'], 'unit', '[Gamma] (Gamma reminder text.)'), withAlpha());
    expect(text(el)).not.toContain('Gamma reminder text.');
    expect(headings(el)).not.toContain('Keywords');
  });

  it('AC 21 / KW-054: a Legend and a token show the same Alpha row', () => {
    const rowsFor = (category: string) => {
      TestBed.resetTestingModule();
      return text(render(detail(['Alpha'], category), withAlpha()).querySelector('app-keyword-list'));
    };
    expect(rowsFor('legend')).toBe(rowsFor('token'));
    expect(rowsFor('legend')).toBe('AlphaDefinition A.Source: Core Rules 900.1.b, as of Nov 24, 2026');
  });
});
