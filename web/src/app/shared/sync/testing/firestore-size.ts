/**
 * Test-only: the stored size of a Firestore document by the storage-size rules
 * (https://firebase.google.com/docs/firestore/storage-size, as recorded in brain/05-Services/Firestore Data Shape.md):
 * string = UTF-8 bytes + 1; integer, float, timestamp = 8; boolean, null = 1; array = sum of its values;
 * map = its keys + values + 32 (sized like a document, the convention SPEC-013 uses; an upper bound);
 * document name = each collection and document id (string size) + 16; document = name + fields + 32.
 */
const utf8 = (s: string) => new TextEncoder().encode(s).length;

export function valueSize(v: unknown): number {
  if (v === null || v === undefined) return 1;
  if (typeof v === 'string') return utf8(v) + 1;
  if (typeof v === 'number') return 8;
  if (typeof v === 'boolean') return 1;
  if (v instanceof Date) return 8;
  if (Array.isArray(v)) return v.reduce((n: number, x) => n + valueSize(x), 0);
  if (typeof v === 'object') return fieldsSize(v as Record<string, unknown>) + 32;
  throw new Error(`no size rule for ${typeof v}`);
}

function fieldsSize(o: Record<string, unknown>): number {
  let n = 0;
  for (const [k, v] of Object.entries(o)) n += utf8(k) + 1 + valueSize(v);
  return n;
}

/** `users/{uid}/state/collection` → 'users', uid, 'state', 'collection' + 16. */
export function documentNameSize(path: string): number {
  return path.split('/').reduce((n, seg) => n + utf8(seg) + 1, 0) + 16;
}

export function documentSize(path: string, data: Record<string, unknown>): number {
  return documentNameSize(path) + fieldsSize(data) + 32;
}
