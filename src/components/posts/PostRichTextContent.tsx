'use client';

import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';

interface PostRichTextContentProps {
  contentHtml: string;
}

export function PostRichTextContent({ contentHtml }: PostRichTextContentProps) {
  return (
    <div
      className="tiptap text-sm leading-6"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
