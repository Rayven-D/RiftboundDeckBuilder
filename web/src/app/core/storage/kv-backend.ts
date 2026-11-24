/**
 * The one place browser storage is touched. Stores take a `KeyValueBackend`, so tests use the
 * in-memory one and the app uses `localStorage` (DECK-090 allows localStorage; IndexedDB can replace
 * it later behind the same interface).
 */
export interface KeyValueBackend {
  get(key: string): string | null;
  /** Throws `StorageFullError` when the browser refuses the write (quota). */
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export class StorageFullError extends Error {
  constructor() {
    super('Browser storage is full');
    this.name = 'StorageFullError';
  }
}

/** Key prefix of every Rift Builder record, so "remove from this device" can clear them all. */
export const KEY_PREFIX = 'rift.';

export class LocalStorageBackend implements KeyValueBackend {
  constructor(private readonly storage: Storage = localStorage) {}

  get(key: string): string | null {
    return this.storage.getItem(key);
  }

  set(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      throw new StorageFullError();
    }
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  keys(): string[] {
    const out: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k !== null) out.push(k);
    }
    return out;
  }
}

export class MemoryBackend implements KeyValueBackend {
  readonly data = new Map<string, string>();
  /** Test hook: when set, `set()` throws `StorageFullError`. */
  full = false;

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    if (this.full) throw new StorageFullError();
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }

  keys(): string[] {
    return [...this.data.keys()];
  }
}
