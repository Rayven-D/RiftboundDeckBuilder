import { TestBed } from '@angular/core/testing';
import { CardArt } from './card-art';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(CardArt);
  fixture.componentRef.setInput('state', 'full');
  fixture.componentRef.setInput('fill', 1);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CardArt', () => {
  it('uses the card name as alt text by default', () => {
    const el = render({ name: 'Rally Banner', imageUrl: 'card.png' });
    const imgs = el.querySelectorAll('img');
    expect(imgs[0].getAttribute('alt')).toBe('Rally Banner');
    // The dimmed overlay copy is always decorative.
    expect(imgs[1].getAttribute('alt')).toBe('');
    expect(imgs[1].getAttribute('aria-hidden')).toBe('true');
  });

  it('uses an explicit alt when given', () => {
    const el = render({ name: 'Rally Banner', imageUrl: 'card.png', alt: 'Rally Banner, alt art' });
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Rally Banner, alt art');
  });

  it('renders alt="" when decorative', () => {
    const el = render({ name: 'Rally Banner', imageUrl: 'card.png', decorative: true });
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('shows the name in the placeholder and hides it only when decorative', () => {
    let el = render({ name: 'Void Gate' });
    const placeholder = el.querySelector('.placeholder:not(.dimmed)')!;
    expect(placeholder.textContent?.trim()).toBe('Void Gate');
    expect(placeholder.hasAttribute('aria-hidden')).toBe(false);

    el = render({ name: 'Void Gate', decorative: true });
    expect(el.querySelector('.placeholder:not(.dimmed)')?.getAttribute('aria-hidden')).toBe('true');
  });
});
