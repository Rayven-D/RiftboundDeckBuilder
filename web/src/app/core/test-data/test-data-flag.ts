import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** SPEC-013 TEST-001 / TEST-040: the build flag `testDataEnabled` (environment), injectable so tests can turn it off. */
export const TEST_DATA_ENABLED = new InjectionToken<boolean>('TEST_DATA_ENABLED', {
  providedIn: 'root',
  factory: () => environment.testDataEnabled,
});
