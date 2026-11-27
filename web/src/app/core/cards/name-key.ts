/**
 * CARD-030 `nameKey` (same steps as `services/src/domain/name-key.ts`; `web/` can't import from
 * `services/`). Used for lookups only; display always uses the canonical name (CARD-031).
 */
export function nameKey(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[’‘ʼ´`]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[‐‑–—]/gu, '-')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** `nameKey` output with one leading `a ` / `the ` token removed; unchanged if nothing would remain (CARD-034). */
function dropArticle(key: string): string {
  const m = /^(?:a|the) (.+)$/u.exec(key);
  return m ? m[1] : key;
}

/**
 * CARD-034 `looseKey`: `nameKey(s)` with one leading article token (`a ` or `the `) removed; if nothing would remain
 * (`The`, `a`), it is `nameKey(s)`. Lookups only, never a `cardKey`.
 */
export function looseKey(name: string): string {
  return dropArticle(nameKey(name));
}

export type NameLookupResult =
  | { readonly status: 'found'; readonly cardKey: string; readonly method: 'exact' | 'article' }
  | { readonly status: 'ambiguous'; readonly cardKeys: readonly string[] }
  | { readonly status: 'not-found' };

/**
 * CARD-033 / CARD-034 name lookup over a catalog's `cardKey`s, the one lookup both imports use (IMP-025, DECK-040):
 * (1) `nameKey(input)` is a `cardKey` → `found` (`exact`), step 2 never runs; (2) otherwise `looseKey(input)` against
 * `looseKey(cardKey)` of every card, both ways: one → `found` (`article`), several → `ambiguous` (their `cardKey`s,
 * sorted), none → `not-found`. Build it once per catalog; the returned function does no catalog scan.
 */
export function nameLookup(cardKeys: Iterable<string>): (name: string) => NameLookupResult {
  const exact = new Set<string>();
  const byLoose = new Map<string, string[]>();
  for (const key of cardKeys) {
    exact.add(key);
    const loose = dropArticle(key);
    const list = byLoose.get(loose);
    if (list) list.push(key);
    else byLoose.set(loose, [key]);
  }
  for (const list of byLoose.values()) list.sort();
  return (name) => {
    const key = nameKey(name);
    if (!key) return { status: 'not-found' };
    if (exact.has(key)) return { status: 'found', cardKey: key, method: 'exact' };
    const matches = byLoose.get(dropArticle(key)) ?? [];
    if (matches.length === 1) return { status: 'found', cardKey: matches[0], method: 'article' };
    if (matches.length > 1) return { status: 'ambiguous', cardKeys: matches };
    return { status: 'not-found' };
  };
}
