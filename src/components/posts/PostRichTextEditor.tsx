'use client';

import { useEffect } from 'react';
import { EditorContent, EditorContext, useEditor, type Content } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import { handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';

export interface PostEditorValue {
  text: string;
  html: string;
  json: unknown;
}

interface PostRichTextEditorProps {
  value?: unknown;
  onChange: (value: PostEditorValue) => void;
  ariaLabel?: string;
  helperText?: string;
}

export function PostRichTextEditor({
  value,
  onChange,
  ariaLabel = 'Rich text editor',
  helperText = 'Write your post and add inline images.',
}: PostRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[220px] px-4 py-3 text-sm focus:outline-none',
        'aria-label': ariaLabel,
      },
    },
    extensions: [
      StarterKit,
      Image,
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: error => console.error('Upload failed:', error),
      }),
    ],
    content: (value ?? {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }) as Content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange({
        text: currentEditor.getText(),
        html: currentEditor.getHTML(),
        json: currentEditor.getJSON(),
      });
    },
  });

  useEffect(() => {
    if (!editor) return;

    onChange({
      text: editor.getText(),
      html: editor.getHTML(),
      json: editor.getJSON(),
    });
  }, [editor, onChange]);

  useEffect(() => {
    if (!editor || !value) return;

    const currentValue = JSON.stringify(editor.getJSON());
    const nextValue = JSON.stringify(value);

    if (currentValue !== nextValue) {
      editor.commands.setContent(value as Content);
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <EditorContext.Provider value={{ editor }}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {helperText}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor?.chain().focus().setImageUploadNode().run()}
            disabled={!editor}
          >
            Add image
          </Button>
        </div>

        <EditorContent editor={editor} className="tiptap" />
      </EditorContext.Provider>
    </div>
  );
}
