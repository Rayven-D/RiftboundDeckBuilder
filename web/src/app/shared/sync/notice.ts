/**
 * H-116 (Brief H-113 H-116 H-123 H-126, WCAG 2.2.1): how long a sync notice stays and how it is announced.
 * - `success` confirms something the user did: closes after 6 s, polite.
 * - `info` (instructions and events) stays until OK, polite.
 * - `error` stays until OK, assertive (the only assertive kind).
 * A missing or unknown kind is treated as `info`, so a new message never closes on its own by accident.
 * Not for the Collection page's own notices (COLL-054's Remove-card Undo needs at least 8 s).
 */
export type NoticeKind = 'success' | 'info' | 'error';

export const SUCCESS_NOTICE_MS = 6000;

export interface NoticeOptions {
  /** 0 = no timer: stays open until the user closes it (Material's snack-bar meaning). */
  duration: number;
  politeness: 'polite' | 'assertive';
}

export function noticeOptions(kind?: NoticeKind): NoticeOptions {
  switch (kind) {
    case 'success':
      return { duration: SUCCESS_NOTICE_MS, politeness: 'polite' };
    case 'error':
      return { duration: 0, politeness: 'assertive' };
    default:
      return { duration: 0, politeness: 'polite' };
  }
}
