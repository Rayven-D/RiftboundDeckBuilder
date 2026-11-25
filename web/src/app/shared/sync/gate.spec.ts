import { gateState } from './gate';
import { emptySyncLog } from './sync-log';
import type { StoredSyncLog } from './sync-types';

const log = (over: Partial<StoredSyncLog>): StoredSyncLog => ({ ...emptySyncLog(), ...over });
const synced = log({ uid: 'uA', sessionExpected: true, lastFullSyncAt: 1 });

describe('gateState (SPEC-010 SYNC-009, always on: SYNC-001 / AC 63)', () => {
  it('SYNC-009 / AC 46 / AC 48 closed with no session: no log, an empty log, or stamps left by the old no-account build', () => {
    expect(gateState(null)).toBe('signed-out');
    expect(gateState(emptySyncLog())).toBe('signed-out');
    expect(gateState(log({ cards: { 'hextech ray': { t: 1, deleted: false, h: 'x' } }, pending: { ...emptySyncLog().pending, cards: ['hextech ray'] } }))).toBe(
      'signed-out',
    );
    // a linked uid alone (sessionExpected false) never opens it
    expect(gateState(log({ uid: 'uA', lastFullSyncAt: 1 }))).toBe('signed-out');
  });

  it('SYNC-009 / AC 47 open when a session is expected, the uid is linked and a first sync completed', () => {
    expect(gateState(synced)).toBe('open');
  });

  it('SYNC-009 / SYNC-086 / AC 27 closed while sessionLostUid equals the linked uid', () => {
    expect(gateState(log({ ...synced, sessionLostUid: 'uA' }))).toBe('session-lost');
    expect(gateState(log({ ...synced, sessionLostUid: null }))).toBe('open');
    expect(gateState(log({ ...synced, sessionLostUid: 'uOther' }))).toBe('open');
  });

  it('SYNC-009 / SYNC-048 / AC 25 / AC 47 first sync running, failed, or its session lost', () => {
    const running = log({ sessionExpected: true });
    expect(gateState(running)).toBe('first-sync');
    expect(gateState(log({ sessionExpected: true, uid: 'uA', lastFullSyncAt: null }))).toBe('first-sync');
    expect(gateState(running, { firstSyncFailed: true })).toBe('first-sync-failed');
    expect(gateState(running, { sessionLost: true })).toBe('session-lost');
  });
});
