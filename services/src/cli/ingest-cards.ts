// npm run ingest:cards [-- --from <raw.json>] [--data-dir <dir>] [--region <R>] [--rederive]
// Fetches riftbound-content-v1 (or reads a local raw file), keeps the raw response in
// data/raw/, and writes data/cards.json + data/cards.report.json (SPEC-001).
import path from 'node:path';
import { parseArgs } from 'node:util';
import { FileSnapshotStore } from '../adapters/file-snapshot-store.ts';
import { FileContentSource, RiotContentClient } from '../adapters/riot-content-client.ts';
import { loadConfig } from '../config.ts';
import { IngestionError } from '../domain/errors.ts';
import { ingest, rederive, type IngestOutcome } from '../domain/ingest-pipeline.ts';
import type { ContentSource } from '../domain/ports.ts';
import type { RiotRegion } from '../domain/types.ts';

const HELP = `Usage: npm run ingest:cards -- [options]

  --from <file>       read a raw riftbound-content-v1 response from a file (no API call)
  --data-dir <dir>    output folder (default: DATA_DIR or <project>/data)
  --region <region>   AMERICAS | ASIA | EUROPE (default: RIOT_REGION or AMERICAS)
  --rederive          rebuild cards.json from the stored raw file with the current
                      data/variant-rules.json (no API call)
  --help              show this help

Without --from or --rederive, RIOT_API_KEY must be set (in the project-root .env).`;

function summarize(o: IngestOutcome, dataDir: string): string {
  const r = o.report;
  const lines = [
    `catalogVersion ${r.catalogVersion}`,
    `sets ${o.snapshot.sets.length}, cards ${o.snapshot.cards.length}, printings ${o.snapshot.printings.length}`,
    `added ${r.addedPrintings.length}, removed ${r.removedPrintings.length}, new sets [${r.newSets.join(', ')}]`,
    `unmapped types [${r.unmappedTypes.map((t) => JSON.stringify(t)).join(', ')}], field conflicts ${r.fieldConflicts.length}, collector collisions ${r.collectorCollisions.length}`,
    `unknown variants ${r.unknownVariantCount}, new properties [${r.newProperties.join(', ')}]`,
    `wrote ${path.join(dataDir, 'cards.json')} and cards.report.json; raw: ${o.rawFile}`,
  ];
  return lines.join('\n');
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      'data-dir': { type: 'string' },
      region: { type: 'string' },
      rederive: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  const config = loadConfig({
    ...process.env,
    ...(values['data-dir'] ? { DATA_DIR: values['data-dir'] } : {}),
    ...(values.region ? { RIOT_REGION: values.region } : {}),
  });
  const store = new FileSnapshotStore(config.dataDir);

  if (values.rederive) {
    console.log(summarize(await rederive(store), config.dataDir));
    return 0;
  }

  let source: ContentSource;
  if (values.from) {
    source = new FileContentSource(path.resolve(values.from));
  } else if (config.riotApiKey) {
    source = new RiotContentClient({ apiKey: config.riotApiKey, region: config.riotRegion });
  } else {
    console.error('RIOT_API_KEY is not set. Put it in the project-root .env, or use --from <raw.json>.');
    return 2;
  }
  console.log(`ingesting from ${source.description}`);
  const outcome = await ingest(source, { store, region: config.riotRegion as RiotRegion });
  console.log(summarize(outcome, config.dataDir));
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e: unknown) => {
    if (e instanceof IngestionError) console.error(`${e.message}\nThe previous snapshot was left unchanged.`);
    else console.error(`ingest failed: ${(e as Error).message}\nThe previous snapshot was left unchanged.`);
    process.exitCode = 1;
  },
);
