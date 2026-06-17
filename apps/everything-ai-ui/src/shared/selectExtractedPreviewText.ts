type ExtractedPreviewSource = {
  previewText?: string | null;
  extracted_text?: string | null;
  file?: object | null;
} | null | undefined;

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function selectFileExtractedText(file: object | null | undefined): string {
  if (!file || !('extracted_text' in file)) return '';
  return asText((file as { extracted_text?: unknown }).extracted_text);
}

export function selectExtractedPreviewText(source: ExtractedPreviewSource): string {
  return asText(source?.previewText) || asText(source?.extracted_text) || selectFileExtractedText(source?.file);
}
