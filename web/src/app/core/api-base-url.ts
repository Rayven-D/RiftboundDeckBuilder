import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Base URL of the TypeScript API in services/: `/api` in every environment, so callers build
 * the same path everywhere (`${base}/health` -> `/api/health`). In dev, `ng serve` proxies
 * `/api` to the services server (proxy.conf.json). Public config only: never secrets.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
