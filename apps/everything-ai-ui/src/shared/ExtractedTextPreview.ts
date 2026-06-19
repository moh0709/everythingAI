import React from 'react';
import { extractedTextPreviewStyle } from './extractedTextPreviewStyle';
import { selectExtractedPreviewText } from './selectExtractedPreviewText';
import type { ExtractedPreviewSource } from './selectExtractedPreviewText';

type ExtractedTextPreviewProps = {
  source: ExtractedPreviewSource;
  fallback: string;
};

export function ExtractedTextPreview({ source, fallback }: ExtractedTextPreviewProps) {
  const text = selectExtractedPreviewText(source);

  return React.createElement(
    'pre',
    {
      className: 'preview-box text-preview',
      style: extractedTextPreviewStyle,
    },
    text || fallback,
  );
}
