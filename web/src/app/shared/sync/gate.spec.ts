import { gateState } from './gate';
import { emptySyncLog } from './sync-log';
import type { StoredSyncLog } from './sync-types';

const log = (over: Partial<StoredSyncLog>): StoredSyncLog => ({ ...emptySyncLog(), ...over });
const synced = log({ uid: 'uA', sessionExpected: true, lastFullSyncAt: 1 });

describe('gateState (SPEC-010 SYNC-008 / SYNC-009)', () => {
  it('SYNC-008 / AC 45 local-only mode has no gate, whatever the log says', () => {
    for (const l of [null, emptySyncLog(), synced, log({ ...synced, sessionLostUid: 'uA' }), log({ sessionExpected: true })]) {
      expect(gateState(false, l)).toBe('open');
      expect(gateState(false, l, { firstSyncFailed: true, sessionLost: true })).toBe('open');
    }
  });

  it('SYNC-009 / AC 46 closed with no session: no log, an empty log, or a log left by local-only stamping', () => {
    expect(gateState(true, null)).toBe('signed-out');
    expect(gateState(true, emptySyncLog())).toBe('signed-out');
    expect(gateState(true, log({ cards: { 'hextech ray': { t: 1, deleted: false, h: 'x' } }, pending: { ...emptySyncLog().pending, cards: ['hextech ray'] } }))).toBe(
      'signed-out',
    );
    // a linked uid alone (sessionExpected false) never opens it
    expect(gateState(true, log({ uid: 'uA', lastFullSyncAt: 1 }))).toBe('signed-out');
  });

  it('SYNC-009 / AC 47 open when a session is expected, the uid is linked and a first sync completed', () => {
    expect(gateState(true, synced)).toBe('open');
  });

  it('SYNC-009 / SYNC-086 / AC 27 closed while sessionLostUid equals the linked uid', () => {
    expect(gateState(true, log({ ...synced, sessionLostUid: 'uA' }))).toBe('session-lost');
    expect(gateState(true, log({ ...synced, sessionLostUid: null }))).toBe('open');
    expect(gateState(true, log({ ...synced, sessionLostUid: 'uOther' }))).toBe('open');
  });

  it('SYNC-009 / SYNC-048 / AC 25 / AC 47 first sync running, failed, or its session lost', () => {
    const running = log({ sessionExpected: true });
    expect(gateState(true, running)).toBe('first-sync');
    expect(gateState(true, log({ sessionExpected: true, uid: 'uA', lastFullSyncAt: null }))).toBe('first-sync');
    expect(gateState(true, running, { firstSyncFailed: true })).toBe('first-sync-failed');
    expect(gateState(true, running, { sessionLost: true })).toBe('session-lost');
  });
});
