export type SourceLifecycleState =
  | 'intake'
  | 'indexing'
  | 'extracting'
  | 'ready'
  | 'unsupported'
  | 'index_failed'
  | 'extraction_failed';

export type SourceRecoveryAction = 'retry_index' | 'retry_extraction' | null;

export type SourceLifecycleRecord = {
  index_status?: string | null;
  extraction_status?: string | null;
  error_message?: string | null;
  extraction_error_message?: string | null;
};

export type SourceLifecycleView = {
  state: SourceLifecycleState;
  label: string;
  detail: string;
  recoveryAction: SourceRecoveryAction;
  recoveryTarget: 'source_root' | null;
};

export function deriveSourceLifecycle(file: SourceLifecycleRecord): SourceLifecycleView {
  if (file.index_status === 'failed') {
    return {
      state: 'index_failed',
      label: 'Index failed',
      detail: file.error_message || 'The source could not be indexed. Fix the source and re-scan its root.',
      recoveryAction: null,
      recoveryTarget: 'source_root',
    };
  }

  if (file.extraction_status === 'failed') {
    return {
      state: 'extraction_failed',
      label: 'Extraction failed',
      detail: file.extraction_error_message || 'Text extraction failed. Fix the source and re-scan its root.',
      recoveryAction: null,
      recoveryTarget: 'source_root',
    };
  }

  if (file.extraction_status === 'unsupported') {
    return {
      state: 'unsupported',
      label: 'Ready without text',
      detail: 'Metadata is indexed, but this file type is unsupported for text extraction.',
      recoveryAction: null,
      recoveryTarget: null,
    };
  }

  if (file.extraction_status === 'extracted') {
    return {
      state: 'ready',
      label: 'Ready',
      detail: 'Indexing and text extraction are complete.',
      recoveryAction: null,
      recoveryTarget: null,
    };
  }

  if (file.index_status === 'indexed') {
    return {
      state: 'extracting',
      label: 'Extracting text',
      detail: 'Indexing is complete and text extraction is pending.',
      recoveryAction: null,
      recoveryTarget: null,
    };
  }

  if (file.index_status) {
    return {
      state: 'indexing',
      label: 'Indexing',
      detail: 'The source is queued or currently being indexed.',
      recoveryAction: null,
      recoveryTarget: null,
    };
  }

  return {
    state: 'intake',
    label: 'Waiting for intake',
    detail: 'No indexing or extraction record exists yet.',
    recoveryAction: null,
    recoveryTarget: null,
  };
}
