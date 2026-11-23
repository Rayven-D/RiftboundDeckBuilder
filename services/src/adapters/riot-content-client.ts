// Riot API `riftbound-content-v1` (research fact #9, schema unverified).
// The key is sent only as the X-Riot-Token header over HTTPS and never appears in URLs,
// logs or error messages (CARD-002).
import { readFile } from 'node:fs/promises';
import type { Secret } from '../config.ts';
import type { ContentSource } from '../domain/ports.ts';
import type { RiotRegion } from '../domain/types.ts';

export function contentsUrl(region: RiotRegion): string {
  return `https://${region.toLowerCase()}.api.riotgames.com/riftbound/content/v1/contents?locale=en`;
}

export class RiotContentClient implements ContentSource {
  readonly description: string;
  private readonly url: string;
  private readonly apiKey: Secret;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: { apiKey: Secret; region: RiotRegion; fetchImpl?: typeof fetch; timeoutMs?: number }) {
    this.apiKey = opts.apiKey;
    this.url = contentsUrl(opts.region);
    this.description = `Riot API ${this.url}`;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 30_000;
  }

  async fetchContents(): Promise<string> {
    let res: Response;
    try {
      res = await this.fetchImpl(this.url, {
        headers: { 'X-Riot-Token': this.apiKey.reveal(), Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      // Only the error name/message: never the request options (they contain the key), so no `cause`.
      // eslint-disable-next-line preserve-caught-error
      throw new Error(`Riot API request failed: ${(e as Error).name}: ${(e as Error).message}`);
    }
    if (!res.ok) {
      const hint =
        res.status === 401 || res.status === 403
          ? ' (check RIOT_API_KEY in .env; development keys expire every 24 hours)'
          : res.status === 429
            ? ' (rate limited; try again later)'
            : '';
      throw new Error(`Riot API returned HTTP ${res.status} ${res.statusText}${hint}`);
    }
    return res.text();
  }
}

/** Reads a raw response from a local file instead of the API (`--from`). */
export class FileContentSource implements ContentSource {
  readonly description: string;
  readonly isLocalFile = true;
  private readonly file: string;
  constructor(file: string) {
    this.file = file;
    this.description = `file ${file}`;
  }
  async fetchContents(): Promise<string> {
    return readFile(this.file, 'utf8');
  }
}
