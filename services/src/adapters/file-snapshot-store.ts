// Local-file SnapshotStore (ADR-0001): data/cards.json, data/cards.report.json,
// data/variant-rules.json, data/raw/*. Writes go to a temp file, then rename (CARD-064).
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { toStableJson } from '../domain/normalize.ts';
import type { SnapshotStore } from '../domain/ports.ts';
import type { CardSnapshot, IngestionReport, VariantRulesFile } from '../domain/types.ts';
import { EMPTY_VARIANT_RULES, parseVariantRules } from '../domain/variant-rules.ts';

function isNotFound(e: unknown): boolean {
  return (e as NodeJS.ErrnoException).code === 'ENOENT';
}

export async function writeFileAtomic(file: string, body: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  try {
    await writeFile(tmp, body, 'utf8');
    await rename(tmp, file);
  } catch (e) {
    await rm(tmp, { force: true });
    throw e;
  }
}

async function readTextOrNull(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

export class FileSnapshotStore implements SnapshotStore {
  readonly dataDir: string;
  private cache: { mtimeMs: number; size: number; snapshot: CardSnapshot } | null = null;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  get snapshotFile(): string {
    return path.join(this.dataDir, 'cards.json');
  }
  get reportFile(): string {
    return path.join(this.dataDir, 'cards.report.json');
  }
  get variantRulesFile(): string {
    return path.join(this.dataDir, 'variant-rules.json');
  }
  get rawDir(): string {
    return path.join(this.dataDir, 'raw');
  }

  /** Re-reads cards.json only when it changed on disk (mtime/size). */
  async readSnapshot(): Promise<CardSnapshot | null> {
    let info;
    try {
      info = await stat(this.snapshotFile);
    } catch (e) {
      if (isNotFound(e)) {
        this.cache = null;
        return null;
      }
      throw e;
    }
    if (this.cache && this.cache.mtimeMs === info.mtimeMs && this.cache.size === info.size) {
      return this.cache.snapshot;
    }
    const text = await readTextOrNull(this.snapshotFile);
    if (text === null) return null;
    const snapshot = JSON.parse(text) as CardSnapshot;
    this.cache = { mtimeMs: info.mtimeMs, size: info.size, snapshot };
    return snapshot;
  }

  async writeSnapshot(snapshot: CardSnapshot, report: IngestionReport): Promise<void> {
    const snapshotText = toStableJson(snapshot);
    const reportText = toStableJson(report);
    await writeFileAtomic(this.snapshotFile, snapshotText);
    await writeFileAtomic(this.reportFile, reportText);
    this.cache = null;
  }

  async readReport(): Promise<IngestionReport | null> {
    const text = await readTextOrNull(this.reportFile);
    return text === null ? null : (JSON.parse(text) as IngestionReport);
  }

  async readVariantRules(): Promise<VariantRulesFile> {
    const text = await readTextOrNull(this.variantRulesFile);
    return text === null ? EMPTY_VARIANT_RULES : parseVariantRules(JSON.parse(text));
  }

  async writeRaw(fileName: string, body: string): Promise<string> {
    const file = path.join(this.rawDir, path.basename(fileName));
    await writeFileAtomic(file, body);
    return file;
  }

  async readRaw(fileName: string): Promise<string | null> {
    return readTextOrNull(path.join(this.rawDir, path.basename(fileName)));
  }
}
