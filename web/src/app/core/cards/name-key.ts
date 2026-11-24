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
