import React from 'react';
import { buildExtractedTextPreviewModel, normalizePreviewText, type ExtractedPreviewBlock } from './extractedTextPreviewModel';
import { extractedTextPreviewStyle } from './extractedTextPreviewStyle';
import { selectExtractedPreviewText, type ExtractedPreviewSource } from './selectExtractedPreviewText';
import './extractedTextPreview.css';

export type ExtractedTextPreviewProps = {
  source: ExtractedPreviewSource;
  fallback: string;
  label?: string;
};

function renderBlock(block: ExtractedPreviewBlock, index: number): React.ReactNode {
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
  const preview = normalizedText ? buildExtractedTextPreviewModel(normalizedText) : null;
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
