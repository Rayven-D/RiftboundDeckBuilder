import type { StoredSyncLog } from './sync-types';

/**
 * SPEC-010 SYNC-009 sign-in gate. Pure, so it is decided from the sync log alone: no Firebase, no wait
 * for the session restore (SYNC-002, SYNC-080).
 *
 * - `open`: the gated pages show their content and Tournaments shows its deck controls.
 * - `signed-out`: no session expected (never signed in, or signed out).
 * - `session-lost`: a lost session was detected (SYNC-086, `sessionLostUid`).
 * - `first-sync`: signed in, the first sync on this device is running (SYNC-048).
 * - `first-sync-failed`: that flow failed; the page offers Try again.
 */
export type GateState = 'open' | 'signed-out' | 'session-lost' | 'first-sync' | 'first-sync-failed';

/** What only the running engine knows: the first-sign-in flow failed, or the session was lost before it completed. */
export interface GateRuntime {
  firstSyncFailed?: boolean;
  sessionLost?: boolean;
}

/**
 * The gate is open when a session is expected, the linked uid is set, a first sync completed and the session
 * is not lost. There is no build in which it is off (SYNC-001, SYNC-007).
 */
export function gateState(log: StoredSyncLog | null, runtime: GateRuntime = {}): GateState {
  if (!log?.sessionExpected) return 'signed-out';
  const linked = log.uid ?? null;
  if (linked !== null && log.sessionLostUid === linked) return 'session-lost';
  if (linked !== null && log.lastFullSyncAt !== null) return 'open';
  // First sync not complete (SYNC-048). A session lost before it completed needs a new sign-in, not a retry.
  if (runtime.sessionLost) return 'session-lost';
  return runtime.firstSyncFailed ? 'first-sync-failed' : 'first-sync';
}
