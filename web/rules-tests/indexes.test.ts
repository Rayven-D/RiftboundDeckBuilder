import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface Override {
  collectionGroup: string;
  fieldPath: string;
  indexes: unknown[];
}
const file = JSON.parse(readFileSync(fileURLToPath(new URL('../../firestore.indexes.json', import.meta.url)), 'utf8')) as {
  indexes: unknown[];
  fieldOverrides: Override[];
};
const exempt = (group: string) =>
  new Set(file.fieldOverrides.filter((o) => o.collectionGroup === group && o.indexes.length === 0).map((o) => o.fieldPath));

describe('firestore.indexes.json (SPEC-010 SYNC-115, AC 23)', () => {
  it('SYNC-115 exempts every state field except syncedAt', () => {
    expect([...exempt('state')].sort()).toEqual(
      ['assignments', 'cards', 'catalogVersion', 'locks', 'schemaVersion', 'tags', 'updatedAt'].sort(),
    );
  });

  it('SYNC-115 exempts every deck field (UserDeck fields plus deletedAt, updatedAt, createdAt, schemaVersion) except syncedAt', () => {
    const userDeckFields = [
      'name', 'format', 'source', 'sourceFormat', 'notes', 'catalogVersion', 'duplicatedFrom', 'importRemovedLines',
      'legend', 'champion', 'main', 'sideboard', 'runes', 'battlefields',
    ];
    expect([...exempt('decks')].sort()).toEqual([...userDeckFields, 'deletedAt', 'updatedAt', 'createdAt', 'schemaVersion'].sort());
  });

  it('SYNC-115 keeps syncedAt indexed and needs no composite index', () => {
    expect(file.fieldOverrides.some((o) => o.fieldPath === 'syncedAt')).toBe(false);
    expect(file.indexes).toEqual([]);
  });
});
