// SPEC-001 ingestion run: source → raw file → normalize → snapshot + report.
// A failed run throws before anything replaces the current snapshot (CARD-064).
import { IngestionError } from './errors.ts';
import { normalizeContents, type NormalizeResult } from './normalize.ts';
import type { ContentSource, SnapshotStore } from './ports.ts';
import type { RiotRegion } from './types.ts';

/** CARD-042 raw file name; `:` is not allowed in Windows file names, so it becomes `-`. */
export function rawFileName(lastUpdated: string): string {
  return `riot-contents-${lastUpdated.replace(/[^A-Za-z0-9._+-]/gu, '-')}.json`;
}

function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (e) {
    throw new IngestionError([`${what} is not valid JSON: ${(e as Error).message}`]);
  }
}

export interface IngestOptions {
  store: SnapshotStore;
  region: RiotRegion;
  now?: () => Date;
}

export interface IngestOutcome extends NormalizeResult {
  rawFile: string;
}

/**
 * Fetch (or read) a response and write a new snapshot. The raw copy is stored only after the
 * response normalized cleanly, so a bad response can't overwrite the raw file the current
 * snapshot was built from. A failed API response is kept as riot-contents-failed-<time>.json
 * for debugging (data/raw/ is gitignored).
 */
export async function ingest(source: ContentSource, opts: IngestOptions): Promise<IngestOutcome> {
  const now = opts.now ?? (() => new Date());
  const fetchedAt = now().toISOString();
  const body = await source.fetchContents();
  let result: NormalizeResult;
  try {
    const raw = parseJson(body, source.description);
    const previous = await opts.store.readSnapshot().catch(() => null);
    result = normalizeContents(raw, {
      region: opts.region,
      fetchedAt,
      variantRules: await opts.store.readVariantRules(),
      previous,
    });
  } catch (e) {
    if (!source.isLocalFile) await opts.store.writeRaw(rawFileName(`failed-${fetchedAt}`), body);
    throw e;
  }
  const rawFile = await opts.store.writeRaw(rawFileName(result.snapshot.source.lastUpdated), body);
  await opts.store.writeSnapshot(result.snapshot, result.report);
  return { ...result, rawFile };
}

/**
 * Re-derive mode (CARD-041, AC9/AC18): rebuild the snapshot from the stored raw response of the
 * current snapshot with the current variant rules. No API call. Keeps fetchedAt and region.
 */
export async function rederive(store: SnapshotStore): Promise<IngestOutcome> {
  const current = await store.readSnapshot();
  if (!current) throw new IngestionError(['no snapshot to re-derive from; run a normal ingest first']);
  const fileName = rawFileName(current.source.lastUpdated);
  const body = await store.readRaw(fileName);
  if (body === null) throw new IngestionError([`raw response ${fileName} not found in data/raw/`]);
  const result = normalizeContents(parseJson(body, fileName), {
    region: current.source.region,
    fetchedAt: current.fetchedAt,
    variantRules: await store.readVariantRules(),
    previous: current,
  });
  await store.writeSnapshot(result.snapshot, result.report);
  return { ...result, rawFile: fileName };
}
