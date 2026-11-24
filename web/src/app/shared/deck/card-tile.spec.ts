import { TestBed } from '@angular/core/testing';
import { CardTile } from './card-tile';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(CardTile);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CardTile', () => {
  it('shows the count label and a partial fill for 1 of 3', () => {
    const el = render({ name: 'Rally Banner', zone: 'Main Deck', owned: 1, required: 3 });
    expect(el.querySelector('app-ownership-chip')?.textContent).toContain('1 of 3 available');
    expect(el.querySelector('.art')?.classList).toContain('art--partial');
    expect(el.querySelector('article')?.getAttribute('aria-label')).toBe(
      'Rally Banner, Main Deck, 1 of 3 available',
    );
  });

  it('marks a fully owned card as full and includes the ban label', () => {
    const el = render({
      name: 'Hextech Ray',
      owned: 3,
      required: 3,
      banLabel: 'Banned since Nov 23, 2026',
    });
    expect(el.querySelector('.art')?.classList).toContain('art--full');
    expect(el.querySelector('app-ownership-chip')?.classList).toContain('chip--full');
    expect(el.textContent).toContain('Banned since Nov 23, 2026');
  });

  it('marks an unowned card as none', () => {
    const el = render({ name: 'Void Gate', owned: 0, required: 2 });
    expect(el.querySelector('.art')?.classList).toContain('art--none');
    expect(el.textContent).toContain('0 of 2 available');
  });

  it('marks the image decorative because the name is shown in the heading', () => {
    const el = render({ name: 'Rally Banner', owned: 1, required: 3, imageUrl: 'card.png' });
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(el.querySelector('h3')?.textContent).toBe('Rally Banner');
  });
});
