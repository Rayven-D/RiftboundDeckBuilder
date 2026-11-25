import { statusText, unsyncedWarning } from './status-text';
import { MESSAGES } from './sync-engine';

describe('statusText (SPEC-010 SYNC-084, SYNC-090)', () => {
  it('SYNC-084 offline with pending changes reads as AC 19 says', () => {
    expect(statusText({ kind: 'offline', pendingCount: 2 })).toBe(
      'Offline · changes are saved on this device · 2 changes not synced yet',
    );
  });

  it('SYNC-084 each status has its text', () => {
    expect(statusText({ kind: 'synced', at: 0, pendingCount: 0 }, () => '9:41 AM')).toBe('Synced · 9:41 AM');
    expect(statusText({ kind: 'syncing', pendingCount: 1 })).toBe('Syncing… · 1 change not synced yet');
    expect(statusText({ kind: 'paused', pendingCount: 0 })).toBe(MESSAGES.paused);
    expect(statusText({ kind: 'error', message: MESSAGES.writeFailed, pendingCount: 0 })).toBe(MESSAGES.writeFailed);
  });

  it('SYNC-084 / AC 54 during an unfinished deletion the Error status has no pending count; other errors keep it', () => {
    expect(statusText({ kind: 'error', message: MESSAGES.deleteIncomplete, pendingCount: 3 })).toBe(
      "Some data couldn't be deleted. Try again.",
    );
    expect(statusText({ kind: 'error', message: MESSAGES.writeFailed, pendingCount: 3 })).toBe(
      `${MESSAGES.writeFailed} · 3 changes not synced yet`,
    );
  });

  it('SYNC-090 the sign-out warning counts unsynced changes (AC 20)', () => {
    expect(unsyncedWarning(1)).toBe("1 change hasn't synced yet. It'll be lost if you sign out now.");
    expect(unsyncedWarning(3)).toBe("3 changes haven't synced yet. They'll be lost if you sign out now.");
    expect(unsyncedWarning(0)).toBeNull();
  });
});
