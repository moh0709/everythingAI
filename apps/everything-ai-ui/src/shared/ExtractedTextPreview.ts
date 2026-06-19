import React from 'react';
import { extractedTextPreviewStyle } from './extractedTextPreviewStyle';

type ExtractedTextPreviewProps = {
  text: string;
  fallback: string;
};

export function ExtractedTextPreview({ text, fallback }: ExtractedTextPreviewProps) {
  return React.createElement(
    'pre',
    {
      className: 'preview-box text-preview',
      style: extractedTextPreviewStyle,
    },
    text || fallback,
  );
}
