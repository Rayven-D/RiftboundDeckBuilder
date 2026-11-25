/**
 * SPEC-010 SYNC-104 (b) (H-180): the privacy notice is written in a small Markdown subset
 * (`core/privacy/privacy-notice.md`) and turned into plain blocks here, so the page binds text, never HTML. Pure
 * functions, no Angular.
 *
 * Supported: `# h1`, `## h2`, paragraphs (lines joined until a blank line), `- ` list items, and inline
 * `**strong**`, `*em*`, `` `code` `` and `[text](href)` links. Any other bracketed text, such as the release-day
 * marker `[set on release: …]`, stays text as written.
 */

export type NoticeInline =
  | { kind: 'text' | 'strong' | 'em' | 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

export type NoticeBlock =
  | { kind: 'h1' | 'h2' | 'p'; inlines: NoticeInline[] }
  | { kind: 'ul'; items: NoticeInline[][] };

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseNoticeInline(text: string): NoticeInline[] {
  const out: NoticeInline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: 'strong', text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: 'em', text: m[2] });
    else if (m[3] !== undefined) out.push({ kind: 'code', text: m[3] });
    else out.push({ kind: 'link', text: m[4], href: m[5] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

export function parseNoticeMarkdown(source: string): NoticeBlock[] {
  const blocks: NoticeBlock[] = [];
  const open: { paragraph: string[]; list: string[] } = { paragraph: [], list: [] };

  const flush = () => {
    if (open.paragraph.length) blocks.push({ kind: 'p', inlines: parseNoticeInline(open.paragraph.join(' ')) });
    if (open.list.length) blocks.push({ kind: 'ul', items: open.list.map(parseNoticeInline) });
    open.paragraph = [];
    open.list = [];
  };

  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'h2', inlines: parseNoticeInline(line.slice(3).trim()) });
    } else if (line.startsWith('# ')) {
      flush();
      blocks.push({ kind: 'h1', inlines: parseNoticeInline(line.slice(2).trim()) });
    } else if (line.startsWith('- ')) {
      if (open.paragraph.length) flush();
      open.list.push(line.slice(2).trim());
    } else if (open.list.length) {
      // A wrapped list item continues the previous item.
      open.list[open.list.length - 1] += ' ' + line;
    } else {
      open.paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** The plain text of some inlines (headings, tests). */
export function noticeInlineText(inlines: readonly NoticeInline[]): string {
  return inlines.map((i) => i.text).join('');
}
