'use client';
import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { RichTextDoc } from '@/lib/types';
export function MessageEditor({
  initial,
  disabled,
  onChange,
}: {
  initial: RichTextDoc;
  disabled: boolean;
  onChange: (value: RichTextDoc) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
        dropcursor: false,
        gapcursor: false,
      }),
    ],
    content: initial,
    editorProps: {
      attributes: { role: 'textbox', 'aria-label': 'Letter message', 'aria-multiline': 'true' },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichTextDoc),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  const tools = [
    {
      label: 'Bold',
      active: editor?.isActive('bold'),
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      active: editor?.isActive('italic'),
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Bullet list',
      active: editor?.isActive('bulletList'),
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      active: editor?.isActive('orderedList'),
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-rose-100">
      <div
        className="flex flex-wrap gap-2 border-b border-rose-100 bg-rose-50/50 p-3"
        role="toolbar"
        aria-label="Message formatting"
      >
        {tools.map((tool) => (
          <button
            type="button"
            key={tool.label}
            disabled={disabled || !editor}
            onClick={tool.run}
            aria-pressed={tool.active ?? false}
            className={`rounded-md px-3 py-2 text-sm ${tool.active ? 'bg-rose-700 text-white' : 'bg-white text-rose-950'}`}
          >
            {tool.label}
          </button>
        ))}
      </div>
      {!editor && (
        <p className="hint p-5" role="status">
          Loading editor…
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
