export type ExtractedPreviewSource = {
  previewText?: string | null;
  extracted_text?: string | null;
  file?: object | null;
} | null | undefined;

function asMeaningfulText(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : '';
}

function selectFileExtractedText(file: object | null | undefined): string {
  if (!file || !('extracted_text' in file)) return '';
  return asMeaningfulText((file as { extracted_text?: unknown }).extracted_text);
}

export function selectExtractedPreviewText(source: ExtractedPreviewSource): string {
  return asMeaningfulText(source?.previewText) || asMeaningfulText(source?.extracted_text) || selectFileExtractedText(source?.file);
}
