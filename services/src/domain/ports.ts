// Host-neutral interfaces (ADR-0001). Adapters in src/adapters/ implement them.
import type { CardSnapshot, IngestionReport, VariantRulesFile } from './types.ts';

/** Storage for the card snapshot, its report, variant rules and raw API responses. */
export interface SnapshotStore {
  /** The current snapshot, or null if none exists. */
  readSnapshot(): Promise<CardSnapshot | null>;
  /** Replaces snapshot + report atomically per file (write-then-rename, CARD-064). */
  writeSnapshot(snapshot: CardSnapshot, report: IngestionReport): Promise<void>;
  readReport(): Promise<IngestionReport | null>;
  /** data/variant-rules.json; an empty rule list (version "0") if the file doesn't exist. */
  readVariantRules(): Promise<VariantRulesFile>;
  /** Raw API responses (CARD-042), stored byte-for-byte. */
  writeRaw(fileName: string, body: string): Promise<string>;
  readRaw(fileName: string): Promise<string | null>;
}

/** Source of the raw `riftbound-content-v1` response text. */
export interface ContentSource {
  /** Human-readable description for logs (never includes secrets). */
  readonly description: string;
  /** True for `--from <file>`: the response already exists on disk. */
  readonly isLocalFile?: boolean;
  fetchContents(): Promise<string>;
}
