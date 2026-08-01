export type ExtractedPreviewBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][] };

export type ExtractedPreviewModel = {
  blocks: ExtractedPreviewBlock[];
  truncated: boolean;
  lineCount: number;
};

const PREVIEW_CHAR_LIMIT = 8000;
const PREVIEW_LINE_LIMIT = 80;

export function normalizePreviewText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
}

function stripHeadingMarker(text: string): string {
  return text.replace(/^#{1,6}\s+/, '').trim();
}

function isNumberedHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!/^\d+(?:\.\d+)*[.)]\s+\S/.test(trimmed)) return false;
  const title = trimmed.replace(/^\d+(?:\.\d+)*[.)]\s+/, '').trim();
  if (!title || title.length > 90 || /[.!?]$/.test(title)) return false;
  const words = title.split(/\s+/);
  return words.length <= 12 && words.some((word) => /^[A-Z]/.test(word));
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 100) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (isNumberedHeading(trimmed)) return true;
  if (/^(chapter|section|part|appendix|summary|overview|findings|recommendations|table of contents)\b/i.test(trimmed)) return true;
  if (trimmed !== trimmed.toUpperCase()) return false;
  return /[A-Z]/.test(trimmed) && trimmed.length >= 6 && !/[.!?]$/.test(trimmed);
}

function isListItem(line: string): boolean {
  return /^\s*(?:[-*\u2022]|\d+[.)])\s+\S/.test(line);
}

function extractListItem(line: string): string {
  return line.replace(/^\s*(?:[-*\u2022]|\d+[.)])\s+/, '').trim();
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

export function buildExtractedTextPreviewModel(text: string): ExtractedPreviewModel {
  const lines = text.split('\n');
  const blocks: ExtractedPreviewBlock[] = [];
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
