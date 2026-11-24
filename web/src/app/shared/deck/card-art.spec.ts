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

function loadAs(img: HTMLImageElement, width: number, height: number) {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  img.dispatchEvent(new Event('load'));
}

describe('CardArt', () => {
  it('H-095 fix 2: a landscape image (battlefield) is shown whole; a portrait one is unchanged', () => {
    const fixture = TestBed.createComponent(CardArt);
    fixture.componentRef.setInput('state', 'full');
    fixture.componentRef.setInput('fill', 1);
    fixture.componentRef.setInput('name', 'Gallows Market');
    fixture.componentRef.setInput('imageUrl', 'battlefield.png');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const art = () => el.querySelector('.art')!.classList;
    expect(art()).not.toContain('art--landscape');
    loadAs(el.querySelector('img')!, 670, 480);
    fixture.detectChanges();
    expect(art()).toContain('art--landscape');

    // Another card: starts as cover, then follows its own image.
    fixture.componentRef.setInput('name', 'Rally Banner');
    fixture.componentRef.setInput('imageUrl', 'portrait.png');
    fixture.detectChanges();
    expect(art()).not.toContain('art--landscape');
    loadAs(el.querySelector('img')!, 630, 880);
    fixture.detectChanges();
    expect(art()).not.toContain('art--landscape');
  });

  it('H-086 review 5: the same card keeps its orientation across a URL change (thumbnail → full)', () => {
    const fixture = TestBed.createComponent(CardArt);
    fixture.componentRef.setInput('state', 'full');
    fixture.componentRef.setInput('fill', 1);
    fixture.componentRef.setInput('name', 'Gallows Market');
    fixture.componentRef.setInput('imageUrl', 'thumb.png');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    loadAs(el.querySelector('img')!, 335, 240);
    fixture.detectChanges();

    fixture.componentRef.setInput('imageUrl', 'full.png');
    fixture.detectChanges();
    expect(el.querySelector('.art')!.classList).toContain('art--landscape');
    loadAs(el.querySelector('img')!, 670, 480);
    fixture.detectChanges();
    expect(el.querySelector('.art')!.classList).toContain('art--landscape');
  });

  it('H-086 review 5: a known `landscape` input applies before any image loads and wins over measuring', () => {
    let el = render({ name: 'Gallows Market', imageUrl: 'bf.png', landscape: true });
    expect(el.querySelector('.art')!.classList).toContain('art--landscape');

    const fixture = TestBed.createComponent(CardArt);
    fixture.componentRef.setInput('state', 'full');
    fixture.componentRef.setInput('fill', 1);
    fixture.componentRef.setInput('name', 'Rally Banner');
    fixture.componentRef.setInput('imageUrl', 'odd.png');
    fixture.componentRef.setInput('landscape', false);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
    loadAs(el.querySelector('img')!, 670, 480);
    fixture.detectChanges();
    expect(el.querySelector('.art')!.classList).not.toContain('art--landscape');
  });

  it('H-095 fix 9: images are lazy by default and eager with `eager`', () => {
    expect(
      render({ name: 'A', imageUrl: 'a.png' }).querySelector('img')!.getAttribute('loading'),
    ).toBe('lazy');
    const eager = render({ name: 'A', imageUrl: 'a.png', eager: true }).querySelector('img')!;
    expect(eager.getAttribute('loading')).toBe('eager');
    expect(eager.getAttribute('fetchpriority')).toBe('high');
  });

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
