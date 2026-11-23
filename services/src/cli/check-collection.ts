// Smoke check: resolve a plain-text test collection ("<count> <card name>") against data/cards.json.
// npm run check:collection [-- --file <txt>] [--data-dir <dir>]
// This is a dev aid only; the real importer is SPEC-003 (web/).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { FileSnapshotStore } from '../adapters/file-snapshot-store.ts';
import { loadConfig, PROJECT_ROOT } from '../config.ts';
import { CardIndex } from '../domain/lookup.ts';

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { file: { type: 'string' }, 'data-dir': { type: 'string' } },
    strict: true,
  });
  const config = loadConfig({ ...process.env, ...(values['data-dir'] ? { DATA_DIR: values['data-dir'] } : {}) });
  const snapshot = await new FileSnapshotStore(config.dataDir).readSnapshot();
  if (!snapshot) {
    console.error(`No snapshot at ${path.join(config.dataDir, 'cards.json')}. Run npm run ingest:cards first.`);
    return 2;
  }
  const index = new CardIndex(snapshot);
  const file = path.resolve(values.file ?? path.join(PROJECT_ROOT, 'data', 'samples', 'test-collection.txt'));
  const lines = (await readFile(file, 'utf8')).replace(/\r\n/gu, '\n').split('\n');
  let misses = 0;
  let total = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const m = /^(\d+)\s+(.+)$/u.exec(line);
    if (!m) {
      console.log(`SKIP  ${line} (expected "<count> <name>")`);
      continue;
    }
    const count = Number(m[1]);
    const name = m[2] as string;
    const card = index.findCard(name);
    if (!card) {
      misses++;
      console.log(`MISS  ${count}x ${name}`);
      continue;
    }
    total += count;
    const printings = index.printingsOf(card);
    const codes = printings.map((p) => p.publicCode ?? `${p.setCode}-${p.collectorNumber}`).join(', ');
    const art = printings[0]?.art.thumbnailUrl ? 'art ok' : 'no art url';
    console.log(`OK    ${count}x ${card.name} [${card.category}; ${(card.domains ?? ['?']).join('/')}] printings: ${codes} (${art})`);
  }
  console.log(`Test collection against ${snapshot.catalogVersion}: ${total} cards owned, ${misses} unresolved name(s)`);
  return misses === 0 ? 0 : 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    console.error((e as Error).message);
    process.exitCode = 1;
  },
);
