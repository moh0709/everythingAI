import React from 'react';
import { FileText, Search, Server } from 'lucide-react';
import { formatSize } from './userUtils';
import type { DocumentContext } from './types';
import type { IndexedFile } from '../api';
import { ExtractedTextPreview } from '../shared/ExtractedTextPreview';
import {
  summarizeFileProgress,
  withInFlightSummary,
  type FileProgressRecord,
} from '../shared/fileProgress';
import { deriveSourceLifecycle } from '../shared/sourceLifecycle';
import '../shared/sourceLifecycle.css';
import './localSettingsHelp.css';

type SearchMatchDetails = {
  basis: 'keyword' | 'semantic' | 'keyword + semantic';
  keyword_rank: number | null;
  semantic_rank: number | null;
  semantic_score: number | null;
  explanation: string;
};

type SearchAwareIndexedFile = IndexedFile & {
  search_match?: SearchMatchDetails;
  snippet?: string | null;
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
  openSourceRecovery: () => void;
};

function summarizeFiles(files: IndexedFile[]) {
  const progressFiles = files;
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

function searchMatchFor(file: IndexedFile) {
  return (file as SearchAwareIndexedFile).search_match;
}

function formatSemanticSignal(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return null;
  return score.toFixed(3);
}

export function ExploreView({
  error, busy, status, baseUrl, setBaseUrl, token, setToken,
  query, setQuery, files, selectedFile, documentContext,
  refreshFiles, searchEverything, handleAskFromHero, loadDocumentContext, saveConnection, openSourceRecovery,
}: ExploreViewProps) {
  const summary = summarizeFiles(files);
  const progressSummary = withInFlightSummary(summarizeFileProgress(files));
  const selectedRecord = (documentContext?.file || selectedFile) as FileProgressRecord | undefined;
  const selectedLifecycle = deriveSourceLifecycle(selectedRecord || {});

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
          <strong>In flight</strong>
          <p>{progressSummary.inFlight} file(s) are still moving through indexing or extraction.</p>
        </div>
        <div>
          <strong>Running</strong>
          <p>{progressSummary.running} file(s) are indexed and still waiting for extraction to finish.</p>
        </div>
        <div>
          <strong>Waiting</strong>
          <p>{progressSummary.waiting} file(s) have a progress record but are not yet in a clear active stage.</p>
        </div>
        <div>
          <strong>Complete</strong>
          <p>{progressSummary.complete} file(s) have finished indexing and extraction.</p>
        </div>
        <div>
          <strong>Partial</strong>
          <p>{progressSummary.partial} file(s) are indexed but unsupported for text extraction.</p>
        </div>
        <div>
          <strong>Failures</strong>
          <p>{progressSummary.failed} file(s) reported an index or extraction failure.</p>
        </div>
        <div>
          <strong>No progress data</strong>
          <p>{progressSummary.noProgressData} file(s) have not reported indexing or extraction status yet.</p>
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
        <div>
          <strong>Progress cues</strong>
          <p>Each file card now shows the current stage and next step so you can tell whether it is queued, running, complete, partial, or failed.</p>
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
            <p>{files.length} visible file(s). Search results explain whether they matched indexed text, semantic similarity, or both.</p>
          </div>
          <button className="outline" onClick={refreshFiles} disabled={busy}>Refresh</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th></tr></thead>
          <tbody>{files.map((file) => {
            const lifecycle = deriveSourceLifecycle(file as FileProgressRecord);
            const searchMatch = searchMatchFor(file);
            const semanticSignal = formatSemanticSignal(searchMatch?.semantic_score);
            return <tr key={file.id} className={selectedFile?.id === file.id ? 'selected' : ''}>
              <td>
                <button className="file-select-button" aria-label={`Inspect ${file.filename}`} onClick={() => loadDocumentContext(file.id)}>{file.filename}</button>
                {searchMatch ? <div className="search-match-details" aria-label={`Search match for ${file.filename}`}>
                  <span className="chip blue">{searchMatch.basis}</span>
                  <small>{searchMatch.explanation}</small>
                  {semanticSignal ? <small>Semantic similarity signal: {semanticSignal} (ranking signal, not confidence).</small> : null}
                </div> : null}
              </td>
              <td><span className="chip blue">{file.extension || 'file'}</span></td>
              <td>{formatSize(file.size_bytes)}</td>
              <td>
                <div className={`source-lifecycle source-lifecycle-${lifecycle.state}`}>
                  <strong>{lifecycle.label}</strong>
                  <small>{lifecycle.detail}</small>
                  <small className="source-lifecycle-technical">Index {file.index_status || 'pending'} · Extract {file.extraction_status || 'pending'}</small>
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
          <p><strong>Recovery:</strong> {selectedRecord?.recovery_status || 'active'}</p>
          <p><strong>Lifecycle:</strong> {selectedLifecycle.label} — {selectedLifecycle.detail}</p>
          <p><strong>Lifecycle state:</strong> {selectedLifecycle.state}</p>
          {selectedLifecycle.recoveryTarget === 'source_root' && <>
            <p id="source-recovery-explanation">Recovery reuses the safe source-root controls; no unsupported per-file retry is attempted.</p>
            <button className="outline" aria-describedby="source-recovery-explanation" onClick={openSourceRecovery}>Open source recovery</button>
          </>}
          <p><strong>Index status:</strong> {documentContext.file?.index_status || 'unknown'}</p>
          <p><strong>Extraction:</strong> {documentContext.file?.extraction_status || 'pending'}</p>
          {(selectedRecord?.index_error_message || selectedRecord?.error_message || selectedRecord?.extraction_error_message) ? <p><strong>Reported issue:</strong> {selectedRecord?.index_error_message || selectedRecord?.error_message || selectedRecord?.extraction_error_message}</p> : null}
          <p><strong>Source:</strong> {documentContext.source_reference?.source_label || documentContext.source_reference?.relative_path || 'local file'}</p>
          {documentContext.insight?.summary && <><h3>File Insight</h3><p>{documentContext.insight.summary}</p></>}
          <h3>Extracted File Text</h3>
          <ExtractedTextPreview source={documentContext} fallback="No preview text available." label="Client extracted file text preview" />
        </> : <p>Select a file to inspect extracted file content. To read saved knowledge pages, open Knowledge Base.</p>}
      </aside>
    </section>
  </>;
}
