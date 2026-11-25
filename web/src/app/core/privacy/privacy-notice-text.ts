import { InjectionToken } from '@angular/core';
import notice from './privacy-notice.md' with { loader: 'text' };

/**
 * SPEC-010 SYNC-101 / SYNC-104 (H-180): the privacy notice text, `privacy-notice.md` in this folder, bundled with the
 * app at build time (nothing is fetched, SYNC-104 a). That file is the one the two SYNC-101 checks scan
 * (`web/scripts/privacy-notice-checks.mjs`). A token so tests can provide other text (for example a dated notice).
 */
export const PRIVACY_NOTICE_TEXT = new InjectionToken<string>('PRIVACY_NOTICE_TEXT', {
  providedIn: 'root',
  factory: () => notice,
});
