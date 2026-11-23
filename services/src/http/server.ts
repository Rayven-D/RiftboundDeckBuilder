// Read-only HTTP API on Node's built-in http module. Contract: brain/05-Services/API Contracts.md (v1).
import { createServer, type Server, type ServerResponse } from 'node:http';
import { withPrintings, type CardRepository } from '../domain/card-repository.ts';
import type { CardIndex } from '../domain/lookup.ts';
import { compareNumber } from '../domain/compare.ts';

export const DEV_ORIGINS: readonly string[] = ['http://localhost:4200'];
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export type ErrorCode = 'bad-request' | 'not-found' | 'method-not-allowed' | 'snapshot-unavailable' | 'internal';

export interface ServerOptions {
  repository: CardRepository;
  /** CORS is enabled only for these origins; pass [] outside development. */
  corsOrigins: readonly string[];
  log?: (line: string) => void;
}

class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function send(res: ServerResponse, status: number, body: unknown, method: string): void {
  const text = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Length', Buffer.byteLength(text));
  res.end(method === 'HEAD' ? undefined : text);
}

function parsePositiveInt(value: string | null, name: string, fallback: number, max?: number): number {
  if (value === null) return fallback;
  if (!/^[0-9]+$/u.test(value)) throw new HttpError(400, 'bad-request', `${name} must be a positive integer`);
  const n = Number.parseInt(value, 10);
  if (n < 1 || (max !== undefined && n > max)) {
    throw new HttpError(400, 'bad-request', `${name} must be between 1 and ${max ?? Number.MAX_SAFE_INTEGER}`);
  }
  return n;
}

async function requireIndex(repo: CardRepository): Promise<CardIndex> {
  const index = await repo.current();
  if (!index) {
    throw new HttpError(
      503,
      'snapshot-unavailable',
      'No card snapshot yet. Run `npm run ingest:cards` in services/ to create data/cards.json.',
    );
  }
  return index;
}

async function route(url: URL, repo: CardRepository): Promise<{ status: number; body: unknown }> {
  const p = url.pathname;
  if (p === '/api/health') {
    const index = await repo.current();
    return {
      status: 200,
      body: {
        status: 'ok',
        snapshot: index ? 'available' : 'missing',
        catalogVersion: index?.snapshot.catalogVersion ?? null,
      },
    };
  }
  if (p === '/api/sets') {
    const index = await requireIndex(repo);
    const items = [...index.snapshot.sets].sort((a, b) => compareNumber(a.setOrder, b.setOrder));
    return { status: 200, body: { catalogVersion: index.snapshot.catalogVersion, items } };
  }
  if (p === '/api/cards') {
    const page = parsePositiveInt(url.searchParams.get('page'), 'page', 1);
    const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), 'pageSize', DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const index = await requireIndex(repo);
    const all = index.snapshot.cards;
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize).map((c) => withPrintings(index, c));
    return {
      status: 200,
      body: { catalogVersion: index.snapshot.catalogVersion, page, pageSize, total: all.length, items },
    };
  }
  const m = /^\/api\/cards\/([^/]+)$/u.exec(p);
  if (m) {
    let key: string;
    try {
      key = decodeURIComponent(m[1] as string);
    } catch {
      throw new HttpError(400, 'bad-request', 'cardKey is not valid URL encoding');
    }
    const index = await requireIndex(repo);
    const card = index.findCard(key);
    if (!card) throw new HttpError(404, 'not-found', `No card with cardKey "${key}"`);
    return { status: 200, body: { catalogVersion: index.snapshot.catalogVersion, card: withPrintings(index, card) } };
  }
  throw new HttpError(404, 'not-found', `No route for ${p}`);
}

export function createApiServer(opts: ServerOptions): Server {
  const log = opts.log ?? (() => undefined);
  return createServer((req, res) => {
    const started = Date.now();
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const origin = req.headers.origin;
    if (origin !== undefined && opts.corsOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    const done = (status: number): void => log(`${method} ${url.pathname} ${status} ${Date.now() - started}ms`);

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      done(204);
      return;
    }
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD, OPTIONS');
      send(res, 405, { error: { code: 'method-not-allowed', message: 'This API is read-only' } }, method);
      done(405);
      return;
    }
    route(url, opts.repository)
      .then(({ status, body }) => {
        send(res, status, body, method);
        done(status);
      })
      .catch((e: unknown) => {
        if (e instanceof HttpError) {
          send(res, e.status, { error: { code: e.code, message: e.message } }, method);
          done(e.status);
          return;
        }
        log(`error: ${(e as Error).message}`);
        send(res, 500, { error: { code: 'internal', message: 'Internal server error' } }, method);
        done(500);
      });
  });
}
