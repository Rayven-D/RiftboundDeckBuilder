import type { SyncStatus } from './sync-types';

/** SYNC-084: one sync status, as text (never colour alone). */
export function statusText(s: SyncStatus, formatTime: (ms: number) => string = defaultTime): string {
  if (s.kind === 'signed-out') return 'Not signed in';
  const base =
    s.kind === 'synced'
      ? `Synced · ${formatTime(s.at)}`
      : s.kind === 'syncing'
        ? 'Syncing…'
        : s.kind === 'offline'
          ? 'Offline · changes are saved on this device'
          : s.kind === 'paused'
            ? 'Sync paused. Your changes are saved on this device.'
            : s.message;
  if (s.pendingCount === 0) return base;
  const n = s.pendingCount;
  return `${base} · ${n} ${n === 1 ? 'change' : 'changes'} not synced yet`;
}

/** SYNC-090: the sign-out warning for unsynced changes. */
export function unsyncedWarning(n: number): string | null {
  if (n <= 0) return null;
  const first = n === 1 ? "1 change hasn't synced yet." : `${n} changes haven't synced yet.`;
  return `${first} They'll be lost if you remove this device's copy.`;
}

const defaultTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
