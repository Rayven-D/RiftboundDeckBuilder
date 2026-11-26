import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { makeCatalog } from '../../core/decks/engine-fixtures';
import { ImportCommitter, resolveCollectionImport } from './collection-commit';
import { type DeckImportCommitter, prepareDeckImport } from './deck-import';
import { ImportDialog } from './import-dialog';
import { sourceLines } from './parse-card-list';

type Fixture = ComponentFixture<ImportDialog>;

function setup(): Fixture {
  TestBed.configureTestingModule({
    imports: [ImportDialog],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: { kind: 'collection' } },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(ImportDialog);
  fixture.detectChanges();
  return fixture;
}

const el = (f: Fixture): HTMLElement => f.nativeElement;
const textarea = (f: Fixture) => el(f).querySelector('textarea')!;
const hint = (f: Fixture) => el(f).querySelector('.upload-hint')!.textContent!.trim();
const alert = (f: Fixture) => el(f).querySelector('.error[role="alert"]')?.textContent?.trim();

/** Lets the file read settle, then renders. */
async function settle(f: Fixture): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  f.detectChanges();
}

async function pick(f: Fixture, file: File, wait = true): Promise<void> {
  const input = el(f).querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  if (wait) await settle(f);
}

/** Types into the box; `inputType` paste/drop goes through beforeinput like a browser. */
function type(f: Fixture, value: string, inputType = 'insertText', selectAll = false): void {
  const box = textarea(f);
  if (selectAll) box.setSelectionRange(0, box.value.length);
  else box.setSelectionRange(box.value.length, box.value.length);
  box.dispatchEvent(new InputEvent('beforeinput', { inputType }));
  box.value = value;
  box.dispatchEvent(new InputEvent('input', { inputType }));
  f.detectChanges();
}

/** A CSV file whose read resolves only when `release` is called. */
function slowCsv(name: string, content: string): { file: File; release: () => void } {
  const file = new File([content], name);
  let release!: () => void;
  const bytes = new TextEncoder().encode(content).buffer as ArrayBuffer;
  vi.spyOn(file, 'arrayBuffer').mockReturnValue(
    new Promise<ArrayBuffer>((resolve) => (release = () => resolve(bytes))),
  );
  return { file, release };
}

describe('ImportDialog dropped files', () => {
  function drop(f: Fixture, file: File): Event {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types: ['Files'], files: [file] } });
    textarea(f).dispatchEvent(event);
    return event;
  }

  it('loads a file dropped on the text box through the upload path', async () => {
    const f = setup();
    const event = drop(f, new File(['Qty,Name\n2,Gust\n'], 'drop.csv'));
    expect(event.defaultPrevented).toBe(true);
    await settle(f);
    expect(textarea(f).value).toBe('2 Gust');
    expect(hint(f)).toBe('Loaded drop.csv');
  });

  it('rejects a dropped file the same way as a picked one', async () => {
    const f = setup();
    type(f, '2 Void Gate');
    drop(f, new File(['x'], 'old.xls'));
    await settle(f);
    expect(textarea(f).value).toBe('2 Void Gate');
    expect(alert(f)).toContain("Older .xls files aren't supported.");
  });

  it('loads a file handed over in the dialog data (dropped on the Import page)', async () => {
    TestBed.configureTestingModule({
      imports: [ImportDialog],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { kind: 'collection', file: new File(['3 Gust'], 'list.txt') },
        },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const f = TestBed.createComponent(ImportDialog);
    f.detectChanges();
    await settle(f);
    expect(textarea(f).value).toBe('3 Gust');
    expect(hint(f)).toBe('Loaded list.txt');
  });
});

describe('ImportDialog upload state', () => {
  it('writes the upload into the text box and shows the file name', async () => {
    const f = setup();
    await pick(f, new File(['Qty,Name\n3,Gust\n'], 'my.csv'));
    expect(textarea(f).value).toBe('3 Gust');
    expect(hint(f)).toBe('Loaded my.csv');
    expect(el(f).querySelector('.totals')!.textContent).toContain('3');
  });

  it('leaves the text box unchanged when an upload is rejected, and clears the error on edit', async () => {
    const f = setup();
    type(f, '2 Void Gate');
    await pick(f, new File(['x'], 'old.xls'));
    expect(textarea(f).value).toBe('2 Void Gate');
    expect(alert(f)).toContain("Older .xls files aren't supported.");
    expect(hint(f)).not.toContain('Loaded');
    type(f, '2 Void Gate\n1 Gust');
    expect(alert(f)).toBeUndefined();
  });

  it('shows an error instead of "Loaded" when an upload has no lines', async () => {
    const f = setup();
    await pick(f, new File(['Quantity,Card Name\n'], 'empty.csv'));
    expect(textarea(f).value).toBe('');
    expect(alert(f)).toContain('empty.csv has no lines to import.');
    expect(hint(f)).not.toContain('Loaded');
  });

  it('forgets the upload when the text box is emptied', async () => {
    const f = setup();
    await pick(f, new File(['3,Gust\n'], 'my.csv'));
    type(f, '');
    expect(hint(f)).not.toContain('Loaded');
    type(f, `1 ${'A'.repeat(600)}`);
    expect(el(f).textContent).toContain('Line is longer than 500 characters.');
  });

  it('forgets the upload when a paste replaces the whole text, but not on a partial paste', async () => {
    const f = setup();
    await pick(f, new File(['3,Gust\n'], 'my.csv'));
    type(f, '3 Gust\n1 Void Gate', 'insertFromPaste');
    expect(hint(f)).toBe('Loaded my.csv');
    type(f, `Main Deck:\n1 ${'A'.repeat(600)}`, 'insertFromPaste', true);
    expect(hint(f)).not.toContain('Loaded');
    // No longer an upload: the 500-char text limit applies, not the 2,000-char row limit.
    expect(el(f).textContent).toContain('Line is longer than 500 characters.');
  });

  it('applies only the latest file pick when reads overlap', async () => {
    const f = setup();
    const slow = slowCsv('slow.csv', '5,Slow Card\n');
    const fast = slowCsv('fast.csv', '2,Fast Card\n');
    await pick(f, slow.file, false);
    await pick(f, fast.file, false);
    fast.release();
    await settle(f);
    slow.release();
    await settle(f);
    expect(textarea(f).value).toBe('2 Fast Card');
    expect(hint(f)).toBe('Loaded fast.csv');
  });
});

describe('ImportDialog review step (Owned Cards Import commit, H-158)', () => {
  const catalog = makeCatalog(['Lightning Rush', 'Gust']);
  function withCommitter(commit: ImportCommitter['commit']) {
    const close = vi.fn();
    const committer: ImportCommitter = {
      prepare: async (r) => ({ status: 'ok', resolved: resolveCollectionImport(r, catalog), catalog }),
      commit,
    };
    TestBed.configureTestingModule({
      imports: [ImportDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { kind: 'collection', committer } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const f = TestBed.createComponent(ImportDialog);
    f.detectChanges();
    return { f, close };
  }
  const click = (f: Fixture, label: string) =>
    Array.from(el(f).querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.trim() === label)!
      .click();

  it('IMP-049 / IMP-027: Continue shows what matched, the lines left out, and Add as the default; Back keeps the text', async () => {
    const commit = vi.fn();
    const { f } = withCommitter(commit);
    type(f, '3 Lightning Rush\n2 Gust\n1 Gost');
    click(f, 'Continue');
    await settle(f);
    expect(el(f).querySelector('.totals')!.textContent!.trim()).toBe('Ready: 5 copies of 2 cards.');
    expect(el(f).querySelector('.left-out')!.textContent).toContain('Line 3: No card named "Gost" in the card data.');
    const radios = el(f).querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios[0].checked).toBe(true);
    expect(el(f).textContent).toContain('Add cards');
    click(f, 'Back');
    await settle(f);
    expect(textarea(f).value).toBe('3 Lightning Rush\n2 Gust\n1 Gost');
    expect(commit).not.toHaveBeenCalled();
  });

  it('IMP-072: closes with "committed" only after a written commit; an error stays in the dialog', async () => {
    const commit = vi
      .fn<ImportCommitter['commit']>()
      .mockResolvedValueOnce({ status: 'error', message: 'Disk full.' })
      .mockResolvedValueOnce({ status: 'cancelled' })
      .mockResolvedValueOnce({ status: 'written' });
    const { f, close } = withCommitter(commit);
    type(f, '1 Gust');
    click(f, 'Continue');
    await settle(f);
    click(f, 'Add cards');
    await settle(f);
    expect(el(f).querySelector('.commit-error')!.textContent).toContain('Disk full.');
    expect(close).not.toHaveBeenCalled();
    click(f, 'Add cards');
    await settle(f);
    expect(close).not.toHaveBeenCalled();
    click(f, 'Add cards');
    await settle(f);
    expect(close).toHaveBeenCalledWith('committed');
    expect(commit).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ok' }), 'add');
  });

  it('IMP-027: a list where nothing matches offers no commit', async () => {
    const { f } = withCommitter(vi.fn());
    type(f, '2 Nothing Like It');
    click(f, 'Continue');
    await settle(f);
    expect(alert(f)).toContain('None of these lines match a card.');
    expect(el(f).textContent).not.toContain('Add cards');
  });
});

describe('ImportDialog Deck Import focus (H-450, critique H-341 finding 2)', () => {
  const catalog = makeCatalog([{ name: 'Gust', category: 'spell' }]);
  function deckDialog() {
    const deckCommitter: DeckImportCommitter = {
      prepare: async (r, text) => prepareDeckImport(r, sourceLines(text), catalog),
      commit: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ImportDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { kind: 'deck', deckCommitter } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const f = TestBed.createComponent(ImportDialog);
    f.detectChanges();
    return f;
  }
  const button = (f: Fixture, label: string) =>
    Array.from(el(f).querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === label)!;

  it('H-450 / DECK-003: Continue focuses "Check the deck"; Back focuses the Card list, never <body>', async () => {
    const f = deckDialog();
    type(f, 'Main Deck:\n3 Gust');
    button(f, 'Continue').focus();
    button(f, 'Continue').click();
    await settle(f);
    expect(el(f).querySelector('app-deck-review')).not.toBeNull();
    expect(document.activeElement?.textContent?.trim()).toBe('Check the deck');

    button(f, 'Back').click();
    await settle(f);
    expect(document.activeElement).toBe(textarea(f));
    expect(textarea(f).value).toBe('Main Deck:\n3 Gust');
  });
});
