import type { IndexedFile } from '../api';

export type FileProgressRecord = IndexedFile & {
  recovery_status?: string;
  error_message?: string | null;
  index_error_message?: string | null;
  extraction_error_message?: string | null;
};

export type FileProgressTone = 'dark' | 'blue' | 'mint';

export type FileProgressState =
  | 'idle'
  | 'no-data'
  | 'queued'
  | 'running'
  | 'partial'
  | 'failed'
  | 'complete'
  | 'archived';

export type FileProgressSummary = {
  total: number;
  complete: number;
  running: number;
  waiting: number;
  partial: number;
  failed: number;
  trashed: number;
  noProgressData: number;
  inFlight: number;
};

export type FileProgressView = {
  label: string;
  tone: FileProgressTone;
  detail: string;
  state: FileProgressState;
  stage: string;
  nextStep: string;
};

export function describeFileProgress(file?: FileProgressRecord | null): FileProgressView {
  if (!file) {
    return {
      label: 'No file selected',
      tone: 'dark',
      detail: 'Choose a file to inspect indexing and extraction progress.',
      state: 'idle',
      stage: 'Waiting for selection',
      nextStep: 'Select a file or refresh the list to inspect its latest state.',
    };
  }

  if (file.recovery_status === 'trashed') {
    return {
      label: 'Trashed',
      tone: 'dark',
      detail: 'This file is hidden from active processing and needs recovery before it can be indexed again.',
      state: 'archived',
      stage: 'Archived',
      nextStep: 'Recover the file before expecting new indexing or extraction progress.',
    };
  }

  if (file.index_status === 'failed') {
    return {
      label: 'Index failed',
      tone: 'dark',
      detail: file.index_error_message || file.error_message || 'The indexer reported a failure for this file.',
      state: 'failed',
      stage: 'Indexing failed',
      nextStep: 'Fix the source issue and re-scan the file before retrying extraction.',
    };
  }

  if (file.extraction_status === 'failed') {
    return {
      label: 'Extraction failed',
      tone: 'dark',
      detail: file.extraction_error_message || 'The extractor could not produce text for this file.',
      state: 'failed',
      stage: 'Extraction failed',
      nextStep: 'Review the extraction error and retry the file after the source issue is fixed.',
    };
  }

  if (file.extraction_status === 'unsupported') {
    return {
      label: 'Unsupported',
      tone: 'dark',
      detail: 'The file type is indexed, but the extractor does not support text extraction for it.',
      state: 'partial',
      stage: 'Indexed, text unavailable',
      nextStep: 'Use the indexed metadata as-is or convert the file to a supported format.',
    };
  }

  if (file.extraction_status === 'extracted') {
    return {
      label: 'Complete',
      tone: 'mint',
      detail: 'Indexing and extraction are complete. The extracted text preview is ready to read.',
      state: 'complete',
      stage: 'Complete',
      nextStep: 'Open the extracted text preview or search the saved content.',
    };
  }

  if (file.index_status === 'indexed') {
    return {
      label: 'Waiting on extraction',
      tone: 'blue',
      detail: 'The file is indexed and the extractor or next refresh cycle has not finished yet.',
      state: 'running',
      stage: 'Extraction in progress',
      nextStep: 'Refresh after the extractor finishes or open the file to inspect its current preview.',
    };
  }

  if (file.index_status) {
    return {
      label: 'Queued',
      tone: 'blue',
      detail: 'The file has a progress record, but it has not reached indexed or failed status yet.',
      state: 'queued',
      stage: 'Queued for indexing',
      nextStep: 'Wait for the next scan or refresh cycle to write the latest status.',
    };
  }

  return {
    label: 'No progress data',
    tone: 'dark',
    detail: 'This file has not reported indexing or extraction status yet.',
    state: 'no-data',
    stage: 'Not started',
    nextStep: 'Start a scan or refresh after the scanner runs to pick up new progress data.',
  };
}

export function summarizeFileProgress(files: IndexedFile[]): FileProgressSummary {
  const progressFiles = files as FileProgressRecord[];

  return progressFiles.reduce<FileProgressSummary>((summary, file) => {
    if (file.recovery_status === 'trashed') {
      summary.trashed += 1;
      return summary;
    }

    const hasIndexStatus = Boolean(file.index_status);
    const hasExtractionStatus = Boolean(file.extraction_status);

    if (file.index_status === 'failed' || file.extraction_status === 'failed') {
      summary.failed += 1;
      return summary;
    }

    if (file.extraction_status === 'extracted') {
      summary.complete += 1;
      return summary;
    }

    if (file.extraction_status === 'unsupported') {
      summary.partial += 1;
      return summary;
    }

    if (file.index_status === 'indexed' && !file.extraction_status) {
      summary.running += 1;
      return summary;
    }

    if (!hasIndexStatus && !hasExtractionStatus) {
      summary.noProgressData += 1;
      return summary;
    }

    summary.waiting += 1;
    return summary;
  }, {
    total: progressFiles.length,
    complete: 0,
    running: 0,
    waiting: 0,
    partial: 0,
    failed: 0,
    trashed: 0,
    noProgressData: 0,
    inFlight: 0,
  });
}

export function withInFlightSummary(summary: FileProgressSummary): FileProgressSummary {
  return {
    ...summary,
    inFlight: Math.max(
      summary.total
      - summary.complete
      - summary.partial
      - summary.failed
      - summary.trashed
      - summary.noProgressData,
      0
    ),
  };
}
