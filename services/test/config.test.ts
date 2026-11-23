import { inspect } from 'node:util';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DATA_DIR, loadConfig } from '../src/config.ts';

// Built at runtime so the repo never contains the key prefix literally (V-012).
const KEY_PREFIX = ['RGAPI', ''].join('-');

describe('config (env vars only)', () => {
  it('defaults', () => {
    const c = loadConfig({});
    expect(c).toMatchObject({ riotApiKey: null, riotRegion: 'AMERICAS', port: 3000, dataDir: DEFAULT_DATA_DIR, nodeEnv: 'development' });
    expect(path.basename(DEFAULT_DATA_DIR)).toBe('data');
  });

  it('reads RIOT_REGION case-insensitively, PORT and DATA_DIR', () => {
    const c = loadConfig({ RIOT_REGION: 'europe', PORT: '8080', DATA_DIR: '/tmp/x' });
    expect(c).toMatchObject({ riotRegion: 'EUROPE', port: 8080, dataDir: path.resolve('/tmp/x') });
  });

  it('rejects bad values', () => {
    expect(() => loadConfig({ RIOT_REGION: 'mars' })).toThrow(/RIOT_REGION/u);
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/u);
  });

  it('CARD-002: the key is redacted in logs and JSON', () => {
    const c = loadConfig({ RIOT_API_KEY: `${KEY_PREFIX}secret-value` });
    expect(c.riotApiKey?.reveal()).toBe(`${KEY_PREFIX}secret-value`);
    expect(JSON.stringify(c)).not.toContain(KEY_PREFIX);
    expect(inspect(c)).not.toContain(KEY_PREFIX);
    expect(String(c.riotApiKey)).toBe('[redacted]');
  });
});
