'use client';

interface PostRichTextContentProps {
  contentHtml: string;
}

export function PostRichTextContent({ contentHtml }: PostRichTextContentProps) {
  return (
    <div
      className="prose prose-sm max-w-none text-sm leading-6"
      dangerouslySetInnerHTML={{ __html: contentHtml }}
    />
  );
}
