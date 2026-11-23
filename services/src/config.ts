// Configuration from environment variables only (ADR-0001). Documented in the root .env.example.
// RIOT_API_KEY is wrapped in Secret so it can't be logged or serialized by accident (CARD-002).
import { inspect } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RiotRegion } from './domain/types.ts';

export class Secret {
  readonly #value: string;
  constructor(value: string) {
    this.#value = value;
  }
  /** The only way to read the value. Use it solely to set the request header. */
  reveal(): string {
    return this.#value;
  }
  toString(): string {
    return '[redacted]';
  }
  toJSON(): string {
    return '[redacted]';
  }
  [inspect.custom](): string {
    return '[redacted]';
  }
}

export interface Config {
  riotApiKey: Secret | null;
  riotRegion: RiotRegion;
  port: number;
  dataDir: string;
  nodeEnv: string;
}

const REGIONS: readonly RiotRegion[] = ['AMERICAS', 'ASIA', 'EUROPE'];

/** services/src/config.ts and services/dist/config.js both sit two levels below the project root. */
export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_DATA_DIR = path.join(PROJECT_ROOT, 'data');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const region = (env['RIOT_REGION'] ?? 'AMERICAS').trim().toUpperCase();
  if (!REGIONS.includes(region as RiotRegion)) {
    throw new Error(`RIOT_REGION must be one of ${REGIONS.join(', ')} (got "${region}")`);
  }
  const portText = (env['PORT'] ?? '3000').trim();
  const port = Number.parseInt(portText, 10);
  if (!/^[0-9]+$/u.test(portText) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer 0-65535 (got "${portText}")`);
  }
  const key = env['RIOT_API_KEY']?.trim() ?? '';
  const dataDir = env['DATA_DIR']?.trim();
  return {
    riotApiKey: key === '' ? null : new Secret(key),
    riotRegion: region as RiotRegion,
    port,
    dataDir: dataDir ? path.resolve(dataDir) : DEFAULT_DATA_DIR,
    nodeEnv: (env['NODE_ENV'] ?? 'development').trim() || 'development',
  };
}
