'use client';

import React, { useMemo } from 'react';

// Renders basic markdown: paragraphs, headings, lists, emphasis, code, auto-links and links.
// React-escaped; only http/https/mailto hrefs.
const INLINE_RE =
  /(\[[^\]]*\]\([^)\s]*\))|(https?:\/\/[^\s<>"']+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(`[^`\n]+`)|(~~[^~\n]+~~)|(\*\*[^\s*](?:[^*\n]*[^\s*])?\*\*)|(\*[^\s*](?:[^*\n]*[^\s*])?\*)/;

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

function safeHref(href: string): string | null {
  try {
    const parsed = new URL(href);
    if (SAFE_PROTOCOLS.includes(parsed.protocol)) return href;
  } catch {
    /* malformed or relative — disallow */
  }
  return null;
}

function linkClass(): string {
  return 'text-primary hover:underline break-words';
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokenRe = new RegExp(INLINE_RE.source, 'g');
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [full, markdown, url, email, code, strike, bold, italic] = match;
    if (markdown) {
      const inner = markdown.slice(1, -1);
      const close = inner.lastIndexOf('](');
      const label = inner.slice(0, close);
      const href = safeHref(inner.slice(close + 2));
      parts.push(
        href ? (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={linkClass()}
          >
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else if (url) {
      const trimmed = url.replace(/[.,;:!)]+$/, '');
      const href = safeHref(trimmed);
      parts.push(
        href ? (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={linkClass()}
          >
            {trimmed}
          </a>
        ) : (
          trimmed
        ),
      );
    } else if (email) {
      parts.push(
        <a key={key++} href={`mailto:${email}`} className={linkClass()}>
          {email}
        </a>,
      );
    } else if (code) {
      parts.push(
        <code
          key={key++}
          className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.9em]"
        >
          {code.slice(1, -1)}
        </code>,
      );
    } else if (strike) {
      parts.push(<del key={key++}>{renderInline(strike.slice(2, -2))}</del>);
    } else if (bold) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {renderInline(bold.slice(2, -2))}
        </strong>,
      );
    } else if (italic) {
      parts.push(<em key={key++}>{renderInline(italic.slice(1, -1))}</em>);
    }
    last = match.index + full.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function parseBlocks(text: string): React.ReactNode[] {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const headingClass = (level: number) =>
    `${level === 1 ? 'text-[1.5em]' : level === 2 ? 'text-[1.25em]' : 'text-[1.1em]'} font-semibold leading-snug text-gray-900 dark:text-white mt-3 mb-1.5`;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === '') {
      // Preserve blank lines as vertical space instead of stripping them.
      blocks.push(<div key={key++} className="h-4" aria-hidden="true" />);
      i++;
      continue;
    }
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      if (level === 1)
        blocks.push(
          <h4 key={key++} className={headingClass(level)}>
            {renderInline(content)}
          </h4>,
        );
      else if (level === 2)
        blocks.push(
          <h5 key={key++} className={headingClass(level)}>
            {renderInline(content)}
          </h5>,
        );
      else
        blocks.push(
          <h6 key={key++} className={headingClass(level)}>
            {renderInline(content)}
          </h6>,
        );
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(
          <li key={key++} className="list-disc list-inside marker:text-red-500">
            {renderInline(lines[i].trim().replace(/^[-*]\s+/, ''))}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ul key={key++} className="space-y-0.5">
          {items}
        </ul>,
      );
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(
          <li
            key={key++}
            className="list-decimal list-inside marker:text-red-500"
          >
            {renderInline(lines[i].trim().replace(/^\d+[.)]\s+/, ''))}
          </li>,
        );
        i++;
      }
      blocks.push(
        <ol key={key++} className="space-y-0.5">
          {items}
        </ol>,
      );
      continue;
    }
    const paraLines: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        t === '' ||
        /^(#{1,3})\s+/.test(t) ||
        /^[-*]\s+/.test(t) ||
        /^\d+[.)]\s+/.test(t)
      )
        break;
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="whitespace-pre-line">
        {renderInline(paraLines.join('\n'))}
      </p>,
    );
  }
  return blocks;
}

export interface FormattedTextProps {
  text: string;
  className?: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className }) => {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return <div className={className}>{blocks}</div>;
};

export default FormattedText;
