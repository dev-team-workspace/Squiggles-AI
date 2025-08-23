'use client'

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

export default function TiptapEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    autofocus: false,
    editable: true,
    injectCSS: true,
    onUpdate: ({ editor }) => {
      console.log('[TiptapEditor] Content updated');
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      console.log('[TiptapEditor] Setting initial content');
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return <p>Loading editor...</p>;
  }

  return (
    <div className="border rounded-lg p-2 min-h-[300px]">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="min-h-[250px] p-2" />
    </div>
  );
}

function MenuBar({ editor }: { editor: any }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 mb-2">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded ${editor.isActive('bold') ? 'bg-white-200 text-black' : ''}`}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded ${editor.isActive('italic') ? 'bg-white-200 text-black' : ''}`}
      >
        Italic
      </button>
    </div>
  );
}

