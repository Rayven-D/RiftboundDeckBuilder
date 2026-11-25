import { Component, inject } from '@angular/core';
import { CHANGELOG_DATA } from '../../core/changelog/changelog-data';
import { formatReleaseDate, showableEntries } from '../../shared/changelog/changelog';

/**
 * SPEC-012 "What's new" (`/changelog`). Public and never gated (LOG-001): it injects nothing from sync, so it loads no
 * Firebase, makes no request and reads or writes no storage (LOG-003). Entries show in the file's order; a bad one is
 * skipped (LOG-024). Text is bound as text, never as HTML (LOG-022).
 */
@Component({
  selector: 'app-changelog-page',
  template: `
    <header class="page-header">
      <h1>What's new</h1>
      <p class="page-lede">What's changed in Rift Builder, newest first.</p>
    </header>
    @if (entries.length) {
      <ol class="entries">
        @for (entry of entries; track $index) {
          <li class="entry">
            <h2>{{ entry.title }}</h2>
            <p class="meta">
              <span>Version {{ entry.version }}</span>
              <span aria-hidden="true">·</span>
              @if (entry.date; as date) {
                <time [attr.datetime]="date">{{ formatDate(date) }}</time>
              } @else {
                <span>Coming soon</span>
              }
            </p>
            <ul class="bullets">
              @for (bullet of entry.bullets; track $index) {
                <li>{{ bullet }}</li>
              }
            </ul>
          </li>
        }
      </ol>
    } @else {
      <p class="empty">Nothing to show yet.</p>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 65ch;
      margin: 0 auto;
    }
    .entries {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .entry {
      padding-block: var(--space-5);
      border-top: 1px solid var(--color-border);
    }
    .entry:first-child {
      padding-top: 0;
      border-top: 0;
    }
    h2 {
      margin: 0 0 var(--space-1);
      font-size: var(--font-size-lg);
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0 var(--space-2);
      margin: 0 0 var(--space-3);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    /* H-222: the nested list would get the second-level hollow circle; use a filled, muted dot. */
    .bullets {
      margin: 0;
      padding-left: 1.25rem;
      list-style-type: disc;
    }
    .bullets li::marker {
      color: var(--color-text-muted);
    }
    .bullets li {
      overflow-wrap: anywhere;
    }
    .bullets li + li {
      margin-top: var(--space-1);
    }
    .empty {
      margin: 0;
      color: var(--color-text-muted);
    }
  `,
})
export class ChangelogPage {
  protected readonly entries = showableEntries(inject(CHANGELOG_DATA));
  protected readonly formatDate = formatReleaseDate;
}
