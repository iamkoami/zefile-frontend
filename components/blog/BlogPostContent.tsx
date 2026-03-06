"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "a", "strong", "em", "u", "s",
    "blockquote", "pre", "code", "img", "br", "hr",
    "span", "div", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td", "sub", "sup",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "class", "target", "rel", "width", "height",
  ],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

export default function BlogPostContent({ html }: { html: string }) {
  const sanitizedHtml = useMemo(() => {
    if (typeof window === "undefined") return html;
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
  }, [html]);

  return (
    <article
      className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-[#171717] prose-img:rounded-lg"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
