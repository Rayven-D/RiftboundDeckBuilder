import { mkdtemp, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FileSnapshotStore } from '../src/adapters/file-snapshot-store.ts';
import { CardRepository } from '../src/domain/card-repository.ts';
import { ingest } from '../src/domain/ingest-pipeline.ts';
import { createApiServer, DEV_ORIGINS } from '../src/http/server.ts';
import { FIXTURE_TEXT } from './helpers.ts';

async function start(dataDir: string, corsOrigins: readonly string[] = DEV_ORIGINS): Promise<{ server: Server; base: string }> {
  const server = createApiServer({ repository: new CardRepository(new FileSnapshotStore(dataDir)), corsOrigins });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}
const stop = (s: Server) => new Promise<void>((resolve) => s.close(() => resolve()));

describe('HTTP API v1', () => {
  let dir: string;
  let emptyDir: string;
  let api: { server: Server; base: string };
  let empty: { server: Server; base: string };

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'rb-http-'));
    emptyDir = await mkdtemp(path.join(tmpdir(), 'rb-http-empty-'));
    await ingest({ description: 'fixture', fetchContents: () => Promise.resolve(FIXTURE_TEXT) }, { store: new FileSnapshotStore(dir), region: 'AMERICAS' });
    api = await start(dir);
    empty = await start(emptyDir);
  });
  afterAll(async () => {
    await stop(api.server);
    await stop(empty.server);
    await rm(dir, { recursive: true, force: true });
    await rm(emptyDir, { recursive: true, force: true });
  });

  it('GET /api/health', async () => {
    const res = await fetch(`${api.base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', snapshot: 'available', catalogVersion: '0.2+2026-11-20T18:04:00Z' });
    expect(await (await fetch(`${empty.base}/api/health`)).json()).toEqual({ status: 'ok', snapshot: 'missing', catalogVersion: null });
  });

  it('GET /api/cards pages through cards with their printings', async () => {
    const res = await fetch(`${api.base}/api/cards?page=2&pageSize=3`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { page: number; pageSize: number; total: number; items: { cardKey: string; printings: { art: { fullUrl: string } }[] }[] };
    expect(body).toMatchObject({ catalogVersion: '0.2+2026-11-20T18:04:00Z', page: 2, pageSize: 3, total: 7 });
    expect(body.items.map((c) => c.cardKey)).toEqual(['kaisa survivor', 'riven the exile', 'starcrossed']);
    expect(body.items[0]?.printings).toHaveLength(3);
    expect(body.items[0]?.printings[0]?.art.fullUrl).toBe('https://example.invalid/synthetic/synthetic-ogn-0300-full.png');
  });

  it('GET /api/cards defaults and validation', async () => {
    const body = (await (await fetch(`${api.base}/api/cards`)).json()) as { page: number; pageSize: number; items: unknown[] };
    expect(body).toMatchObject({ page: 1, pageSize: 50 });
    expect(body.items).toHaveLength(7);
    const bad = await fetch(`${api.base}/api/cards?pageSize=500`);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: { code: 'bad-request', message: 'pageSize must be between 1 and 200' } });
  });

  it('GET /api/cards/:cardKey (key or name) and 404', async () => {
    const res = await fetch(`${api.base}/api/cards/${encodeURIComponent('kaisa survivor')}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { card: { name: string; printings: { printingId: string }[] } };
    expect(body.card.name).toBe("Kai'Sa, Survivor");
    expect(body.card.printings.map((p) => p.printingId)).toEqual(['synthetic-ogn-0300', 'synthetic-ven-0102', 'synthetic-rad-sp1-005']);
    expect((await fetch(`${api.base}/api/cards/${encodeURIComponent("Kai'Sa, Survivor")}`)).status).toBe(200);
    const missing = await fetch(`${api.base}/api/cards/nope`);
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe('not-found');
  });

  it('GET /api/sets in setOrder', async () => {
    const body = (await (await fetch(`${api.base}/api/sets`)).json()) as { items: { code: string }[] };
    expect(body.items.map((s) => s.code)).toEqual(['OGN', 'SFD', 'VEN', 'RAD']);
  });

  it('503 when no snapshot exists', async () => {
    const res = await fetch(`${empty.base}/api/cards`);
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: { code: string; message: string } }).error).toMatchObject({ code: 'snapshot-unavailable' });
  });

  it('read-only: POST → 405', async () => {
    const res = await fetch(`${api.base}/api/cards`, { method: 'POST' });
    expect(res.status).toBe(405);
  });

  it('CORS only for http://localhost:4200 in dev', async () => {
    const ok = await fetch(`${api.base}/api/health`, { headers: { Origin: 'http://localhost:4200' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:4200');
    const other = await fetch(`${api.base}/api/health`, { headers: { Origin: 'http://evil.example' } });
    expect(other.headers.get('access-control-allow-origin')).toBeNull();
    const prod = await start(dir, []);
    const res = await fetch(`${prod.base}/api/health`, { headers: { Origin: 'http://localhost:4200' } });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
    await stop(prod.server);
  });
});
