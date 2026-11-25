/**
 * SPEC-010 v0.10 SYNC-006 return path (H-145, brain/04-UI/Brief H-145.md decisions 3-5): only an app path comes
 * back; anything else is `/`. The landing URLs below are the shape the Auth emulator produces (API Contracts):
 * the continue URL's own query first, then `&mode=signIn&lang=en&oobCode=…&apiKey=…`.
 */
import { LINK_PARAMS, returnTarget, safeReturnPath } from './return-path';

const ORIGIN = 'http://localhost:4200';

describe('H-145 safeReturnPath (SPEC-010 SYNC-006, AC 52)', () => {
  it('AC 52 / H-145 an app path with its query is kept as written', () => {
    expect(safeReturnPath('/', ORIGIN)).toBe('/');
    expect(safeReturnPath('/import?type=deck', ORIGIN)).toBe('/import?type=deck');
    expect(safeReturnPath('/collection?q=Jinx%20x&sort=name', ORIGIN)).toBe('/collection?q=Jinx%20x&sort=name');
  });

  it('AC 52 / H-145 a path outside the app gives /', () => {
    expect(safeReturnPath('//x.org', ORIGIN)).toBe('/');
    expect(safeReturnPath('/\\x.org', ORIGIN)).toBe('/');
    expect(safeReturnPath('https://x.org/', ORIGIN)).toBe('/');
    expect(safeReturnPath('', ORIGIN)).toBe('/');
    expect(safeReturnPath('decks', ORIGIN)).toBe('/');
    expect(safeReturnPath('/\t/x.org', ORIGIN)).toBe('/'); // the URL parser drops the tab: //x.org
    expect(safeReturnPath('/.//x.org/', ORIGIN)).toBe('/'); // normalizes to //x.org/
  });

  it('H-151 a foreign host with a path gives /, never that path on this origin', () => {
    expect(safeReturnPath('//x.org/evil', ORIGIN)).toBe('/');
    expect(safeReturnPath('/\\x.org/evil', ORIGIN)).toBe('/');
    expect(safeReturnPath('https://x.org/evil', ORIGIN)).toBe('/');
  });

  it('H-151 the origin check: a single-slash input that parses to another host (tab or newline dropped) gives /', () => {
    expect(safeReturnPath('/\t/x.org/evil', ORIGIN)).toBe('/');
    expect(safeReturnPath('/\n/x.org/evil', ORIGIN)).toBe('/');
  });

  it('H-151 the leading // and /\\ guard: a protocol-relative input is refused even when it names this origin', () => {
    expect(safeReturnPath('//localhost:4200/import', ORIGIN)).toBe('/');
    expect(safeReturnPath('/\\localhost:4200/import', ORIGIN)).toBe('/');
  });

  it('H-145 an encoded //host stays a path in this app', () => {
    expect(safeReturnPath('/%2F%2Fx.org', ORIGIN)).toBe('/%2F%2Fx.org');
  });

  it('H-145 the fragment is dropped', () => {
    expect(safeReturnPath('/decks#a', ORIGIN)).toBe('/decks');
    expect(safeReturnPath('/decks?x=1#a', ORIGIN)).toBe('/decks?x=1');
  });

  it('AC 52 / H-145 the five Firebase parameters are removed by name, wherever they are', () => {
    expect(LINK_PARAMS).toEqual(['mode', 'oobCode', 'apiKey', 'lang', 'continueUrl']);
    expect(
      safeReturnPath('/import?mode=signIn&type=deck&oobCode=abc&apiKey=k&lang=en&continueUrl=https%3A%2F%2Fx.org%2F', ORIGIN),
    ).toBe('/import?type=deck');
    expect(safeReturnPath('/?mode=signIn&oobCode=abc&apiKey=k&lang=en', ORIGIN)).toBe('/');
    expect(safeReturnPath('/import?%6Fob%43ode=abc&type=deck', ORIGIN)).toBe('/import?type=deck'); // encoded name
  });
});

describe('H-145 returnTarget: the page shown after the link (SPEC-010 SYNC-006, AC 52)', () => {
  it('AC 52 / H-145 the emulator landing URL for /import?type=deck returns to exactly /import?type=deck', () => {
    expect(returnTarget(`${ORIGIN}/import?type=deck&mode=signIn&lang=en&oobCode=Yhx0&apiKey=fake-api-key`)).toBe(
      '/import?type=deck',
    );
    expect(returnTarget(`${ORIGIN}/?mode=signIn&lang=en&oobCode=3Fb2&apiKey=fake-api-key`)).toBe('/');
    expect(returnTarget(`${ORIGIN}/decks?x=1&mode=signIn&lang=en&oobCode=JIjl&apiKey=fake-api-key#a`)).toBe('/decks?x=1');
  });

  it('AC 52 / H-145 a tampered link completes on /: a //host path, and a continueUrl parameter is never followed', () => {
    expect(returnTarget(`${ORIGIN}//example.org/?mode=signIn&oobCode=abc&continueUrl=https%3A%2F%2Fexample.org%2F`)).toBe('/');
    expect(returnTarget(`${ORIGIN}/?mode=signIn&oobCode=abc&continueUrl=https%3A%2F%2Fexample.org%2F`)).toBe('/');
  });
});
