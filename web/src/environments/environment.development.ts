// Local development config (used by `ng serve`). Never put secrets or API keys here.
// `/api` is proxied to the services server (http://localhost:3000) by proxy.conf.json, so dev and prod build identical paths.
export const environment = {
  production: false,
  apiBaseUrl: '/api',
};
