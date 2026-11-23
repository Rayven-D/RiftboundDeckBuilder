// V-003 / CARD-035: every card named in a decklist note resolves to exactly one card.
// npm run check:decklists [-- --decklists <dir>] [--data-dir <dir>]
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { FileSnapshotStore } from '../adapters/file-snapshot-store.ts';
import { loadConfig, PROJECT_ROOT } from '../config.ts';
import { parseDecklistNote } from '../domain/decklist.ts';
import { CardIndex } from '../domain/lookup.ts';

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { decklists: { type: 'string' }, 'data-dir': { type: 'string' } },
    strict: true,
  });
  const config = loadConfig({ ...process.env, ...(values['data-dir'] ? { DATA_DIR: values['data-dir'] } : {}) });
  const snapshot = await new FileSnapshotStore(config.dataDir).readSnapshot();
  if (!snapshot) {
    console.error(`No snapshot at ${path.join(config.dataDir, 'cards.json')}. Run npm run ingest:cards first.`);
    return 2;
  }
  const index = new CardIndex(snapshot);
  const dir = path.resolve(values.decklists ?? path.join(PROJECT_ROOT, 'brain', '01-Research', 'Decklists'));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  let misses = 0;
  for (const f of files) {
    const entries = parseDecklistNote(await readFile(path.join(dir, f), 'utf8'));
    const missing = [...new Set(entries.map((e) => e.name))].filter((n) => !index.findCard(n));
    misses += missing.length;
    console.log(`${missing.length === 0 ? 'PASS' : 'FAIL'} ${f}${missing.length ? `: ${missing.join('; ')}` : ''}`);
  }
  console.log(`V-003 against ${snapshot.catalogVersion}: ${files.length} decklists, ${misses} unresolved name(s)`);
  return misses === 0 && files.length > 0 ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    console.error(`check failed: ${(e as Error).message}`);
    process.exitCode = 1;
  },
);
