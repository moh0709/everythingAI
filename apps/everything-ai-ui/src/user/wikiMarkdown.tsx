import React, { ReactNode } from 'react';
import type { WikiPage } from './types';

export function findWikiPageByLabel(pages: WikiPage[], label: string) {
  const normalized = label.trim().toLowerCase();
  return pages.find((page) => page.title.toLowerCase() === normalized)
    || pages.find((page) => page.slug.toLowerCase() === normalized.replace(/\s+/g, '-'))
    || pages.find((page) => page.title.toLowerCase().includes(normalized));
}

export function normalizeCitationRef(part: string): string {
  return part.slice(1, -1).split(':')[0];
}

export function renderInlineMarkdown(text: string, pages: WikiPage[] = [], onWikiLink?: (pageId: string) => void, onSourceRefClick?: (ref: string) => void): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\[.+?\]\]|\[S\d+(?::C\d+)?\])/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const label = part.slice(2, -2);
      const page = findWikiPageByLabel(pages, label);
      if (page && onWikiLink) {
        return <button key={index} type="button" className="wiki-inline-link" onClick={() => onWikiLink(page.id)}>{label}</button>;
      }
      return <span key={index} className="wiki-link">{label}</span>;
    }
    if (/^\[S\d+(?::C\d+)?\]$/.test(part)) {
      if (onSourceRefClick) {
        return <button key={index} type="button" className="wiki-source-ref wiki-source-ref-btn" onClick={() => onSourceRefClick(normalizeCitationRef(part))}>{part}</button>;
      }
      return <sup key={index} className="wiki-source-ref">{part}</sup>;
    }
    return part;
  });
}

function parseTable(lines: string[], startIndex: number) {
  const tableLines: string[] = [];
  let index = startIndex;
  while (index < lines.length && lines[index].trim().startsWith('|')) {
    tableLines.push(lines[index]);
    index += 1;
  }
  const rows = tableLines
    .filter((line) => !/^\|\s*-+/.test(line.trim()))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  const [headers = [], ...body] = rows;
  return { headers, body, nextIndex: index };
}

export function MarkdownArticle({ markdown, pages, onWikiLink, onSourceRefClick }: { markdown: string; pages?: WikiPage[]; onWikiLink?: (pageId: string) => void; onSourceRefClick?: (ref: string) => void }) {
  const lines = markdown.split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('|')) {
      const table = parseTable(lines, index);
      nodes.push(<table key={`table-${index}`} className="wiki-table">
        <thead><tr>{table.headers.map((header, headerIndex) => <th key={headerIndex}>{renderInlineMarkdown(header, pages, onWikiLink, onSourceRefClick)}</th>)}</tr></thead>
        <tbody>{table.body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInlineMarkdown(cell, pages, onWikiLink, onSourceRefClick)}</td>)}</tr>)}</tbody>
      </table>);
      index = table.nextIndex;
      continue;
    }

    if (line.startsWith('# ')) nodes.push(<h1 key={index}>{renderInlineMarkdown(line.slice(2), pages, onWikiLink, onSourceRefClick)}</h1>);
    else if (line.startsWith('## ')) nodes.push(<h2 key={index}>{renderInlineMarkdown(line.slice(3), pages, onWikiLink, onSourceRefClick)}</h2>);
    else if (line.startsWith('### ')) nodes.push(<h3 key={index}>{renderInlineMarkdown(line.slice(4), pages, onWikiLink, onSourceRefClick)}</h3>);
    else if (line.startsWith('- ')) nodes.push(<li key={index}>{renderInlineMarkdown(line.slice(2), pages, onWikiLink, onSourceRefClick)}</li>);
    else if (line.startsWith('> ')) nodes.push(<blockquote key={index}>{renderInlineMarkdown(line.slice(2), pages, onWikiLink, onSourceRefClick)}</blockquote>);
    else if (!line.trim()) nodes.push(<br key={index} />);
    else nodes.push(<p key={index}>{renderInlineMarkdown(line, pages, onWikiLink, onSourceRefClick)}</p>);
    index += 1;
  }

  return <article className="wiki-article">{nodes}</article>;
}
