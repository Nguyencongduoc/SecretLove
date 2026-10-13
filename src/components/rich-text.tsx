import type { RichTextDoc, RichTextNode } from '@/lib/types';
import { parseRichText } from '@/lib/validation/rich-text';
function node(item: RichTextNode, key: number): React.ReactNode {
  const content = item.content?.map(node);
  switch (item.type) {
    case 'text':
      return (
        <span key={key}>
          {(item.marks ?? []).reduce<React.ReactNode>(
            (text, mark) => (mark.type === 'bold' ? <strong>{text}</strong> : <em>{text}</em>),
            item.text,
          )}
        </span>
      );
    case 'paragraph':
      return <p key={key}>{content ?? <br />}</p>;
    case 'hardBreak':
      return <br key={key} />;
    case 'bulletList':
      return <ul key={key}>{content}</ul>;
    case 'orderedList':
      return (
        <ol key={key} start={item.attrs?.start}>
          {content}
        </ol>
      );
    case 'listItem':
      return <li key={key}>{content}</li>;
  }
}
export function RichText({ document }: { document: RichTextDoc }) {
  const safe = parseRichText(document);
  return <div className="letter-body">{safe.content.map(node)}</div>;
}
