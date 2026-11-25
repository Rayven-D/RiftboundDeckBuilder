import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { AuthProviderId } from '../../shared/sync/sync-types';

/** SPEC-010 SYNC-006: the enabled sign-in providers (environment `authProviders`). */
export const AUTH_PROVIDERS = new InjectionToken<readonly AuthProviderId[]>('AUTH_PROVIDERS', {
  providedIn: 'root',
  factory: () => environment.authProviders,
});
