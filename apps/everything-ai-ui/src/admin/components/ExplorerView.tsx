import type { IndexedFile } from '../../api';
import { ExtractedTextPreview } from '../../shared/ExtractedTextPreview';
import { FILE_STATUS_FILTER_OPTIONS } from '../../shared/fileStatusOptions';
import { formatDate } from '../../shared/formatDate';
import type { ExtractedPreviewSource } from '../../shared/selectExtractedPreviewText';
import { formatSize } from '../utils/format';

type FilePreview = NonNullable<ExtractedPreviewSource> & {
  insight?: { summary?: string; classification?: string } | null;
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
  return <section>
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
          {files.map((file) => <tr
            key={file.id}
            onClick={() => setSelectedFileId(file.id)}
            className={selectedFile?.id === file.id ? 'selected' : ''}
          >
            <td>{file.filename}</td>
            <td>{file.absolute_path}</td>
            <td><span className="chip blue">{file.extension || 'file'}</span></td>
            <td>{formatSize(file.size_bytes)}</td>
            <td>{formatDate(file.modified_at)}</td>
          </tr>)}
        </tbody>
      </table>

      <aside className="details">
        <h2>{selectedFile?.filename || 'Select a file'}</h2>
        {selectedFile && <>
          <p><strong>Path:</strong> {selectedFile.absolute_path}</p>
          <p><strong>Type:</strong> {selectedFile.extension}</p>
          <p><strong>Size:</strong> {formatSize(selectedFile.size_bytes)}</p>
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
