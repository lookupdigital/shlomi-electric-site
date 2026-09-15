"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ACCEPTED_IMAGE_TYPES, uploadImage } from "@/lookup/media";

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };
const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

function ToolbarButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 min-w-9 rounded-md px-2 font-heading text-sm font-semibold transition-colors ${
        active ? "bg-navy text-white" : "bg-white text-ink hover:bg-mint"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage, uploading }: { editor: Editor; onImage: () => void; uploading: boolean }) {
  const chain = () => editor.chain().focus();

  function setLink() {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const input = window.prompt("כתובת הקישור (https://…, /עמוד, mailto:, tel:). השאירו ריק כדי להסיר", previous);
    if (input === null) return;
    const href = input.trim();
    if (href === "") {
      chain().extendMarkRange("link").unsetLink().run();
    } else if (!SAFE_LINK.test(href)) {
      window.alert("כתובת לא נתמכת. השתמשו ב-https://, /נתיב, mailto: או tel:");
    } else {
      chain().extendMarkRange("link").setLink({ href }).run();
    }
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-line bg-offwhite p-2" role="toolbar" aria-label="עיצוב טקסט">
      <ToolbarButton label="פסקה" active={editor.isActive("paragraph")} onClick={() => chain().setParagraph().run()}>¶</ToolbarButton>
      <ToolbarButton label="כותרת H2" active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
      <ToolbarButton label="כותרת H3" active={editor.isActive("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
      <ToolbarButton label="מודגש" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}><b>B</b></ToolbarButton>
      <ToolbarButton label="נטוי" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}><i>I</i></ToolbarButton>
      <ToolbarButton label="רשימת תבליטים" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>• רשימה</ToolbarButton>
      <ToolbarButton label="רשימה ממוספרת" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>1. רשימה</ToolbarButton>
      <ToolbarButton label="ציטוט" active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}>”ציטוט</ToolbarButton>
      <ToolbarButton label="קישור" active={editor.isActive("link")} onClick={setLink}>קישור</ToolbarButton>
      <ToolbarButton label="הוספת תמונה" onClick={onImage}>{uploading ? "מעלה…" : "תמונה"}</ToolbarButton>
      <ToolbarButton label="ביטול" onClick={() => chain().undo().run()}>↶</ToolbarButton>
      <ToolbarButton label="ביצוע מחדש" onClick={() => chain().redo().run()}>↷</ToolbarButton>
    </div>
  );
}

/** Tiptap editor limited to the formats the public renderer supports. Submits JSON via a hidden input. */
export default function RichTextEditor({ name, initialContent }: { name: string; initialContent: unknown }) {
  const initial = initialContent && typeof initialContent === "object" ? (initialContent as JSONContent) : EMPTY_DOC;
  const [json, setJson] = useState(() => JSON.stringify(initial));
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: (url) => SAFE_LINK.test(url) },
      }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: initial,
    editorProps: { attributes: { class: "rich-text min-h-[320px] px-5 py-4 focus:outline-none", dir: "rtl" } },
    onUpdate: ({ editor: current }) => setJson(JSON.stringify(current.getJSON())),
  });

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    setUploading(true);
    try {
      const src = await uploadImage(file);
      const alt = window.prompt("טקסט חלופי לתמונה (alt) — תיאור קצר של מה שרואים בה") ?? "";
      editor.chain().focus().setImage({ src, alt: alt.trim() }).run();
    } catch (error) {
      window.alert((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {editor ? (
        <Toolbar editor={editor} onImage={() => fileInput.current?.click()} uploading={uploading} />
      ) : (
        <div className="h-[53px] border-b border-line bg-offwhite" />
      )}
      <EditorContent editor={editor} />
      <input ref={fileInput} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="hidden" onChange={onFile} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
