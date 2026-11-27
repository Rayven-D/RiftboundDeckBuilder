import type { Provider } from '@angular/core';
import { ACCOUNT_STORES } from '../app-stores';
import type { BrowserStores } from '../browser-stores';

/** Test helper: the real `AppStores` with `stores` (usually over a `MemoryBackend`) as the account cache. */
export function provideTestStores(stores: BrowserStores): Provider {
  return { provide: ACCOUNT_STORES, useValue: stores };
}
