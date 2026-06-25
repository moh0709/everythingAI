import React from 'react';
import { FileText, Search, Server } from 'lucide-react';
import { formatSize } from './userUtils';
import type { DocumentContext } from './types';
import type { IndexedFile } from '../api';
import { ExtractedTextPreview } from '../shared/ExtractedTextPreview';
import './localSettingsHelp.css';

type FileProgressRecord = IndexedFile & {
  recovery_status?: string;
  error_message?: string | null;
  extraction_error_message?: string | null;
};

type ExploreViewProps = {
  error: string;
  busy: boolean;
  status: string;
  baseUrl: string;
  setBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  token: string;
  setToken: React.Dispatch<React.SetStateAction<string>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  files: IndexedFile[];
  selectedFile: IndexedFile | undefined;
  documentContext: DocumentContext | null;
  refreshFiles: () => void;
  searchEverything: () => void;
  handleAskFromHero: () => void;
  loadDocumentContext: (fileId: string) => void;
  saveConnection: () => void;
};

type FileProgress = {
  label: string;
  tone: 'dark' | 'blue' | 'mint';
  detail: string;
  state: string;
};

type FileProgressSummary = {
  total: number;
  complete: number;
  running: number;
  waiting: number;
  partial: number;
  failed: number;
  trashed: number;
  noProgressData: number;
};

function getFileProgress(file?: FileProgressRecord | null): FileProgress {
  if (!file) {
    return {
      label: 'No file selected',
      tone: 'dark',
      detail: 'Choose a file to inspect indexing and extraction progress.',
      state: 'idle',
    };
  }

  if ((file as any).recovery_status === 'trashed') {
    return {
      label: 'Trashed',
      tone: 'dark',
      detail: 'This file is hidden from active processing and needs recovery before it can be indexed again.',
      state: 'archived',
    };
  }

  if (file.index_status === 'failed') {
    return {
      label: 'Index failed',
      tone: 'dark',
      detail: file.error_message || 'The indexer reported a failure for this file.',
      state: 'failed',
    };
  }

  if (file.extraction_status === 'failed') {
    return {
      label: 'Extraction failed',
      tone: 'dark',
      detail: file.extraction_error_message || 'The extractor could not produce text for this file.',
      state: 'failed',
    };
  }

  if (file.extraction_status === 'unsupported') {
    return {
      label: 'Unsupported',
      tone: 'dark',
      detail: 'The file type is indexed, but the extractor does not support text extraction for it.',
      state: 'partial',
    };
  }

  if (file.extraction_status === 'extracted') {
    return {
      label: 'Complete',
      tone: 'mint',
      detail: 'Indexing and extraction are complete. The extracted text preview is ready to read.',
      state: 'complete',
    };
  }

  if (file.index_status === 'indexed') {
    return {
      label: 'Awaiting extraction',
      tone: 'blue',
      detail: 'The file is indexed and is waiting for the extractor or a refresh cycle to finish.',
      state: 'running',
    };
  }

  return {
    label: 'Indexing',
    tone: 'blue',
    detail: 'The file has not reached a completed index state yet.',
    state: 'running',
  };
}

function summarizeFiles(files: IndexedFile[]) {
  const progressFiles = files as FileProgressRecord[];
  const total = progressFiles.length;
  const indexed = progressFiles.filter((file) => file.index_status === 'indexed').length;
  const indexFailed = progressFiles.filter((file) => file.index_status === 'failed').length;
  const extracted = progressFiles.filter((file) => file.extraction_status === 'extracted').length;
  const extractionFailed = progressFiles.filter((file) => file.extraction_status === 'failed').length;
  const unsupported = progressFiles.filter((file) => file.extraction_status === 'unsupported').length;
  const awaitingExtraction = progressFiles.filter((file) => file.index_status === 'indexed' && !file.extraction_status).length;

  return {
    total,
    indexed,
    indexFailed,
    extracted,
    extractionFailed,
    unsupported,
    awaitingExtraction,
    active: Math.max(total - extracted - extractionFailed - unsupported - indexFailed, 0),
  };
}

function summarizeProgress(files: IndexedFile[]): FileProgressSummary {
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
      summary.waiting += 1;
      return summary;
    }

    if (hasIndexStatus || hasExtractionStatus) {
      summary.waiting += 1;
      return summary;
    }

    summary.noProgressData += 1;
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
  });
}

export function ExploreView({
  error, busy, status, baseUrl, setBaseUrl, token, setToken,
  query, setQuery, files, selectedFile, documentContext,
  refreshFiles, searchEverything, handleAskFromHero, loadDocumentContext, saveConnection,
}: ExploreViewProps) {
  const summary = summarizeFiles(files);
  const progressSummary = summarizeProgress(files);
  const selectedRecord = (documentContext?.file || selectedFile) as FileProgressRecord | undefined;
  const selectedProgress = getFileProgress(selectedRecord);

  return <>
    <section className="hero-row">
      <div>
        <span className="chip blue">CLIENT SOURCES & FILE CONTENT</span>
        <h1><Search /> Sources & Files</h1>
        <p>This page is for exploring indexed files, extracted file text, and source context. The Knowledge Base is separate: it is the saved database of organized knowledge generated from these files.</p>
      </div>
      <div className="hero-actions">
        <div className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') searchEverything(); }}
            placeholder="Search filenames, paths, or extracted file content..."
          />
        </div>
        <button className="purple" onClick={searchEverything} disabled={busy}>Search Files</button>
        <button className="outline" onClick={handleAskFromHero} disabled={busy}>Ask AI</button>
      </div>
    </section>

    {error && <div className="error">{error}</div>}
    <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

    <section className="panel">
      <div className="panel-title">
        <div>
          <h2><FileText /> Indexing & Extraction Progress</h2>
          <p>Progress is inferred from the latest file index and extraction records so you can see what is running, waiting, complete, partial, or failed.</p>
        </div>
        <span className="chip dark">{summary.total} file(s)</span>
      </div>
      <div className="settings-help-grid">
        <div>
          <strong>Running</strong>
          <p>{progressSummary.running} file(s) are indexed and still waiting for extraction to finish.</p>
        </div>
        <div>
          <strong>Waiting</strong>
          <p>{progressSummary.waiting} file(s) have not started or do not yet have enough progress data to classify further.</p>
        </div>
        <div>
          <strong>Complete</strong>
          <p>{progressSummary.complete} file(s) have finished indexing and extraction.</p>
        </div>
        <div>
          <strong>Failures</strong>
          <p>{progressSummary.failed} file(s) reported an index or extraction failure.</p>
        </div>
        <div>
          <strong>Unsupported</strong>
          <p>{progressSummary.partial} file(s) are indexed but unsupported for text extraction.</p>
        </div>
        <div>
          <strong>Next step</strong>
          <p>{progressSummary.running > 0
            ? 'Refresh the file list after the scanner or extractor finishes to see the latest state.'
            : 'If nothing is running, start a scan or open a file with missing progress data to inspect the next stage.'}</p>
        </div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-title">
        <div>
          <h2><Server /> Connection</h2>
          <p>Official client workspace runs on port 5151. Backend API stays on port 4100.</p>
        </div>
        <button className="outline" onClick={saveConnection}>Save</button>
      </div>
      <div className="settings-help-grid">
        <div>
          <strong>Files vs Knowledge Base</strong>
          <p>Sources & Files shows original indexed files and extracted content. Knowledge Base shows generated, saved knowledge pages built from those sources.</p>
        </div>
        <div>
          <strong>Token field</strong>
          <p>Only change the token if the backend token was changed. Saving stores it in this browser only.</p>
        </div>
      </div>
      <div className="settings-grid">
        <label>API Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></label>
        <label>API Token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label>
      </div>
    </section>

    <section className="explorer-grid">
      <div className="panel">
        <div className="panel-title">
          <div>
            <h2><FileText /> Indexed File List</h2>
            <p>{files.length} visible file(s). Click a file to inspect extracted file content and source metadata.</p>
          </div>
          <button className="outline" onClick={refreshFiles} disabled={busy}>Refresh</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th></tr></thead>
          <tbody>{files.map((file) => {
            const progress = getFileProgress(file as FileProgressRecord);
            return <tr key={file.id} onClick={() => loadDocumentContext(file.id)} className={selectedFile?.id === file.id ? 'selected' : ''}>
              <td>{file.filename}</td>
              <td><span className="chip blue">{file.extension || 'file'}</span></td>
              <td>{formatSize(file.size_bytes)}</td>
              <td>
                <div className="chips">
                  <span className={`chip ${progress.tone}`}>{progress.label}</span>
                  <span className="chip dark">Index: {file.index_status || 'pending'}</span>
                  <span className="chip dark">Extract: {file.extraction_status || 'pending'}</span>
                </div>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>

      <aside className="details">
        <h2>{documentContext?.file?.filename || selectedFile?.filename || 'Select a file'}</h2>
        {documentContext ? <>
          <p><strong>View type:</strong> File content / source context</p>
          <p><strong>Path:</strong> {documentContext.file?.absolute_path}</p>
          <p><strong>Recovery:</strong> {(documentContext.file as any)?.recovery_status || 'active'}</p>
          <p><strong>Progress:</strong> {selectedProgress.label} — {selectedProgress.detail}</p>
          <p><strong>Progress state:</strong> {selectedProgress.state}</p>
          <p><strong>Index status:</strong> {documentContext.file?.index_status || 'unknown'}</p>
          <p><strong>Extraction:</strong> {documentContext.file?.extraction_status || 'pending'}</p>
          {(selectedRecord?.error_message || selectedRecord?.extraction_error_message) ? <p><strong>Reported issue:</strong> {selectedRecord?.error_message || selectedRecord?.extraction_error_message}</p> : null}
          <p><strong>Source:</strong> {documentContext.source_reference?.source_label || documentContext.source_reference?.relative_path || 'local file'}</p>
          {documentContext.insight?.summary && <><h3>File Insight</h3><p>{documentContext.insight.summary}</p></>}
          <h3>Extracted File Text</h3>
          <ExtractedTextPreview source={documentContext} fallback="No preview text available." label="Client extracted file text preview" />
        </> : <p>Select a file to inspect extracted file content. To read saved knowledge pages, open Knowledge Base.</p>}
      </aside>
    </section>
  </>;
}
