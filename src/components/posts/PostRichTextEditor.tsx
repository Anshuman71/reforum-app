"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bold, Code, ImagePlus, Italic } from "lucide-react";
import {
  createEditor,
  Editor,
  Element as SlateElement,
  Node,
  Transforms,
  type Descendant,
} from "slate";
import { withHistory } from "slate-history";
import {
  Editable,
  ReactEditor,
  Slate,
  useSlate,
  withReact,
  type RenderElementProps,
  type RenderLeafProps,
} from "slate-react";
import { Button } from "@/components/ui/button";
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/upload-utils";

type ParagraphElement = {
  type: "paragraph";
  children: CustomText[];
};

type ImageElement = {
  type: "image";
  url: string;
  alt?: string;
  children: CustomText[];
};

type CustomElement = ParagraphElement | ImageElement;

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
};

declare module "slate" {
  interface CustomTypes {
    Editor: ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

export interface PostEditorValue {
  text: string;
  html: string;
  json: Descendant[];
}

interface PostRichTextEditorProps {
  value?: unknown;
  onChange: (value: PostEditorValue) => void;
  ariaLabel?: string;
  helperText?: string;
  resetKey?: string | number;
}

const EMPTY_SLATE_VALUE: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

export function createEmptyPostEditorValue(): PostEditorValue {
  const json = cloneSlateValue(EMPTY_SLATE_VALUE);

  return {
    text: "",
    html: serializeSlateToHtml(json),
    json,
  };
}

function cloneSlateValue(value: Descendant[]) {
  return JSON.parse(JSON.stringify(value)) as Descendant[];
}

function isSlateValue(value: unknown): value is Descendant[] {
  return (
    Array.isArray(value) &&
    value.every((node) => SlateElement.isElement(node) || "text" in node)
  );
}

function normalizeSlateValue(value: unknown): Descendant[] {
  if (isSlateValue(value)) {
    return cloneSlateValue(value);
  }

  return cloneSlateValue(EMPTY_SLATE_VALUE);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serializeText(node: CustomText) {
  let html = escapeHtml(node.text);

  if ("code" in node && node.code) {
    html = `<code>${html}</code>`;
  }
  if ("italic" in node && node.italic) {
    html = `<em>${html}</em>`;
  }
  if ("bold" in node && node.bold) {
    html = `<strong>${html}</strong>`;
  }

  return html;
}

function serializeNodeToHtml(node: Descendant): string {
  if ("text" in node) {
    return serializeText(node);
  }

  const children = node.children.map(serializeNodeToHtml).join("");

  switch (node.type) {
    case "image":
      return `<p><img src="${escapeHtml(node.url)}" alt="${escapeHtml(node.alt ?? "")}" /></p>`;
    case "paragraph":
    default:
      return `<p>${children || "<br />"}</p>`;
  }
}

export function serializeSlateToHtml(value: Descendant[]) {
  return value.map(serializeNodeToHtml).join("");
}

function getPostEditorValue(value: Descendant[]): PostEditorValue {
  return {
    text: value.map((node) => Node.string(node)).join("\n"),
    html: serializeSlateToHtml(value),
    json: cloneSlateValue(value),
  };
}

const withImages = <T extends Editor>(editor: T) => {
  const { isVoid } = editor;

  editor.isVoid = (element) =>
    element.type === "image" ? true : isVoid(element);

  return editor;
};

function isMarkActive(editor: Editor, mark: keyof Omit<CustomText, "text">) {
  try {
    const marks = Editor.marks(editor) as Omit<CustomText, "text"> | null;
    return marks ? marks[mark] === true : false;
  } catch {
    return false;
  }
}

function toggleMark(editor: Editor, mark: keyof Omit<CustomText, "text">) {
  if (isMarkActive(editor, mark)) {
    Editor.removeMark(editor, mark);
    return;
  }

  Editor.addMark(editor, mark, true);
}

function FormatButton(props: {
  mark: keyof Omit<CustomText, "text">;
  label: string;
  children: React.ReactNode;
}) {
  const editor = useSlate();
  const active = isMarkActive(editor, props.mark);

  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8"
      aria-label={props.label}
      title={props.label}
      onMouseDown={(event) => {
        event.preventDefault();
        toggleMark(editor, props.mark);
      }}
    >
      {props.children}
    </Button>
  );
}

function insertImage(editor: Editor, url: string, alt?: string) {
  const image: ImageElement = {
    type: "image",
    url,
    alt,
    children: [{ text: "" }],
  };

  Transforms.insertNodes(editor, image);
  Transforms.insertNodes(editor, {
    type: "paragraph",
    children: [{ text: "" }],
  });
}

export function PostRichTextEditor({
  value,
  onChange,
  ariaLabel = "Rich text editor",
  helperText = "Write your post and add inline images.",
  resetKey,
}: PostRichTextEditorProps) {
  const editor = useMemo(
    () => withImages(withHistory(withReact(createEditor()))),
    [],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialValueRef = useRef<Descendant[]>(normalizeSlateValue(value));
  const [editorKey, setEditorKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastExternalValue = useRef(JSON.stringify(value ?? null));
  const lastEmittedValue = useRef(JSON.stringify(initialValueRef.current));
  const didEmitInitialValue = useRef(false);

  const emitChange = useCallback(
    (nextValue: Descendant[]) => {
      onChange(getPostEditorValue(nextValue));
    },
    [onChange],
  );

  useEffect(() => {
    if (didEmitInitialValue.current) return;
    didEmitInitialValue.current = true;
    emitChange(initialValueRef.current);
  }, [emitChange]);

  useEffect(() => {
    const serializedValue = JSON.stringify(value ?? null);
    if (
      serializedValue === lastExternalValue.current ||
      serializedValue === lastEmittedValue.current
    ) {
      lastExternalValue.current = serializedValue;
      return;
    }

    const nextValue = normalizeSlateValue(value);
    const serializedNextValue = JSON.stringify(nextValue);
    initialValueRef.current = nextValue;
    lastExternalValue.current = serializedValue;
    lastEmittedValue.current = serializedNextValue;
    setEditorKey((key) => key + 1);
    emitChange(nextValue);
  }, [emitChange, value]);

  useEffect(() => {
    if (resetKey === undefined) return;

    const nextValue = normalizeSlateValue(value);
    const serializedNextValue = JSON.stringify(nextValue);
    initialValueRef.current = nextValue;
    lastExternalValue.current = JSON.stringify(value ?? null);
    lastEmittedValue.current = serializedNextValue;
    setEditorKey((key) => key + 1);
    emitChange(nextValue);
  }, [emitChange, resetKey, value]);

  const renderElement = useCallback((props: RenderElementProps) => {
    const { attributes, children, element } = props;

    if (element.type === "image") {
      return (
        <div {...attributes} className="my-3">
          <div contentEditable={false}>
            <img
              src={element.url}
              alt={element.alt ?? ""}
              className="max-h-80 max-w-full rounded-md border object-contain"
            />
          </div>
          {children}
        </div>
      );
    }

    return <p {...attributes}>{children}</p>;
  }, []);

  const renderLeaf = useCallback((props: RenderLeafProps) => {
    let children = props.children;

    if (props.leaf.code) {
      children = (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {children}
        </code>
      );
    }
    if (props.leaf.italic) {
      children = <em>{children}</em>;
    }
    if (props.leaf.bold) {
      children = <strong>{children}</strong>;
    }

    return <span {...props.attributes}>{children}</span>;
  }, []);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const url = await handleImageUpload(file);
      insertImage(editor, url, file.name);
      ReactEditor.focus(editor);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <Slate
        key={editorKey}
        editor={editor}
        initialValue={initialValueRef.current}
        onChange={(nextValue) => {
          const isAstChange = editor.operations.some(
            (operation) => operation.type !== "set_selection",
          );
          if (!isAstChange) return;

          const normalizedValue = nextValue as Descendant[];
          lastEmittedValue.current = JSON.stringify(normalizedValue);
          emitChange(normalizedValue);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-xs text-muted-foreground">{helperText}</p>
          <div className="flex items-center gap-1">
            <FormatButton mark="bold" label="Bold">
              <Bold className="h-4 w-4" />
            </FormatButton>
            <FormatButton mark="italic" label="Italic">
              <Italic className="h-4 w-4" />
            </FormatButton>
            <FormatButton mark="code" label="Code">
              <Code className="h-4 w-4" />
            </FormatButton>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={(event) => {
                event.preventDefault();
                fileInputRef.current?.click();
              }}
              disabled={isUploading}
            >
              <ImagePlus className="mr-2 h-4 w-4" />
              {isUploading ? "Uploading" : "Image"}
            </Button>
          </div>
        </div>

        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          className="min-h-[220px] px-4 py-3 text-sm leading-6 focus:outline-none"
          aria-label={ariaLabel}
          placeholder="Write something thoughtful..."
          spellCheck
          onKeyDown={(event) => {
            if (!event.metaKey && !event.ctrlKey) return;

            if (event.key === "b") {
              event.preventDefault();
              toggleMark(editor, "bold");
            }
            if (event.key === "i") {
              event.preventDefault();
              toggleMark(editor, "italic");
            }
            if (event.key === "`") {
              event.preventDefault();
              toggleMark(editor, "code");
            }
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        {uploadError ? (
          <p className="border-t px-3 py-2 text-xs text-destructive">
            {uploadError}
          </p>
        ) : null}
      </Slate>
    </div>
  );
}
