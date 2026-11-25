import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { provideOpenGate } from '../../core/sync/testing/open-gate';

async function setup(url = '/import') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      // Signed in and synced: the gate is open (SYNC-009). The gate is covered in pages/gated-pages.spec.ts.
      provideOpenGate(),
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

/** A drag event with a stand-in dataTransfer (jsdom has no DataTransfer). */
function dragEvent(
  type: string,
  data: { types: string[]; files?: File[] },
): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { types: data.types, files: data.files ?? [], dropEffect: 'none' },
  });
  return event;
}

/** Lets the file read settle, then renders. */
async function settle(harness: RouterTestingHarness): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  harness.fixture.detectChanges();
  await harness.fixture.whenStable();
}

describe('ImportPage (gate open, SYNC-009)', () => {
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

  it('highlights a card while a file is dragged over it, and not for a text drag', async () => {
    const harness = await setup();
    const card = harness.routeNativeElement!.querySelectorAll<HTMLElement>('.import-card')[1];

    const textDrag = dragEvent('dragenter', { types: ['text/plain'] });
    card.dispatchEvent(textDrag);
    harness.fixture.detectChanges();
    expect(textDrag.defaultPrevented).toBe(false);
    expect(card.classList).not.toContain('drag-over');

    card.dispatchEvent(dragEvent('dragenter', { types: ['Files'] }));
    harness.fixture.detectChanges();
    expect(card.classList).toContain('drag-over');
    expect(card.textContent).toContain('Drop to import');

    card.dispatchEvent(dragEvent('dragleave', { types: ['Files'] }));
    harness.fixture.detectChanges();
    expect(card.classList).not.toContain('drag-over');
  });

  it('opens that card’s dialog with a dropped file loaded through the upload path', async () => {
    const harness = await setup();
    const card = harness.routeNativeElement!.querySelectorAll<HTMLElement>('.import-card')[1];
    const file = new File(['Qty,Name\n3,Lightning Rush\n2,Hextech Ray\n'], 'deck.csv');

    const drop = dragEvent('drop', { types: ['Files'], files: [file] });
    card.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    await settle(harness);

    expect(dialogEl()?.textContent).toContain('Import deck');
    expect(dialogEl()!.querySelector('textarea')!.value).toBe('3 Lightning Rush\n2 Hextech Ray');
    expect(dialogEl()!.textContent).toContain('Loaded deck.csv');
    expect(dialogEl()!.textContent).toContain('5 cards from 2 lines');
  });

  it('opens the right dialog from ?type=deck', async () => {
    await setup('/import?type=deck');
    expect(dialogEl()?.textContent).toContain('Import deck');
  });
});
