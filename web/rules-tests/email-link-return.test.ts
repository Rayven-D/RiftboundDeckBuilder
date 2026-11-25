/**
 * SPEC-010 v0.10 SYNC-006 return path (H-145, AC 52), against the Auth emulator (`npm run test:rules`): the real
 * `FirebaseAuthService.sendEmailLink` sends the start page as the continue URL, the emulator's action link
 * redirects to it, and `returnTarget` turns the landing URL back into exactly that page.
 *
 * Verified (firebase-tools 15.37.0, firebase JS 13.4.0, 2026-11-24): the action link
 * `/emulator/action?mode=signIn&lang=en&oobCode=…&apiKey=…&continueUrl=<encoded>` answers 303 with
 * `Location: <continueUrl>` plus `&mode=signIn&lang=en&oobCode=…&apiKey=…` appended to the continue URL's own
 * query (`?` when it had none), any `#fragment` kept at the end, and no `continueUrl` parameter. The emulator does
 * not check the continue URL's domain. Recorded in brain/05-Services/API Contracts.md.
 */
import { initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FirebaseAuthService } from '../src/app/core/sync/adapters/firebase-adapters';
import { returnTarget } from '../src/app/shared/sync/return-path';

const PROJECT = 'demo-rift-builder';
const EMULATOR = 'http://127.0.0.1:9099';
const ORIGIN = 'http://localhost:4200';
let n = 0;

function freshAuth(): Auth {
  const app = initializeApp({ apiKey: 'demo-key', projectId: PROJECT }, `email-link-test-${++n}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, EMULATOR, { disableWarnings: true });
  return auth;
}

/** The newest sign-in link the emulator holds for `email`. */
async function latestLink(email: string): Promise<string> {
  const r = await fetch(`${EMULATOR}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = (await r.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
  const mine = oobCodes.filter((c) => c.email === email && c.requestType === 'EMAIL_SIGNIN');
  return mine[mine.length - 1].oobLink;
}

/** Opens the link the way a browser does and returns where the emulator sends it (no request goes there). */
async function landing(link: string): Promise<string> {
  const r = await fetch(link, { redirect: 'manual' });
  expect(r.status).toBe(303);
  return r.headers.get('location')!;
}

describe('AC 52 / H-145 email link return path on the Auth emulator (SPEC-010 SYNC-006)', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('location', { origin: ORIGIN, href: `${ORIGIN}/` });
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('AC 52 / H-145 Send link on /decks?import=1: the link lands on /decks?import=1 plus the Firebase parameters, signs in, and returns to exactly /decks?import=1', async () => {
    const email = `h145-${Date.now()}@example.com`;
    const svc = new FirebaseAuthService(freshAuth());
    await svc.sendEmailLink(email, '/decks?import=1');

    const link = await latestLink(email);
    expect(new URL(link).searchParams.get('continueUrl')).toBe(`${ORIGIN}/decks?import=1`);
    const land = await landing(link);
    const url = new URL(land);
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe('/decks');
    expect(land.startsWith(`${ORIGIN}/decks?import=1&`)).toBe(true); // the continue URL's query comes first
    expect(url.searchParams.get('mode')).toBe('signIn');
    expect(url.searchParams.has('oobCode')).toBe(true);
    expect(url.searchParams.has('continueUrl')).toBe(false);

    vi.stubGlobal('location', { origin: ORIGIN, href: land });
    expect(svc.isEmailLinkReturn()).toBe(true);
    const r = await svc.signIn('email-link'); // same device: the stored address, no question
    expect(r).toEqual({ uid: expect.any(String) });
    expect(store.size).toBe(0); // the address is removed once the sign-in completes
    expect(returnTarget(land)).toBe('/decks?import=1');
  });

  it('AC 52 / H-145 Send link on / (header on Home) lands on /?mode=signIn… and returns to /', async () => {
    const email = `h145-root-${Date.now()}@example.com`;
    await new FirebaseAuthService(freshAuth()).sendEmailLink(email); // default '/'
    const land = await landing(await latestLink(email));
    expect(land.startsWith(`${ORIGIN}/?`)).toBe(true);
    expect(returnTarget(land)).toBe('/');
  });

  it('AC 52 / H-145 a return path outside the app is sent as / (the continue URL never leaves this origin)', async () => {
    const email = `h145-out-${Date.now()}@example.com`;
    await new FirebaseAuthService(freshAuth()).sendEmailLink(email, '//example.org/');
    const link = await latestLink(email);
    expect(new URL(link).searchParams.get('continueUrl')).toBe(`${ORIGIN}/`);
    expect(new URL(await landing(link)).origin).toBe(ORIGIN);
  });

  it('H-145 a fragment is never sent, and the user query survives next to the Firebase parameters', async () => {
    const email = `h145-frag-${Date.now()}@example.com`;
    await new FirebaseAuthService(freshAuth()).sendEmailLink(email, '/decks?x=1#a');
    const land = await landing(await latestLink(email));
    expect(land.includes('#')).toBe(false);
    expect(returnTarget(land)).toBe('/decks?x=1');
  });
});
