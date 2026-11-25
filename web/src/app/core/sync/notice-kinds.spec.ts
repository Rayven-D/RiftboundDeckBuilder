import { TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { MESSAGES } from '../../shared/sync/sync-engine';
import { AccountMenu } from './account-menu';
import { SIGN_IN_ENABLED, SYNC_ADAPTERS, SyncService } from './sync.service';

/** H-116 (Brief H-113 H-116 H-123 H-126, WCAG 2.2.1): what the snack bar is opened with, per notice kind. */
describe('H-116 SyncService notices', () => {
  let open: ReturnType<typeof vi.spyOn>;
  let sync: SyncService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: SIGN_IN_ENABLED, useValue: true },
        {
          provide: SYNC_ADAPTERS,
          useValue: async () => {
            throw new Error('not in unit tests');
          },
        },
      ],
    });
    sync = TestBed.inject(SyncService);
    open = vi.spyOn(TestBed.inject(MatSnackBar), 'open').mockReturnValue(undefined as never);
  });

  const lastCall = () => open.mock.calls.at(-1) as [string, string, MatSnackBarConfig];

  it('H-116 success ("Your account wasn\'t deleted.") closes after 6 s, polite, with OK', () => {
    sync.notify(MESSAGES.deleteNotDone, 'success');
    const [message, action, config] = lastCall();
    expect(message).toBe(MESSAGES.deleteNotDone);
    expect(action).toBe('OK');
    expect(config.duration).toBe(6000);
    expect(config.politeness).toBe('polite');
  });

  it('H-116 info (the reauth instruction) stays until OK and is polite', () => {
    sync.notify(MESSAGES.reauthNeeded, 'info');
    const [, action, config] = lastCall();
    expect(action).toBe('OK');
    expect(config.duration ?? 0).toBe(0);
    expect(config.politeness).toBe('polite');
  });

  it('H-116 error (a failed write) stays until OK and is assertive', () => {
    sync.notify(MESSAGES.writeFailed, 'error');
    const [, action, config] = lastCall();
    expect(action).toBe('OK');
    expect(config.duration ?? 0).toBe(0);
    expect(config.politeness).toBe('assertive');
  });

  it('H-116 an unclassified message stays open and is polite', () => {
    sync.notify('Something new.');
    const [, action, config] = lastCall();
    expect(action).toBe('OK');
    expect(config.duration ?? 0).toBe(0);
    expect(config.politeness).toBe('polite');
  });

  it('H-116 the engine\'s notices reach the snack bar with their kind (sign-out refused offline = error)', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      expect(await sync.signOut()).toBe('offline');
    } finally {
      online.mockRestore();
    }
    const [message, action, config] = lastCall();
    expect(message).toBe(MESSAGES.offline);
    expect(action).toBe('OK');
    expect(config.duration ?? 0).toBe(0);
    expect(config.politeness).toBe('assertive');
  });
});

describe('H-116 AccountMenu delete failure notice', () => {
  it('H-116 runDelete\'s failure notice is assertive with Try again and no timer', async () => {
    const opened: [string, string | undefined, MatSnackBarConfig | undefined][] = [];
    TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        {
          provide: SyncService,
          useValue: {
            enabled: true,
            start: () => undefined,
            signedIn: () => true,
            online: () => true,
            statusLine: () => '',
            status: () => ({ kind: 'synced', at: 0, pendingCount: 0 }),
            currentEmail: () => null,
            deletion: () => null,
            deleteAccount: async () => 'failed',
          },
        },
        {
          provide: MatSnackBar,
          useValue: {
            open: (m: string, a?: string, c?: MatSnackBarConfig) => (
              opened.push([m, a, c]), { onAction: () => new Subject<void>() }
            ),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(AccountMenu);
    await (fixture.componentInstance as unknown as { runDelete(): Promise<void> }).runDelete();
    expect(opened).toHaveLength(1);
    const [message, action, config] = opened[0];
    expect(message).toBe(MESSAGES.deleteIncomplete);
    expect(action).toBe('Try again');
    expect(config?.politeness).toBe('assertive');
    expect(config?.duration ?? 0).toBe(0);
  });
});
