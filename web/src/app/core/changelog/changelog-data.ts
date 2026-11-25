import { InjectionToken } from '@angular/core';
import type { ChangelogEntry } from '../../shared/changelog/changelog';
import changelog from './changelog.json';

/**
 * SPEC-012 LOG-030: the release entries, bundled with the app at build time (nothing is fetched). The page still
 * checks every entry at run time (LOG-024), so tests can provide malformed data through this token.
 */
export const CHANGELOG_DATA = new InjectionToken<readonly unknown[]>('CHANGELOG_DATA', {
  providedIn: 'root',
  // A one-entry file infers `date: null`; the contract type is wider.
  factory: () => changelog as ChangelogEntry[],
});
