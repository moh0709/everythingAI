type ExtractedPreviewSource = {
  previewText?: string;
  extracted_text?: string;
  file?: {
    extracted_text?: string;
  };
} | null | undefined;

export function selectExtractedPreviewText(source: ExtractedPreviewSource): string {
  return source?.previewText || source?.extracted_text || source?.file?.extracted_text || '';
}
