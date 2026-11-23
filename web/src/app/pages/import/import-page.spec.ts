import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';

async function setup(url = '/import') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      // Close the dialog immediately instead of waiting for its exit animation.
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  return harness;
}

function dialogEl(): HTMLElement | null {
  return document.querySelector('mat-dialog-container');
}

async function typeList(harness: RouterTestingHarness, text: string) {
  const textarea = dialogEl()!.querySelector('textarea')!;
  textarea.value = text;
  textarea.dispatchEvent(new Event('input'));
  harness.fixture.detectChanges();
  await harness.fixture.whenStable();
}

function button(label: string): HTMLButtonElement {
  return Array.from(dialogEl()!.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label,
  )!;
}

describe('ImportPage', () => {
  afterEach(() =>
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = '')),
  );

  it('shows Collection and Deck options with their descriptions', async () => {
    const harness = await setup();
    const cards = Array.from(harness.routeNativeElement!.querySelectorAll('.import-card')).map(
      (c) => c.textContent,
    );
    expect(cards[0]).toContain('Collection');
    expect(cards[0]).toContain('Import cards to your collection');
    expect(cards[1]).toContain('Deck');
    expect(cards[1]).toContain('Import deck lists to your decks');
  });

  it('opens the collection dialog, counts the list and flags a line without a number', async () => {
    const harness = await setup();
    (harness.routeNativeElement!.querySelector('.import-card') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(dialogEl()?.textContent).toContain('Import collection');

    await typeList(harness, '3 Lightning Rush\n2x Hextech Ray\nVoid Gate');
    const text = dialogEl()!.textContent!;
    expect(text).toContain('5 cards from 2 lines');
    expect(text).toContain('1 line needs fixing');
    expect(text).toContain('Line 3:');
  });

  it('closes with the parsed list and shows it as not saved yet', async () => {
    const harness = await setup();
    (harness.routeNativeElement!.querySelectorAll('.import-card')[1] as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(dialogEl()?.textContent).toContain('Import deck');

    await typeList(harness, 'Main Deck:\n3 Lightning Rush\nSideboard:\n1 Void Gate');
    button('Continue').click();
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    const page = harness.routeNativeElement!.textContent!;
    expect(page).toContain('Deck list ready: 4 cards');
    expect(page).toContain('Not saved yet');
    expect(page).toContain('Sideboard');
  });

  it('asks for at least one valid line before continuing', async () => {
    const harness = await setup();
    (harness.routeNativeElement!.querySelector('.import-card') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    button('Continue').click();
    harness.fixture.detectChanges();
    expect(dialogEl()?.textContent).toContain(
      'Add at least one line with a number and a card name first.',
    );
  });

  it('opens the right dialog from ?type=deck', async () => {
    await setup('/import?type=deck');
    expect(dialogEl()?.textContent).toContain('Import deck');
  });
});
