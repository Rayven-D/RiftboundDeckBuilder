// SPEC-010 SYNC-104 (b) (H-180): the notice's Markdown subset, parsed into text blocks (never HTML).
import { noticeInlineText, parseNoticeInline, parseNoticeMarkdown } from './notice-markdown';

describe('SYNC-104 (b) parseNoticeMarkdown', () => {
  it('SYNC-104 (b) headings, paragraphs (wrapped lines joined) and lists', () => {
    const blocks = parseNoticeMarkdown('# Title\n\nLine one\nline two.\n\n## Part\n\n- a\n- b\n  continued\n\nAfter.\n');
    expect(blocks.map((b) => b.kind)).toEqual(['h1', 'p', 'h2', 'ul', 'p']);
    expect(blocks[1]).toEqual({ kind: 'p', inlines: [{ kind: 'text', text: 'Line one line two.' }] });
    const list = blocks[3];
    expect(list.kind === 'ul' && list.items.map(noticeInlineText)).toEqual(['a', 'b continued']);
  });

  it('SYNC-104 (b) CRLF line endings parse the same', () => {
    expect(parseNoticeMarkdown('# T\r\n\r\nP\r\n')).toEqual(parseNoticeMarkdown('# T\n\nP\n'));
  });

  it('SYNC-104 (b) inline strong, em, code and links', () => {
    expect(parseNoticeInline('Open **Account Information**, *italic*, `code` and [the page](/changelog).')).toEqual([
      { kind: 'text', text: 'Open ' },
      { kind: 'strong', text: 'Account Information' },
      { kind: 'text', text: ', ' },
      { kind: 'em', text: 'italic' },
      { kind: 'text', text: ', ' },
      { kind: 'code', text: 'code' },
      { kind: 'text', text: ' and ' },
      { kind: 'link', text: 'the page', href: '/changelog' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('SYNC-101 bracketed text that is not a link, like the release-day date, stays text as written', () => {
    const line = 'Effective [set on release: date dev → main ships sign-in] · Last updated [set on release: x]';
    expect(parseNoticeInline(line)).toEqual([{ kind: 'text', text: line }]);
  });

  it('SYNC-104 (b) markup-looking text is kept as text, never as HTML', () => {
    expect(parseNoticeInline('<b>x</b>')).toEqual([{ kind: 'text', text: '<b>x</b>' }]);
  });
});
