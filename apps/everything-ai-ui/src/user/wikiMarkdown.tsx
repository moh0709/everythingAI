import React, { ReactNode, useMemo, useState } from 'react';
import type { WikiPage } from './types';
import './wikiMarkdown.css';

const TABBED_SECTION_TITLES = new Set([
  'About This Document',
  'Extracted Entities',
  'Related Pages',
  'Sources',
  'Source Locations',
  'Evidence Snippets',
]);

type MarkdownSection = {
  title: string;
  lines: string[];
};

type MarkdownRenderOptions = {
  pages?: WikiPage[];
  onWikiLink?: (pageId: string) => void;
  onSourceRefClick?: (ref: string) => void;
  searchTerm?: string;
  activeCitationRef?: string | null;
};

type MarkdownImage = {
  alt: string;
  url: string;
  title?: string;
};

export function findWikiPageByLabel(pages: WikiPage[], label: string) {
  const normalized = label.trim().toLowerCase();
  return pages.find((page) => page.title.toLowerCase() === normalized)
    || pages.find((page) => page.slug.toLowerCase() === normalized.replace(/\s+/g, '-'))
    || pages.find((page) => page.title.toLowerCase().includes(normalized));
}

export function normalizeCitationRef(part: string): string {
  return part.replace(/^\[/, '').replace(/\]$/, '');
}

function baseCitationRef(ref?: string | null) {
  return normalizeCitationRef(ref || '').split(':')[0];
}

function isActiveCitationRef(ref: string, activeCitationRef?: string | null) {
  const normalizedRef = normalizeCitationRef(ref);
  const normalizedActiveRef = normalizeCitationRef(activeCitationRef || '');
  if (!normalizedRef || !normalizedActiveRef) return false;
  return normalizedRef === normalizedActiveRef || baseCitationRef(normalizedRef) === baseCitationRef(normalizedActiveRef);
}

function escapeRegExp(value: string) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function highlightText(text: string, searchTerm?: string): ReactNode[] | string {
  const term = searchTerm?.trim();
  if (!term) return text;

  const regex = new RegExp(`(${escapeRegExp(term)})`, 'ig');
  const parts = text.split(regex).filter(Boolean);
  if (parts.length <= 1) return text;

  return parts.map((part, index) => (
    part.toLowerCase() === term.toLowerCase()
      ? <mark key={index} className="wiki-search-highlight">{part}</mark>
      : part
  ));
}

function parseMarkdownImage(line: string): MarkdownImage | null {
  const match = line.trim().match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]+)")?\)$/);
  if (!match) return null;
  return {
    alt: match[1] || 'Wiki image',
    url: match[2],
    title: match[3],
  };
}

function isSafeImageUrl(url: string) {
  return /^(https?:\/\/|data:image\/|blob:)/i.test(url);
}

function renderMarkdownImage(image: MarkdownImage, key: React.Key) {
  if (!isSafeImageUrl(image.url)) {
    return (
      <figure key={key} className="wiki-image-card blocked">
        <div className="wiki-image-placeholder">Image reference</div>
        <figcaption>{image.alt} — source preview required for local file paths.</figcaption>
      </figure>
    );
  }

  return (
    <figure key={key} className="wiki-image-card">
      <img src={image.url} alt={image.alt} title={image.title} loading="lazy" />
      {(image.title || image.alt) ? <figcaption>{image.title || image.alt}</figcaption> : null}
    </figure>
  );
}

export function countMarkdownMatches(markdown: string, searchTerm: string) {
  const term = searchTerm.trim();
  if (!term) return 0;
  const regex = new RegExp(escapeRegExp(term), 'ig');
  return markdown.match(regex)?.length || 0;
}

export function renderInlineMarkdown(text: string, options: MarkdownRenderOptions = {}): ReactNode[] {
  const { pages = [], onWikiLink, onSourceRefClick, searchTerm, activeCitationRef } = options;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\[.+?\]\]|\[S\d+(?::C\d+)?\])/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{highlightText(part.slice(2, -2), searchTerm)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{highlightText(part.slice(1, -1), searchTerm)}</em>;
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const label = part.slice(2, -2);
      const page = findWikiPageByLabel(pages, label);
      if (page && onWikiLink) {
        return <button key={index} type="button" className="wiki-inline-link" onClick={() => onWikiLink(page.id)}>{highlightText(label, searchTerm)}</button>;
      }
      return <span key={index} className="wiki-link">{highlightText(label, searchTerm)}</span>;
    }
    if (/^\[S\d+(?::C\d+)?\]$/.test(part)) {
      const activeClassName = isActiveCitationRef(part, activeCitationRef) ? ' active' : '';
      if (onSourceRefClick) {
        return <button key={index} type="button" className={`wiki-source-ref wiki-source-ref-btn${activeClassName}`} aria-current={activeClassName ? 'location' : undefined} onClick={() => onSourceRefClick(normalizeCitationRef(part))}>{part}</button>;
      }
      return <sup key={index} className={`wiki-source-ref${activeClassName}`}>{part}</sup>;
    }
    return highlightText(part, searchTerm);
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

function sectionTitleFromLine(line: string) {
  if (!line.startsWith('## ')) return null;
  return line.slice(3).trim();
}

function splitArticleSections(lines: string[]) {
  const visibleLines: string[] = [];
  const tabbedSections: MarkdownSection[] = [];
  let index = 0;

  while (index < lines.length) {
    const title = sectionTitleFromLine(lines[index]);

    if (!title || !TABBED_SECTION_TITLES.has(title)) {
      visibleLines.push(lines[index]);
      index += 1;
      continue;
    }

    const sectionLines: string[] = [];
    index += 1;

    while (index < lines.length) {
      const nextTitle = sectionTitleFromLine(lines[index]);
      if (nextTitle && TABBED_SECTION_TITLES.has(nextTitle)) break;

      sectionLines.push(lines[index]);
      index += 1;
    }

    tabbedSections.push({ title, lines: sectionLines });
  }

  return { visibleLines, tabbedSections };
}

function renderMarkdownLines(lines: string[], options: MarkdownRenderOptions = {}, skipFirstTitle = false) {
  const nodes: ReactNode[] = [];
  let index = 0;
  let skippedFirstTitle = false;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (skipFirstTitle && !skippedFirstTitle && line.startsWith('# ')) {
      skippedFirstTitle = true;
      index += 1;
      continue;
    }

    const image = parseMarkdownImage(line);
    if (image) {
      nodes.push(renderMarkdownImage(image, `image-${index}`));
      index += 1;
      continue;
    }

    if (trimmed.startsWith('|')) {
      const table = parseTable(lines, index);
      nodes.push(<div key={`table-wrap-${index}`} className="wiki-table-wrap">
        <table className="wiki-table">
          <thead><tr>{table.headers.map((header, headerIndex) => <th key={headerIndex}>{renderInlineMarkdown(header, options)}</th>)}</tr></thead>
          <tbody>{table.body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInlineMarkdown(cell, options)}</td>)}</tr>)}</tbody>
        </table>
      </div>);
      index = table.nextIndex;
      continue;
    }

    if (line.startsWith('# ')) nodes.push(<h1 key={index}>{renderInlineMarkdown(line.slice(2), options)}</h1>);
    else if (line.startsWith('## ')) nodes.push(<h2 key={index}>{renderInlineMarkdown(line.slice(3), options)}</h2>);
    else if (line.startsWith('### ')) nodes.push(<h3 key={index}>{renderInlineMarkdown(line.slice(4), options)}</h3>);
    else if (line.startsWith('- ')) nodes.push(<li key={index}>{renderInlineMarkdown(line.slice(2), options)}</li>);
    else if (line.startsWith('> ')) nodes.push(<blockquote key={index}>{renderInlineMarkdown(line.slice(2), options)}</blockquote>);
    else if (!line.trim()) nodes.push(<br key={index} />);
    else nodes.push(<p key={index}>{renderInlineMarkdown(line, options)}</p>);
    index += 1;
  }

  return nodes;
}

function WikiTabbedSections({ sections, pages, onWikiLink, onSourceRefClick, searchTerm, activeCitationRef }: { sections: MarkdownSection[]; pages?: WikiPage[]; onWikiLink?: (pageId: string) => void; onSourceRefClick?: (ref: string) => void; searchTerm?: string; activeCitationRef?: string | null }) {
  const [activeTitle, setActiveTitle] = useState(sections[0]?.title || '');
  const activeSection = sections.find((section) => section.title === activeTitle) || sections[0];

  if (!sections.length || !activeSection) return null;

  return (
    <details className="wiki-tabbed-sections">
      <summary className="wiki-tabbed-summary">
        <span>Document Details</span>
        <small>{sections.length} metadata section(s): sources, entities, relations, and evidence</small>
      </summary>
      <div className="wiki-tabbed-header">
        <h2>Document Details</h2>
        <p>Metadata, related pages, source locations, and evidence are grouped here so the document content stays readable.</p>
      </div>
      <div className="wiki-tab-list" role="tablist" aria-label="Wiki document detail sections">
        {sections.map((section) => (
          <button
            key={section.title}
            type="button"
            role="tab"
            aria-selected={section.title === activeSection.title}
            className={section.title === activeSection.title ? 'wiki-tab active' : 'wiki-tab'}
            onClick={() => setActiveTitle(section.title)}
          >
            {section.title}
          </button>
        ))}
      </div>
      <div className="wiki-tab-panel" role="tabpanel">
        {renderMarkdownLines(activeSection.lines, { pages, onWikiLink, onSourceRefClick, searchTerm, activeCitationRef })}
      </div>
    </details>
  );
}

export function MarkdownArticle({ markdown, pages, onWikiLink, onSourceRefClick, searchTerm, activeCitationRef }: { markdown: string; pages?: WikiPage[]; onWikiLink?: (pageId: string) => void; onSourceRefClick?: (ref: string) => void; searchTerm?: string; activeCitationRef?: string | null }) {
  const { visibleLines, tabbedSections } = useMemo(() => splitArticleSections(markdown.split('\n')), [markdown]);
  const documentContent = renderMarkdownLines(visibleLines, { pages, onWikiLink, onSourceRefClick, searchTerm, activeCitationRef }, true);

  return <article className="wiki-article">
    <section className="wiki-document-content">
      <div className="wiki-document-content-label">Document Content</div>
      {documentContent}
    </section>
    <WikiTabbedSections sections={tabbedSections} pages={pages} onWikiLink={onWikiLink} onSourceRefClick={onSourceRefClick} searchTerm={searchTerm} activeCitationRef={activeCitationRef} />
  </article>;
}
