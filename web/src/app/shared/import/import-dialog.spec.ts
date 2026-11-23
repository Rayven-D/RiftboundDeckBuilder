import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ImportDialog } from './import-dialog';

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
    expect(alert(f)).toContain('Older .xls files aren’t supported.');
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
