import { describe, expect, it } from 'vitest';
import { contentsUrl, RiotContentClient } from '../src/adapters/riot-content-client.ts';
import { Secret } from '../src/config.ts';

// The Riot API is never called in tests: fetch is replaced by a stub.
// Built at runtime so the repo never contains the key prefix literally (V-012).
const KEY_PREFIX = ['RGAPI', ''].join('-');
const FAKE_KEY = `${KEY_PREFIX}00000000-test-fake-key`;

describe('RiotContentClient (CARD-002, CARD-060)', () => {
  it('uses HTTPS, the regional host, locale=en, and sends the key only as X-Riot-Token', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const stub: typeof fetch = (url, init) => {
      calls.push({ url: String(url), init });
      return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
    };
    const client = new RiotContentClient({ apiKey: new Secret(FAKE_KEY), region: 'AMERICAS', fetchImpl: stub });
    expect(await client.fetchContents()).toBe('{"ok":true}');
    expect(calls[0]?.url).toBe('https://americas.api.riotgames.com/riftbound/content/v1/contents?locale=en');
    expect(calls[0]?.url).not.toContain(FAKE_KEY);
    expect((calls[0]?.init?.headers as Record<string, string>)['X-Riot-Token']).toBe(FAKE_KEY);
    expect(client.description).not.toContain(FAKE_KEY);
    expect(contentsUrl('EUROPE')).toMatch(/^https:\/\/europe\./u);
  });

  it('errors never contain the key', async () => {
    const stub: typeof fetch = () => Promise.resolve(new Response('denied', { status: 403, statusText: 'Forbidden' }));
    const client = new RiotContentClient({ apiKey: new Secret(FAKE_KEY), region: 'ASIA', fetchImpl: stub });
    const err = (await client.fetchContents().then(() => new Error('expected failure'), (e: unknown) => e)) as Error;
    expect(err.message).toMatch(/HTTP 403/u);
    expect(err.message).not.toContain(FAKE_KEY);
    const failing: typeof fetch = () => Promise.reject(new TypeError('network down'));
    const failingClient = new RiotContentClient({ apiKey: new Secret(FAKE_KEY), region: 'ASIA', fetchImpl: failing });
    const err2 = (await failingClient.fetchContents().then(() => new Error('expected failure'), (e: unknown) => e)) as Error;
    expect(err2.message).not.toContain(FAKE_KEY);
  });
});
