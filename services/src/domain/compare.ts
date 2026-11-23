/** Deterministic string order by UTF-16 code unit (locale-independent). */
export function compareCodePoint(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function compareNumber(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}
