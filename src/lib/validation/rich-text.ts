import type { RichTextDoc } from '@/lib/types';

const allowed = new Set([
  'doc',
  'paragraph',
  'text',
  'hardBreak',
  'bulletList',
  'orderedList',
  'listItem',
]);
const containerChildren: Record<string, string[]> = {
  doc: ['paragraph', 'bulletList', 'orderedList'],
  paragraph: ['text', 'hardBreak'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  listItem: ['paragraph', 'bulletList', 'orderedList'],
};

export function parseRichText(value: unknown): RichTextDoc {
  let nodes = 0;
  let characters = 0;
  const visit = (input: unknown, depth: number, parent?: string): void => {
    if (!input || typeof input !== 'object' || Array.isArray(input) || depth > 8 || ++nodes > 1000)
      throw new Error('Invalid message structure.');
    const node = input as Record<string, unknown>;
    const type = node.type;
    if (
      typeof type !== 'string' ||
      !allowed.has(type) ||
      (!parent && type !== 'doc') ||
      (parent && !containerChildren[parent]?.includes(type))
    )
      throw new Error('Unsupported message content.');
    if (
      Object.keys(node).some((key) => !['type', 'text', 'content', 'marks', 'attrs'].includes(key))
    )
      throw new Error('Unsupported message properties.');
    if (type === 'text') {
      if (
        typeof node.text !== 'string' ||
        !node.text.length ||
        node.content !== undefined ||
        node.attrs !== undefined
      )
        throw new Error('Invalid message text.');
      characters += [...node.text].length;
    } else if (node.text !== undefined) throw new Error('Invalid message text.');
    if (node.marks !== undefined) {
      if (type !== 'text' || !Array.isArray(node.marks) || node.marks.length > 2)
        throw new Error('Invalid formatting.');
      const seen = new Set<string>();
      for (const mark of node.marks) {
        if (
          !mark ||
          typeof mark !== 'object' ||
          Object.keys(mark).length !== 1 ||
          !['bold', 'italic'].includes(mark.type) ||
          seen.has(mark.type)
        )
          throw new Error('Unsupported formatting.');
        seen.add(mark.type);
      }
    }
    if (node.attrs !== undefined) {
      if (
        type !== 'orderedList' ||
        !node.attrs ||
        typeof node.attrs !== 'object' ||
        Array.isArray(node.attrs)
      )
        throw new Error('Unsupported message attributes.');
      const attrs = node.attrs as Record<string, unknown>;
      if (
        Object.keys(attrs).some((key) => !['start', 'type'].includes(key)) ||
        (attrs.type !== undefined && attrs.type !== null) ||
        (attrs.start !== undefined &&
          (!Number.isInteger(attrs.start) || Number(attrs.start) < 1 || Number(attrs.start) > 1000))
      )
        throw new Error('Invalid list attributes.');
    }
    if (['text', 'hardBreak'].includes(type)) {
      if (node.content !== undefined) throw new Error('Invalid message structure.');
    } else if (node.content !== undefined) {
      if (!Array.isArray(node.content)) throw new Error('Invalid message structure.');
      node.content.forEach((child) => visit(child, depth + 1, type));
    }
    if (
      type === 'listItem' &&
      (!Array.isArray(node.content) || node.content[0]?.type !== 'paragraph')
    )
      throw new Error('A list item must begin with a paragraph.');
  };
  visit(value, 0);
  if (
    !Array.isArray((value as RichTextDoc).content) ||
    characters > 10000 ||
    new TextEncoder().encode(JSON.stringify(value)).length > 65536
  )
    throw new Error('Message exceeds its limits.');
  return value as RichTextDoc;
}

export function messageText(doc: RichTextDoc): string {
  const walk = (node: { text?: string; content?: unknown[] }): string =>
    node.text ?? (node.content ?? []).map((child) => walk(child as typeof node)).join(' ');
  return walk(doc).trim();
}
