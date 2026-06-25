import type { IndexedFile } from '../../api';
import { ExtractedTextPreview } from '../../shared/ExtractedTextPreview';
import { FILE_STATUS_FILTER_OPTIONS } from '../../shared/fileStatusOptions';
import { formatDate } from '../../shared/formatDate';
import type { ExtractedPreviewSource } from '../../shared/selectExtractedPreviewText';
import { formatSize } from '../utils/format';
import '../../user/localSettingsHelp.css';

type FilePreview = NonNullable<ExtractedPreviewSource> & {
  insight?: { summary?: string; classification?: string } | null;
};

type FileProgressRecord = IndexedFile & {
  recovery_status?: string;
  error_message?: string | null;
  extraction_error_message?: string | null;
};

type ExplorerViewProps = {
  files: IndexedFile[];
  allFiles: IndexedFile[];
  selectedFile?: IndexedFile;
  selectedPreview?: FilePreview | null;
  setSelectedFileId: (fileId: string) => void;
  query: string;
  setQuery: (query: string) => void;
  searchEverything: () => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filterExtension: string;
  setFilterExtension: (extension: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  extensionOptions: string[];
};

function dynamicTags(file?: IndexedFile, preview?: FilePreview | null) {
  if (!file) return [];

  const tags = new Set<string>();
  if (file.extension) tags.add(file.extension.replace('.', '').toUpperCase());
  if (file.index_status) tags.add(file.index_status);
  if (file.extraction_status) tags.add(file.extraction_status);
  if (preview?.insight?.classification) tags.add(preview.insight.classification);
  if ((file.size_bytes || 0) > 10 * 1024 * 1024) tags.add('large file');

  return Array.from(tags);
}

function getFileProgress(file?: FileProgressRecord | null) {
  if (!file) {
    return {
      label: 'No file selected',
      tone: 'dark',
      detail: 'Choose a file to inspect indexing and extraction progress.',
      state: 'idle',
    } as const;
  }

  if (file.recovery_status === 'trashed') {
    return {
      label: 'Trashed',
      tone: 'dark',
      detail: 'This file is hidden from active processing and needs recovery before it can be indexed again.',
      state: 'archived',
    } as const;
  }

  if (file.index_status === 'failed') {
    return {
      label: 'Index failed',
      tone: 'dark',
      detail: file.error_message || 'The indexer reported a failure for this file.',
      state: 'failed',
    } as const;
  }

  if (file.extraction_status === 'failed') {
    return {
      label: 'Extraction failed',
      tone: 'dark',
      detail: file.extraction_error_message || 'The extractor could not produce text for this file.',
      state: 'failed',
    } as const;
  }

  if (file.extraction_status === 'unsupported') {
    return {
      label: 'Unsupported',
      tone: 'dark',
      detail: 'The file type is indexed, but the extractor does not support text extraction for it.',
      state: 'partial',
    } as const;
  }

  if (file.extraction_status === 'extracted') {
    return {
      label: 'Complete',
      tone: 'mint',
      detail: 'Indexing and extraction are complete. The extracted text preview is ready to read.',
      state: 'complete',
    } as const;
  }

  if (file.index_status === 'indexed') {
    return {
      label: 'Awaiting extraction',
      tone: 'blue',
      detail: 'The file is indexed and is waiting for the extractor or a refresh cycle to finish.',
      state: 'running',
    } as const;
  }

  return {
    label: 'Indexing',
    tone: 'blue',
    detail: 'The file has not reached a completed index state yet.',
    state: 'running',
  } as const;
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

export function ExplorerView({
  files,
  allFiles,
  selectedFile,
  selectedPreview,
  setSelectedFileId,
  query,
  setQuery,
  searchEverything,
  showFilters,
  setShowFilters,
  filterExtension,
  setFilterExtension,
  filterStatus,
  setFilterStatus,
  extensionOptions,
}: ExplorerViewProps) {
  const summary = summarizeFiles(allFiles);
  const visibleSummary = summarizeFiles(files);
  const selectedProgress = getFileProgress((selectedFile || selectedPreview?.file) as FileProgressRecord | undefined);

  return <section>
    <div className="panel" style={{ marginBottom: '1rem' }}>
      <div className="panel-title">
        <div>
          <h2>Indexing & Extraction Progress</h2>
          <p>Operator view for scanning, indexing, extraction, and partial/failure visibility across the workspace.</p>
        </div>
        <span className="chip dark">{visibleSummary.total}/{summary.total} visible</span>
      </div>
      <div className="settings-help-grid">
        <div>
          <strong>Complete</strong>
          <p>{summary.extracted} file(s) have finished indexing and extraction.</p>
        </div>
        <div>
          <strong>Awaiting extraction</strong>
          <p>{summary.awaitingExtraction} file(s) are indexed but still waiting on extracted text.</p>
        </div>
        <div>
          <strong>Failures</strong>
          <p>{summary.indexFailed + summary.extractionFailed} file(s) reported an index or extraction failure.</p>
        </div>
        <div>
          <strong>Unsupported</strong>
          <p>{summary.unsupported} file(s) are indexed but unsupported for extraction.</p>
        </div>
        <div>
          <strong>Visible filters</strong>
          <p>{visibleSummary.total} file(s) are currently shown by the active filters and search query.</p>
        </div>
        <div>
          <strong>Next step</strong>
          <p>Refresh the explorer after scanner/extractor activity to see the latest state.</p>
        </div>
      </div>
    </div>

    <div className="explorer-search">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search files by name, path, or tags..."
      />
      <button onClick={searchEverything}>Search</button>
      <button className="outline" onClick={() => setShowFilters(!showFilters)}>Filters</button>
      <button className="outline" onClick={() => {
        setQuery('');
        setFilterExtension('all');
        setFilterStatus('all');
      }}>Clear</button>
    </div>

    {showFilters && <div className="filter-panel">
      <label>
        Extension
        <select value={filterExtension} onChange={(event) => setFilterExtension(event.target.value)}>
          <option value="all">All extensions</option>
          {extensionOptions.map((extension) => <option key={extension} value={extension}>{extension}</option>)}
        </select>
      </label>
      <label>
        Status
        <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
          {FILE_STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <span>{files.length}/{allFiles.length} files visible</span>
    </div>}

    <div className="chips">
      <span className="chip dark">All</span>
      {extensionOptions.slice(0, 8).map((extension) => <span key={extension} className="chip blue">{extension}</span>)}
    </div>

    <div className="explorer-grid">
      <table>
        <thead>
          <tr><th>Name</th><th>Path</th><th>Type</th><th>Size</th><th>Last Modified</th></tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const progress = getFileProgress(file as FileProgressRecord);
            return <tr
              key={file.id}
              onClick={() => setSelectedFileId(file.id)}
              className={selectedFile?.id === file.id ? 'selected' : ''}
            >
              <td>{file.filename}</td>
              <td>{file.absolute_path}</td>
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
          })}
        </tbody>
      </table>

      <aside className="details">
        <h2>{selectedFile?.filename || 'Select a file'}</h2>
        {selectedFile && <>
          <p><strong>Path:</strong> {selectedFile.absolute_path}</p>
          <p><strong>Type:</strong> {selectedFile.extension}</p>
          <p><strong>Size:</strong> {formatSize(selectedFile.size_bytes)}</p>
          <p><strong>Progress:</strong> {selectedProgress.label} — {selectedProgress.detail}</p>
          <h3>Tags</h3>
          <div className="chips">
            {dynamicTags(selectedFile, selectedPreview).map((tag) => <span className="chip blue" key={tag}>{tag}</span>)}
          </div>
          {selectedPreview?.insight?.summary && <>
            <h3>AI Insight</h3>
            <p>{selectedPreview.insight.summary}</p>
          </>}
          <h3>Content Preview</h3>
          <ExtractedTextPreview source={selectedPreview} fallback="Select a file to load extracted text and insight preview." label="Admin extracted file text preview" />
        </>}
      </aside>
    </div>
  </section>;
}

export default ExplorerView;
