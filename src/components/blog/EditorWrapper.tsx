'use client';

import TiptapEditor from "@/components/TiptapEditor";

export default function EditorWrapper({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <TiptapEditor content={initialContent} onChange={onChange} />
    </div>
  );
}
