import React from 'react';
import { extractedTextPreviewStyle } from './extractedTextPreviewStyle';
import { selectExtractedPreviewText, type ExtractedPreviewSource } from './selectExtractedPreviewText';
import './extractedTextPreview.css';

export type ExtractedTextPreviewProps = {
  source: ExtractedPreviewSource;
  fallback: string;
  label?: string;
};

type PreviewBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][] };

const PREVIEW_CHAR_LIMIT = 8000;
const PREVIEW_LINE_LIMIT = 80;

function normalizePreviewText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
}

function stripHeadingMarker(text: string): string {
  return text.replace(/^#{1,6}\s+/, '').trim();
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 100) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (/^(chapter|section|part|appendix|summary|overview|table of contents)\b/i.test(trimmed)) return true;
  if (trimmed !== trimmed.toUpperCase()) return false;
  return /[A-Z]/.test(trimmed) && trimmed.length >= 6 && !/[.!?]$/.test(trimmed);
}

function isListItem(line: string): boolean {
  return /^\s*(?:[-*•]|\d+[.)])\s+\S/.test(line);
}

function extractListItem(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
}

function isTableLikeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.includes('|')) return trimmed.split('|').filter(Boolean).length >= 2;
  if (trimmed.includes('\t')) return true;
  return trimmed.split(/\s{2,}/).filter(Boolean).length >= 3;
}

function parseTableCells(line: string): string[] {
  if (line.includes('|')) {
    return line.split('|').map((part) => part.trim()).filter(Boolean);
  }
  if (line.includes('\t')) {
    return line.split('\t').map((part) => part.trim()).filter(Boolean);
  }
  return line.trim().split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
}

function buildPreviewBlocks(text: string): { blocks: PreviewBlock[]; truncated: boolean; lineCount: number } {
  const lines = text.split('\n');
  const blocks: PreviewBlock[] = [];
  let truncated = false;
  let lineCount = 0;
  let charsSeen = 0;
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ').replace(/\s+/g, ' ').trim() });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: 'list', items: listItems });
    listItems = [];
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    blocks.push({ type: 'table', rows: tableRows });
    tableRows = [];
  };

  for (const line of lines) {
    lineCount += 1;
    charsSeen += line.length;

    if (lineCount > PREVIEW_LINE_LIMIT || charsSeen > PREVIEW_CHAR_LIMIT) {
      truncated = true;
      break;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    if (isHeadingLine(line)) {
      flushParagraph();
      flushList();
      flushTable();
      blocks.push({ type: 'heading', text: stripHeadingMarker(line) });
      continue;
    }

    if (isListItem(line)) {
      flushParagraph();
      flushTable();
      listItems.push(extractListItem(line));
      continue;
    }

    if (isTableLikeLine(line)) {
      flushParagraph();
      flushList();
      tableRows.push(parseTableCells(line));
      continue;
    }

    flushList();
    flushTable();
    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushTable();

  return { blocks, truncated, lineCount };
}

function renderBlock(block: PreviewBlock, index: number): React.ReactNode {
  switch (block.type) {
    case 'heading':
      return (
        <h4 className="extracted-preview__heading" key={`heading-${index}`}>
          {block.text}
        </h4>
      );
    case 'paragraph':
      return (
        <p className="extracted-preview__paragraph" key={`paragraph-${index}`}>
          {block.text}
        </p>
      );
    case 'list':
      return (
        <ul className="extracted-preview__list" key={`list-${index}`}>
          {block.items.map((item, itemIndex) => (
            <li className="extracted-preview__list-item" key={`${index}-${itemIndex}`}>
              {item}
            </li>
          ))}
        </ul>
      );
    case 'table':
      return (
        <div className="extracted-preview__table" key={`table-${index}`}>
          {block.rows.map((row, rowIndex) => (
            <div
              className="extracted-preview__table-row"
              key={`${index}-${rowIndex}`}
              style={{ gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))` }}
            >
              {row.map((cell, cellIndex) => (
                <span className="extracted-preview__table-cell" key={`${index}-${rowIndex}-${cellIndex}`}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function ExtractedTextPreview({ source, fallback, label = 'Extracted text preview' }: ExtractedTextPreviewProps) {
  const text = selectExtractedPreviewText(source);
  const normalizedText = normalizePreviewText(text);
  const preview = normalizedText ? buildPreviewBlocks(normalizedText) : null;
  const hasMeaningfulText = normalizedText.trim().length > 0;
  const isSparse = hasMeaningfulText && normalizedText.trim().length < 200;

  return (
    <div aria-label={label} className="extracted-preview preview-box text-preview" style={extractedTextPreviewStyle}>
      {hasMeaningfulText ? (
        <>
          <div className="extracted-preview__content">
            {preview?.blocks.length ? preview.blocks.map((block, index) => renderBlock(block, index)) : (
              <p className="extracted-preview__paragraph">{normalizedText}</p>
            )}
          </div>
          <p className="extracted-preview__note">
            {preview?.lineCount ?? 0} line(s) reviewed. {preview?.truncated ? 'Preview truncated for readability.' : 'Preview shown in full.'}
            {isSparse ? ' Extraction is short, so the source may be sparse or low-confidence.' : ''}
          </p>
        </>
      ) : (
        <p className="extracted-preview__empty">{fallback}</p>
      )}
    </div>
  );
}
