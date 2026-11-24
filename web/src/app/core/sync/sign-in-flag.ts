import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { AuthProviderId } from '../../shared/sync/sync-types';

/** SPEC-010 SYNC-006: the enabled sign-in providers (environment `authProviders`). */
export const AUTH_PROVIDERS = new InjectionToken<readonly AuthProviderId[]>('AUTH_PROVIDERS', {
  providedIn: 'root',
  factory: () => environment.authProviders,
});

/**
 * SPEC-010 SYNC-007 build flag (environment `signInEnabled`). Kept in its own tiny file so the app
 * shell can read it without pulling the sync code into the initial bundle.
 */
export const SIGN_IN_ENABLED = new InjectionToken<boolean>('SIGN_IN_ENABLED', {
  providedIn: 'root',
  factory: () => environment.signInEnabled,
});
