// V-003 / CARD-035: read card names from a decklist research note.
// Format (brain/01-Research/Decklists): YAML frontmatter with `legend:` and `champion:`,
// then sections whose lines are `<count> <card name>`.

export interface DecklistEntry {
  count: number;
  name: string;
  section: string;
}

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) {
    return t.slice(1, -1).replace(/\\"/gu, '"');
  }
  return t;
}

export function parseDecklistNote(markdown: string): DecklistEntry[] {
  const lines = markdown.replace(/\r\n/gu, '\n').split('\n');
  const entries: DecklistEntry[] = [];
  let i = 0;
  if (lines[0]?.trim() === '---') {
    for (i = 1; i < lines.length && lines[i]?.trim() !== '---'; i++) {
      const m = /^(legend|champion):\s*(.+)$/u.exec(lines[i] ?? '');
      if (m) entries.push({ count: 1, name: unquote(m[2] as string), section: m[1] as string });
    }
    i++;
  }
  let section = '';
  for (; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const h = /^##\s+(.+)$/u.exec(line);
    if (h) {
      section = (h[1] as string).trim();
      continue;
    }
    if (section === '' || /^notes$/iu.test(section)) continue;
    const m = /^([0-9]+)\s+(.+?)\s*$/u.exec(line);
    if (m) entries.push({ count: Number.parseInt(m[1] as string, 10), name: m[2] as string, section });
  }
  return entries;
}
