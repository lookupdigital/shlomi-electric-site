import { Fragment, type ReactNode } from "react";

// Server renderer for Tiptap JSON. Only an allowlist of nodes and marks is rendered, as React elements —
// stored content is never injected as HTML.

export type RichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: RichTextNode[];
};

export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#")) return href;
  return null;
}

export function safeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const src = value.trim();
  if (/^https:\/\//i.test(src)) return src;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return null;
}

function renderText(node: RichTextNode, key: number): ReactNode {
  let output: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") output = <strong>{output}</strong>;
    else if (mark.type === "italic") output = <em>{output}</em>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      if (!href) continue;
      const external = /^https?:/i.test(href);
      output = (
        <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {output}
        </a>
      );
    }
  }
  return <Fragment key={key}>{output}</Fragment>;
}

function renderNodes(nodes: RichTextNode[] | undefined, depth: number): ReactNode[] {
  if (!Array.isArray(nodes) || depth > 20) return [];
  return nodes.map((node, index) => renderNode(node, index, depth));
}

function renderNode(node: RichTextNode, key: number, depth: number): ReactNode {
  const children = renderNodes(node.content, depth + 1);
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "heading":
      return node.attrs?.level === 3 ? <h3 key={key}>{children}</h3> : <h2 key={key}>{children}</h2>;
    case "bulletList":
      return <ul key={key}>{children}</ul>;
    case "orderedList":
      return <ol key={key}>{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key}>{children}</blockquote>;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const src = safeImageSrc(node.attrs?.src);
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      // Content images have unknown dimensions, so a plain lazy <img> is used instead of next/image.
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={key} src={src} alt={alt} loading="lazy" decoding="async" />;
    }
    default:
      return children.length ? <Fragment key={key}>{children}</Fragment> : null;
  }
}

export function RichText({ doc, className = "" }: { doc: unknown; className?: string }) {
  const content = doc && typeof doc === "object" ? (doc as RichTextNode).content : undefined;
  return <div className={`rich-text ${className}`}>{renderNodes(content, 0)}</div>;
}
