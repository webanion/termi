// The guide's pages are a small subset of markdown: a `#` title, `##` headings, paragraphs,
// `-` lists, `code`, **bold**, and {action} for the keys of a shortcut. They are read into
// blocks of text here and rendered as text, so nothing in a page is ever markup.

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'keys'; name: string };

export type Block =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'list'; items: Inline[][] };

const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|\{([a-z0-9-]+)\}/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last) out.push({ kind: 'text', text: text.slice(last, match.index) });
    const [, code, strong, keys] = match;
    if (code !== undefined) out.push({ kind: 'code', text: code });
    else if (strong !== undefined) out.push({ kind: 'strong', text: strong });
    else if (keys !== undefined) out.push({ kind: 'keys', name: keys });
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

export function parseGuide(source: string): Block[] {
  const blocks: Block[] = [];
  let list: Inline[][] | null = null;
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      if (!list) blocks.push({ kind: 'list', items: (list = []) });
      list.push(parseInline(line.slice(2)));
      continue;
    }
    list = null;
    if (!line) continue;
    if (line.startsWith('## ')) blocks.push({ kind: 'heading', text: line.slice(3) });
    else if (line.startsWith('# ')) blocks.push({ kind: 'title', text: line.slice(2) });
    else blocks.push({ kind: 'paragraph', inlines: parseInline(line) });
  }
  return blocks;
}
