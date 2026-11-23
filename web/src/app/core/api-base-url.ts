import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** Base URL of the TypeScript API in services/. Public config only: never secrets. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});
