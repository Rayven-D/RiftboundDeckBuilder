import { TestBed } from '@angular/core/testing';
import { environment as prod } from '../../environments/environment';
import { environment as dev } from '../../environments/environment.development';
import { API_BASE_URL } from './api-base-url';

// H-055: dev and prod must build the same API paths. Dev reaches the services server through
// the ng serve proxy (proxy.conf.json: /api -> http://localhost:3000), not an absolute URL.
describe('API_BASE_URL (H-055)', () => {
  it('is /api in both the production and development environments', () => {
    expect(prod.apiBaseUrl).toBe('/api');
    expect(dev.apiBaseUrl).toBe('/api');
  });

  it('resolves to /api, so the health check path is /api/health', () => {
    const base = TestBed.inject(API_BASE_URL);
    expect(`${base}/health`).toBe('/api/health');
  });
});
