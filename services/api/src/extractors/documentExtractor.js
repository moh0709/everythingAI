import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import readXlsxFile from 'read-excel-file/node';

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.pdf', '.docx', '.xlsx']);

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

async function extractPlainText(filePath) {
  return normalizeText(await fs.readFile(filePath, 'utf8'));
}

async function extractPdf(filePath) {
  const parser = new PDFParse({ data: await fs.readFile(filePath) });

  try {
    const data = await parser.getText();
    return normalizeText(data.text || '');
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return normalizeText(result.value || '');
}

async function extractXlsx(filePath) {
  const rows = await readXlsxFile(filePath);
  const normalizedRows = rows.flatMap((entry) => Array.isArray(entry) ? [entry] : entry.data || []);
  const text = normalizedRows
    .map((row) => row.map((cell) => (cell == null ? '' : String(cell))).join(','))
    .join('\n');

  return normalizeText(text);
}

export function isSupportedForExtraction(extension) {
  return SUPPORTED_EXTENSIONS.has(extension.toLowerCase());
}

export async function extractDocument(fileRecord) {
  const extension = (fileRecord.extension || path.extname(fileRecord.absolute_path)).toLowerCase();
  const extractedAt = new Date().toISOString();

  if (!isSupportedForExtraction(extension)) {
    return {
      file_id: fileRecord.id,
      extracted_text: '',
      extraction_status: 'unsupported',
      extractor_name: 'unsupported',
      extracted_at: extractedAt,
      error_message: `Unsupported extension: ${extension || '(none)'}`,
      metadata_json: JSON.stringify({ extension }),
    };
  }

  try {
    let extractedText;
    let extractorName;

    if (extension === '.txt' || extension === '.md' || extension === '.csv') {
      extractedText = await extractPlainText(fileRecord.absolute_path);
      extractorName = 'plain-text';
    } else if (extension === '.pdf') {
      extractedText = await extractPdf(fileRecord.absolute_path);
      extractorName = 'pdf-parse';
    } else if (extension === '.docx') {
      extractedText = await extractDocx(fileRecord.absolute_path);
      extractorName = 'mammoth';
    } else if (extension === '.xlsx') {
      extractedText = await extractXlsx(fileRecord.absolute_path);
      extractorName = 'xlsx';
    }

    return {
      file_id: fileRecord.id,
      extracted_text: extractedText || '',
      extraction_status: 'extracted',
      extractor_name: extractorName,
      extracted_at: extractedAt,
      error_message: null,
      metadata_json: JSON.stringify({
        extension,
        character_count: (extractedText || '').length,
      }),
    };
  } catch (error) {
    return {
      file_id: fileRecord.id,
      extracted_text: '',
      extraction_status: 'failed',
      extractor_name: extension.slice(1) || 'unknown',
      extracted_at: extractedAt,
      error_message: error.message,
      metadata_json: JSON.stringify({ extension }),
    };
  }
}
