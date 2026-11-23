import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileSnapshotStore } from '../src/adapters/file-snapshot-store.ts';
import { FileContentSource } from '../src/adapters/riot-content-client.ts';
import { IngestionError } from '../src/domain/errors.ts';
import { ingest, rawFileName, rederive } from '../src/domain/ingest-pipeline.ts';
import type { ContentSource } from '../src/domain/ports.ts';
import { FIXTURE_PATH, FIXTURE_TEXT, fixture } from './helpers.ts';

// Built at runtime so the repo never contains the key prefix literally (V-012).
const KEY_PREFIX = ['RGAPI', ''].join('-');

const textSource = (body: string): ContentSource => ({ description: 'test', fetchContents: () => Promise.resolve(body) });
const fixedNow = () => new Date('2026-11-23T12:00:00.000Z');

describe('ingest pipeline with FileSnapshotStore', () => {
  let dir: string;
  let store: FileSnapshotStore;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rb-ingest-'));
    store = new FileSnapshotStore(dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('CARD-042/060/065: writes cards.json, cards.report.json and the raw response verbatim', async () => {
    const out = await ingest(new FileContentSource(FIXTURE_PATH), { store, region: 'AMERICAS', now: fixedNow });
    expect(await readdir(dir)).toEqual(expect.arrayContaining(['cards.json', 'cards.report.json', 'raw']));
    expect(rawFileName('2026-11-20T18:04:00Z')).toBe('riot-contents-2026-11-20T18-04-00Z.json');
    expect(await readFile(path.join(dir, 'raw', 'riot-contents-2026-11-20T18-04-00Z.json'), 'utf8')).toBe(FIXTURE_TEXT);
    expect((await store.readSnapshot())?.catalogVersion).toBe(out.snapshot.catalogVersion);
    expect((await store.readReport())?.catalogVersion).toBe('0.2+2026-11-20T18:04:00Z');
    expect((await readdir(dir)).some((f) => f.endsWith('.tmp'))).toBe(false);
  });

  it('CARD-061 AC15: two runs on the same response are byte-identical', async () => {
    await ingest(textSource(FIXTURE_TEXT), { store, region: 'AMERICAS', now: fixedNow });
    const first = await readFile(store.snapshotFile, 'utf8');
    await ingest(textSource(FIXTURE_TEXT), { store, region: 'AMERICAS', now: fixedNow });
    expect(await readFile(store.snapshotFile, 'utf8')).toBe(first);
  });

  it('CARD-064 AC14: a failed run leaves cards.json byte-for-byte unchanged', async () => {
    await ingest(textSource(FIXTURE_TEXT), { store, region: 'AMERICAS', now: fixedNow });
    const before = await readFile(store.snapshotFile);
    const reportBefore = await readFile(store.reportFile);
    const bad = fixture();
    const firstSet = (bad['sets'] as { cards: Record<string, unknown>[] }[])[0];
    delete firstSet?.cards[0]?.['name'];
    await expect(ingest(textSource(JSON.stringify(bad)), { store, region: 'AMERICAS' })).rejects.toThrow(IngestionError);
    await expect(ingest(textSource('{not json'), { store, region: 'AMERICAS' })).rejects.toThrow(/not valid JSON/u);
    expect(await readFile(store.snapshotFile)).toEqual(before);
    expect(await readFile(store.reportFile)).toEqual(reportBefore);
    // the raw file of the current snapshot is untouched; failed API bodies are kept separately
    expect(await store.readRaw(rawFileName('2026-11-20T18:04:00Z'))).toBe(FIXTURE_TEXT);
    expect((await readdir(store.rawDir)).filter((f) => f.startsWith('riot-contents-failed-'))).toHaveLength(2);
  });

  it('CARD-041 AC9/AC18: re-derive applies new rules from the stored raw file, catalogVersion unchanged', async () => {
    const first = await ingest(textSource(FIXTURE_TEXT), { store, region: 'EUROPE', now: fixedNow });
    await writeFile(
      store.variantRulesFile,
      JSON.stringify({ version: '1', rules: [{ id: 'VR-001', when: { field: 'rarity', equals: 'Showcase' }, kind: 'showcase', source: 'test' }] }),
    );
    const out = await rederive(store);
    expect(out.snapshot.catalogVersion).toBe(first.snapshot.catalogVersion);
    expect(out.snapshot.variantRulesVersion).toBe('1');
    expect(out.snapshot.fetchedAt).toBe(first.snapshot.fetchedAt);
    expect(out.snapshot.source.region).toBe('EUROPE');
    expect(out.snapshot.printings.find((p) => p.printingId === 'synthetic-rad-sp1-005')?.variant.kind).toBe('showcase');
  });

  it('CARD-002 AC13: no key prefix anywhere in data/', async () => {
    await ingest(textSource(FIXTURE_TEXT), { store, region: 'AMERICAS' });
    for (const f of ['cards.json', 'cards.report.json']) expect(await readFile(path.join(dir, f), 'utf8')).not.toContain(KEY_PREFIX);
  });

  it('readSnapshot returns null when there is no snapshot', async () => {
    expect(await store.readSnapshot()).toBeNull();
    expect(await store.readVariantRules()).toEqual({ version: '0', rules: [] });
  });
});
