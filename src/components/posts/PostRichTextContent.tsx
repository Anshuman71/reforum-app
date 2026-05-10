'use client';

import { EditorContent, useEditor, type Content } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';

interface PostRichTextContentProps {
  contentJson: unknown;
}

export function PostRichTextContent({
  contentJson,
}: PostRichTextContentProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'text-sm leading-6 focus:outline-none',
      },
    },
    extensions: [StarterKit, Image],
    content: contentJson as Content,
  });

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} className="tiptap" />;
}
