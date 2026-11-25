import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRIVACY_NOTICE_TEXT } from '../../core/privacy/privacy-notice-text';
import { type NoticeInline, parseNoticeMarkdown } from '../../shared/privacy/notice-markdown';

/** One run of notice text (inline parts), bound as text. Links starting with `/` stay in the app (same tab). */
@Component({
  selector: 'app-notice-inlines',
  imports: [RouterLink],
  template: `
    @for (part of parts(); track $index) {
      @switch (part.kind) {
        @case ('strong') {
          <strong>{{ part.text }}</strong>
        }
        @case ('em') {
          <em>{{ part.text }}</em>
        }
        @case ('code') {
          <code>{{ part.text }}</code>
        }
        @case ('link') {
          @if (internalHref(part); as path) {
            <a [routerLink]="path">{{ part.text }}</a>
          } @else {
            <a [href]="href(part)">{{ part.text }}</a>
          }
        }
        @default {
          {{ part.text }}
        }
      }
    }
  `,
})
export class NoticeInlines {
  readonly parts = input.required<readonly NoticeInline[]>();
  protected internalHref(part: NoticeInline): string | null {
    return part.kind === 'link' && part.href.startsWith('/') ? part.href : null;
  }
  protected href(part: NoticeInline): string {
    return part.kind === 'link' ? part.href : '';
  }
}

/**
 * SPEC-010 SYNC-104 (H-180): the privacy notice at `/privacy`. Public and never gated (SYNC-009): it injects nothing
 * from sync, so it loads no Firebase, makes no request and reads or writes no storage (SYNC-104 a, h). The text is
 * `core/privacy/privacy-notice.md`, bundled at build time; one `<h1>` (from the file's `#` line), plain headings and
 * paragraphs, bound as text, never as HTML.
 */
@Component({
  selector: 'app-privacy-page',
  imports: [NoticeInlines],
  template: `
    <article class="notice">
      @for (block of blocks; track $index) {
        @switch (block.kind) {
          @case ('h1') {
            <h1><app-notice-inlines [parts]="block.inlines" /></h1>
          }
          @case ('h2') {
            <h2><app-notice-inlines [parts]="block.inlines" /></h2>
          }
          @case ('p') {
            <!-- The paragraph right under the heading is the effective / last-updated line (SYNC-104 b). -->
            <p [class.dates]="$index === 1"><app-notice-inlines [parts]="block.inlines" /></p>
          }
          @case ('ul') {
            <ul>
              @for (item of block.items; track $index) {
                <li><app-notice-inlines [parts]="item" /></li>
              }
            </ul>
          }
        }
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
      max-width: 65ch;
      margin: 0 auto;
    }
    .notice {
      overflow-wrap: anywhere;
    }
    h1 {
      margin: 0 0 var(--space-2);
    }
    .dates {
      margin: 0 0 var(--space-5);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    h2 {
      margin: var(--space-6) 0 var(--space-2);
      font-size: var(--font-size-lg);
      line-height: 1.25;
    }
    p {
      margin: 0 0 var(--space-3);
    }
    ul {
      margin: 0 0 var(--space-3);
      padding-left: 1.25rem;
      list-style-type: disc;
    }
    li + li {
      margin-top: var(--space-1);
    }
  `,
})
export class PrivacyPage {
  protected readonly blocks = parseNoticeMarkdown(inject(PRIVACY_NOTICE_TEXT));
}
