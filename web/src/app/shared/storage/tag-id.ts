import { StoredTags, StoredViewState, TagId, ViewQuery } from './records';

/** SYNC-016: `t_` + 6 base-62 characters. */
export const SHORT_TAG_ID = /^t_[0-9A-Za-z]{6}$/;
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export type RandomInt = (maxExclusive: number) => number;

/** Default random source: `crypto.getRandomValues` (no modulo bias worth caring about at 62 of 2^32). */
export const cryptoRandomInt: RandomInt = (max) => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
};

/**
 * A new short tag id, unique among `taken` (live tags and tag tombstones, SYNC-016). A collision is
 * drawn again.
 */
export function newTagId(taken: ReadonlySet<string>, random: RandomInt = cryptoRandomInt): TagId {
  for (;;) {
    let id = 't_';
    for (let i = 0; i < 6; i++) id += BASE62[random(62)];
    if (!taken.has(id)) return id;
  }
}

/** Raw tags record as found in storage: version 2 or 3, ids of any format. */
export interface TagsV2orV3 {
  schemaVersion: 2 | 3;
  updatedAt: string;
  tags: StoredTags['tags'];
  assignments: StoredTags['assignments'];
}

/**
 * SYNC-016 migration: gives every tag whose id is not short a short id and rewrites every reference
 * (assignments, the view state's tag filter and saved views). Pure. Returns `changed: false` when the
 * record already is version 3 with short ids only.
 */
export function migrateTagIds(
  record: TagsV2orV3,
  view: StoredViewState | null,
  taken: ReadonlySet<string>,
  random: RandomInt = cryptoRandomInt,
): { tags: StoredTags; view: StoredViewState | null; idMap: Record<string, TagId>; changed: boolean } {
  const used = new Set<string>(taken);
  for (const t of record.tags) used.add(t.id);
  const idMap: Record<string, TagId> = {};
  for (const t of record.tags) {
    if (!SHORT_TAG_ID.test(t.id)) {
      const id = newTagId(used, random);
      used.add(id);
      idMap[t.id] = id;
    }
  }
  const map = (id: string): string => idMap[id] ?? id;
  const changed = record.schemaVersion !== 3 || Object.keys(idMap).length > 0;
  const tags: StoredTags = {
    schemaVersion: 3,
    updatedAt: record.updatedAt,
    tags: record.tags.map((t) => ({ ...t, id: map(t.id) })),
    assignments: Object.fromEntries(
      Object.entries(record.assignments).map(([target, ids]) => [target, ids.map(map)]),
    ),
  };
  let nextView = view;
  if (view && Object.keys(idMap).length > 0) {
    const fix = (q: ViewQuery): ViewQuery => ({ ...q, tags: { ...q.tags, ids: q.tags.ids.map(map) } });
    nextView = {
      ...view,
      query: fix(view.query),
      ...(view.savedViews ? { savedViews: view.savedViews.map((s) => ({ ...s, query: fix(s.query) })) } : {}),
    };
  }
  return { tags, view: nextView, idMap, changed };
}
