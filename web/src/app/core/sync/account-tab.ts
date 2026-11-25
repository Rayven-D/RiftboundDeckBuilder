import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * SPEC-010 SYNC-150 (g), H-246: the phone account tab's content. The (deferred) account menu owns the tab's button
 * and the one menu definition, and hands its template here; the app shell renders it in the tab bar's fourth
 * column. Until the account code has loaded this is `null` and the column stays reserved but empty (no shift).
 * The template keeps its declaring component's context, so one `AccountMenu` serves both triggers.
 */
@Injectable({ providedIn: 'root' })
export class AccountTab {
  readonly template = signal<TemplateRef<unknown> | null>(null);
}
