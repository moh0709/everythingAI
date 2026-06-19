import React from 'react';
import { extractedTextPreviewStyle } from './extractedTextPreviewStyle';
import { selectExtractedPreviewText, type ExtractedPreviewSource } from './selectExtractedPreviewText';

type ExtractedTextPreviewProps = {
  source: ExtractedPreviewSource;
  fallback: string;
  label?: string;
};

export function ExtractedTextPreview({ source, fallback, label = 'Extracted text preview' }: ExtractedTextPreviewProps) {
  const text = selectExtractedPreviewText(source);

  return React.createElement(
    'pre',
    {
      'aria-label': label,
      className: 'preview-box text-preview',
      style: extractedTextPreviewStyle,
    },
    text || fallback,
  );
}
