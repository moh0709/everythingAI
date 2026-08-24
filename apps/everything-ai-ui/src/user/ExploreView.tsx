import React, { useMemo, useState } from 'react';
import { FileText, Search, Server } from 'lucide-react';
import { formatSize } from './userUtils';
import type { DocumentContext } from './types';
import type { IndexedFile } from '../api';
import { ExtractedTextPreview } from '../shared/ExtractedTextPreview';
import { SearchResultContext } from './SearchResultContext';
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

type LifecycleRefinement = {
  state: string;
  label: string;
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

function searchSnippetFor(file: IndexedFile) {
  return (file as SearchAwareIndexedFile).snippet;
}

function formatSemanticSignal(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return null;
  return score.toFixed(3);
}

function normalizedExtension(file: IndexedFile) {
  return (file.extension || '').trim().toLowerCase();
}

function lifecycleRefinementFor(file: IndexedFile): LifecycleRefinement | null {
  const hasLifecycleData = Boolean(file.index_status || file.extraction_status);
  if (!hasLifecycleData && searchMatchFor(file)) return null;
  const lifecycle = deriveSourceLifecycle(file as FileProgressRecord);
  return { state: lifecycle.state, label: lifecycle.label };
}

export function ExploreView({
  error, busy, status, baseUrl, setBaseUrl, token, setToken,
  query, setQuery, files, selectedFile, documentContext,
  refreshFiles, searchEverything, handleAskFromHero, loadDocumentContext, saveConnection, openSourceRecovery,
}: ExploreViewProps) {
  const [extensionFilter, setExtensionFilter] = useState<string>('');
  const [basisFilter, setBasisFilter] = useState<SearchMatchDetails['basis'] | ''>('');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('');
  const summary = summarizeFiles(files);
  const progressSummary = withInFlightSummary(summarizeFileProgress(files));
  const selectedRecord = (documentContext?.file || selectedFile) as FileProgressRecord | undefined;
  const selectedLifecycle = deriveSourceLifecycle(selectedRecord || {});

  const hasSearchResults = useMemo(() => files.some((file) => Boolean(searchMatchFor(file))), [files]);
  const availableExtensions = useMemo(() => Array.from(new Set(
    files.map(normalizedExtension).filter(Boolean),
  )).sort(), [files]);
  const availableBases = useMemo(() => Array.from(new Set(
    files.map((file) => searchMatchFor(file)?.basis).filter((basis): basis is SearchMatchDetails['basis'] => Boolean(basis)),
  )), [files]);
  const availableLifecycles = useMemo(() => {
    const lifecycleByState = new Map<string, string>();
    for (const file of files) {
      const lifecycle = lifecycleRefinementFor(file);
      if (lifecycle) lifecycleByState.set(lifecycle.state, lifecycle.label);
    }
    return Array.from(lifecycleByState, ([state, label]) => ({ state, label }));
  }, [files]);

  const visibleFiles = useMemo(() => files.filter((file) => {
    if (extensionFilter && normalizedExtension(file) !== extensionFilter) return false;
    if (basisFilter && searchMatchFor(file)?.basis !== basisFilter) return false;
    if (lifecycleFilter && lifecycleRefinementFor(file)?.state !== lifecycleFilter) return false;
    return true;
  }), [files, extensionFilter, basisFilter, lifecycleFilter]);

  const hasActiveFilters = Boolean(extensionFilter || basisFilter || lifecycleFilter);
  const lifecycleFilterLabel = availableLifecycles.find((lifecycle) => lifecycle.state === lifecycleFilter)?.label || lifecycleFilter;

  function clearFilters() {
    setExtensionFilter('');
    setBasisFilter('');
    setLifecycleFilter('');
  }

  function searchWithFreshRefinements() {
    clearFilters();
    searchEverything();
  }

  function refreshWithFreshRefinements() {
    clearFilters();
    refreshFiles();
  }

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
            onKeyDown={(event) => { if (event.key === 'Enter') searchWithFreshRefinements(); }}
            placeholder="Search filenames, paths, or extracted file content..."
          />
        </div>
        <button className="purple" onClick={searchWithFreshRefinements} disabled={busy}>Search Files</button>
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
        <div><strong>In flight</strong><p>{progressSummary.inFlight} file(s) are still moving through indexing or extraction.</p></div>
        <div><strong>Running</strong><p>{progressSummary.running} file(s) are indexed and still waiting for extraction to finish.</p></div>
        <div><strong>Waiting</strong><p>{progressSummary.waiting} file(s) have a progress record but are not yet in a clear active stage.</p></div>
        <div><strong>Complete</strong><p>{progressSummary.complete} file(s) have finished indexing and extraction.</p></div>
        <div><strong>Partial</strong><p>{progressSummary.partial} file(s) are indexed but unsupported for text extraction.</p></div>
        <div><strong>Failures</strong><p>{progressSummary.failed} file(s) reported an index or extraction failure.</p></div>
        <div><strong>No progress data</strong><p>{progressSummary.noProgressData} file(s) have not reported indexing or extraction status yet.</p></div>
        <div><strong>Next step</strong><p>{progressSummary.running > 0 ? 'Refresh the file list after the scanner or extractor finishes to see the latest state.' : 'If nothing is running, start a scan or open a file with missing progress data to inspect the next stage.'}</p></div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-title">
        <div><h2><Server /> Connection</h2><p>Official client workspace runs on port 5151. Backend API stays on port 4100.</p></div>
        <button className="outline" onClick={saveConnection}>Save</button>
      </div>
      <div className="settings-help-grid">
        <div><strong>Files vs Knowledge Base</strong><p>Sources & Files shows original indexed files and extracted content. Knowledge Base shows generated, saved knowledge pages built from those sources.</p></div>
        <div><strong>Token field</strong><p>Only change the token if the backend token was changed. Saving stores it in this browser only.</p></div>
        <div><strong>Progress cues</strong><p>Each file card now shows the current stage and next step so you can tell whether it is queued, running, complete, partial, or failed.</p></div>
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
            <p>{visibleFiles.length} visible file(s){hasActiveFilters ? ` from ${files.length} current-query result(s)` : ''}. Search results explain whether they matched indexed text, semantic similarity, or both.</p>
          </div>
          <button className="outline" onClick={refreshWithFreshRefinements} disabled={busy}>Refresh</button>
        </div>

        {hasSearchResults ? <section className="settings-help-grid" aria-label="Search result filters">
          <div>
            <strong>File type</strong>
            <p>Filter only by the extension already returned with each result.</p>
            <select aria-label="Filter search results by file type" value={extensionFilter} onChange={(event) => setExtensionFilter(event.target.value)}>
              <option value="">All file types</option>
              {availableExtensions.map((extension) => <option key={extension} value={extension}>.{extension}</option>)}
            </select>
          </div>
          <div>
            <strong>Match basis</strong>
            <p>Filter by the existing keyword/semantic match explanation without changing ranking.</p>
            <select aria-label="Filter search results by match basis" value={basisFilter} onChange={(event) => setBasisFilter(event.target.value as SearchMatchDetails['basis'] | '')}>
              <option value="">All match bases</option>
              {availableBases.map((basis) => <option key={basis} value={basis}>{basis}</option>)}
            </select>
          </div>
          <div>
            <strong>Lifecycle status</strong>
            <p>Filter by the processing state already derived from each result's persisted indexing and extraction facts.</p>
            <select aria-label="Filter search results by lifecycle status" value={lifecycleFilter} onChange={(event) => setLifecycleFilter(event.target.value)}>
              <option value="">All lifecycle states</option>
              {availableLifecycles.map((lifecycle) => <option key={lifecycle.state} value={lifecycle.state}>{lifecycle.label}</option>)}
            </select>
          </div>
          <div>
            <strong>Active refinement</strong>
            <p>{hasActiveFilters ? 'Filters narrow the current query only. Original result order and match explanations are unchanged.' : 'No filters are active. The full current-query result set is visible.'}</p>
            <div className="source-actions" aria-label="Active search filters">
              {extensionFilter ? <button className="outline" onClick={() => setExtensionFilter('')}>File type: .{extensionFilter} ×</button> : null}
              {basisFilter ? <button className="outline" onClick={() => setBasisFilter('')}>Match basis: {basisFilter} ×</button> : null}
              {lifecycleFilter ? <button className="outline" onClick={() => setLifecycleFilter('')}>Lifecycle: {lifecycleFilterLabel} ×</button> : null}
              {hasActiveFilters ? <button className="outline" onClick={clearFilters}>Clear all filters</button> : null}
            </div>
          </div>
        </section> : null}

        {hasSearchResults && hasActiveFilters && visibleFiles.length === 0 ? <div className="status-strip ready" role="status">No current-query results match the active filters. Clear or adjust a filter to restore the underlying search results.</div> : null}

        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th></tr></thead>
          <tbody>{visibleFiles.map((file) => {
            const lifecycle = deriveSourceLifecycle(file as FileProgressRecord);
            const searchMatch = searchMatchFor(file);
            const searchSnippet = searchSnippetFor(file);
            const semanticSignal = formatSemanticSignal(searchMatch?.semantic_score);
            const hasLifecycleData = Boolean(file.index_status || file.extraction_status);
            return <tr key={file.id} className={selectedFile?.id === file.id ? 'selected' : ''}>
              <td>
                <button className="file-select-button" aria-label={`Inspect ${file.filename}`} onClick={() => loadDocumentContext(file.id)}>{file.filename}</button>
                {searchMatch ? <>
                  <div className="search-match-details" aria-label={`Search match for ${file.filename}`}>
                    <span className="chip blue">{searchMatch.basis}</span>
                    <small>{searchMatch.explanation}</small>
                    {semanticSignal ? <small>Semantic similarity signal: {semanticSignal} (ranking signal, not confidence).</small> : null}
                  </div>
                  <SearchResultContext filename={file.filename} snippet={searchSnippet} query={query} basis={searchMatch.basis} />
                </> : null}
              </td>
              <td><span className="chip blue">{file.extension || 'file'}</span></td>
              <td>{file.size_bytes == null ? '—' : formatSize(file.size_bytes)}</td>
              <td>
                {hasLifecycleData || !searchMatch ? <div className={`source-lifecycle source-lifecycle-${lifecycle.state}`}>
                  <strong>{lifecycle.label}</strong>
                  <small>{lifecycle.detail}</small>
                  <small className="source-lifecycle-technical">Index {file.index_status || 'pending'} · Extract {file.extraction_status || 'pending'}</small>
                </div> : <div className="source-lifecycle"><strong>Search result</strong><small>Open the file to load its current indexing and extraction details.</small></div>}
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
