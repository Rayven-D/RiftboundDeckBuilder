import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state id="with" heading="No tournaments loaded yet" message="Results will appear here." />
    <app-empty-state id="without" message="Only a line" messageRole="status">
      <button type="button">Act</button>
    </app-empty-state>
    <app-empty-state id="focusable" message="Focus me" [focusable]="true" />
  `,
})
class Host {}

describe('EmptyState (H-114, Brief H-144 decisions 1, 4, 6)', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return (id: string) => el.querySelector(`#${id}`)!;
  }

  it('H-114 with a heading it renders as before: named section, h2, muted message, no role, not focusable', async () => {
    const q = await render();
    const section = q('with').querySelector('section')!;
    expect(section.getAttribute('aria-label')).toBe('No tournaments loaded yet');
    expect(text(section.querySelector('h2'))).toBe('No tournaments loaded yet');
    const p = section.querySelector('p')!;
    expect(text(p)).toBe('Results will appear here.');
    expect(p.classList.contains('primary')).toBe(false);
    expect(p.hasAttribute('role')).toBe(false);
    expect(section.hasAttribute('tabindex')).toBe(false);
    expect(section.querySelector('app-deck-mark')).not.toBeNull();
  });

  it('H-114 the heading is optional: no h2, no accessible name, the line is primary text and takes messageRole', async () => {
    const q = await render();
    const section = q('without').querySelector('section')!;
    expect(section.querySelector('h2')).toBeNull();
    expect(section.hasAttribute('aria-label')).toBe(false);
    const p = section.querySelector('p')!;
    expect(p.classList.contains('primary')).toBe(true);
    expect(p.getAttribute('role')).toBe('status');
    expect(text(section.querySelector('.actions button'))).toBe('Act');
    expect(section.querySelector('app-deck-mark')).not.toBeNull();
  });

  it('H-115 focusable gives the section tabindex -1 and focus() moves focus to it', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'x');
    fixture.componentRef.setInput('focusable', true);
    await fixture.whenStable();
    document.body.appendChild(fixture.nativeElement);
    const section = (fixture.nativeElement as HTMLElement).querySelector('section')!;
    expect(section.getAttribute('tabindex')).toBe('-1');
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(section);
    fixture.nativeElement.remove();
  });
});
