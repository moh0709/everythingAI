import React, { MutableRefObject, useMemo, useState } from 'react';
import type { ApiOptions } from '../api';
import { BookOpen, Maximize2, Minimize2, Search, Sparkles, X } from 'lucide-react';
import { WikiNavigationTree } from './WikiNavigationTree';
import { countMarkdownMatches, MarkdownArticle } from './wikiMarkdown';
import { WikiRebuildPanel } from './WikiRebuildPanel';
import { WikiSourcePreviewDrawer } from './WikiSourcePreviewDrawer';
import { filePathHref } from './userUtils';
import type { WikiPage, WikiPayload, WikiSource } from './types';

type WikiViewProps = {
  error: string;
  busy: boolean;
  status: string;
  options: ApiOptions;
  wiki: WikiPayload | null;
  selectedWikiPage: WikiPage | undefined;
  readingMode: boolean;
  activeSourceRef: string | null;
  sourceCardRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  buildWiki: () => void;
  refreshWiki: () => void;
  setReadingMode: React.Dispatch<React.SetStateAction<boolean>>;
  openWikiPage: (pageId: string) => void;
  askAboutWikiPage: (page?: WikiPage) => void;
  revealSourceFile: (fileId: string, absolutePath?: string) => void;
  openSourceContext: (fileId: string) => void;
  handleCitationClick: (ref: string) => void;
};

function HelpIcon({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span
      className="wiki-help-icon"
      tabIndex={0}
      aria-label={label}
      data-tooltip={tooltip}
    >
      i
    </span>
  );
}

async function copySourcePath(pathValue?: string | null) {
  if (!pathValue) return;
  await navigator.clipboard.writeText(pathValue);
}

async function copyCitationRef(ref?: string | null) {
  if (!ref) return;
  await navigator.clipboard.writeText(`[${ref}]`);
}

function normalizeSourceRef(ref: string) {
  return ref.replace(/^\[/, '').replace(/\]$/, '').split(':')[0];
}

function normalizeChunkRef(ref: string) {
  return ref.replace(/^\[/, '').replace(/\]$/, '');
}

function formatCitationCoverage(score?: number | null) {
  if (score == null) return null;
  return `${Math.round(score * 100)}% citation coverage`;
}

function shortHash(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

export function WikiView({
  error, busy, status, options, wiki, selectedWikiPage, readingMode, activeSourceRef,
  sourceCardRefs, buildWiki, refreshWiki, setReadingMode, openWikiPage,
  askAboutWikiPage, revealSourceFile, openSourceContext, handleCitationClick,
}: WikiViewProps) {
  const [previewSource, setPreviewSource] = useState<WikiSource | null>(null);
  const [activeChunkRef, setActiveChunkRef] = useState<string | null>(null);
  const [pageSearchTerm, setPageSearchTerm] = useState('');

  const sourcesByRef = useMemo(() => {
    const map = new Map<string, WikiSource>();
    for (const source of selectedWikiPage?.sources || []) {
      map.set(source.ref, source);
    }
    return map;
  }, [selectedWikiPage]);

  const activeCitationRef = activeChunkRef || activeSourceRef;
  const citationCoverageLabel = formatCitationCoverage(selectedWikiPage?.citation_coverage_score);
  const sourceFingerprint = shortHash(selectedWikiPage?.source_fingerprint);
  const pageSearchMatchCount = selectedWikiPage ? countMarkdownMatches(selectedWikiPage.markdown, pageSearchTerm) : 0;

  function openSourcePreview(source?: WikiSource | null, chunkRef?: string | null) {
    if (!source) return;
    setPreviewSource(source);
    setActiveChunkRef(chunkRef || null);
  }

  function handleSourceCitationClick(ref: string) {
    const sourceRef = normalizeSourceRef(ref);
    const chunkRef = ref.includes(':') ? normalizeChunkRef(ref) : null;
    handleCitationClick(sourceRef);
    openSourcePreview(sourcesByRef.get(sourceRef), chunkRef);
  }

  return <>
    {error && <div className="error">{error}</div>}
    <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

    <section className="hero-row wiki-hero">
      <div>
        <span className="chip blue">CLIENT KNOWLEDGE BASE</span>
        <h1><BookOpen /> Knowledge Base</h1>
        <p>This is the saved knowledge database generated from indexed file content. Use Sources & Files to inspect raw documents; use this page to read the organized, source-backed knowledge layer.</p>
      </div>
      <div className="hero-actions">
        <div className="wiki-action-with-help">
          <button className="purple" onClick={buildWiki} disabled={busy}><Sparkles size={16} /> Build Knowledge Base</button>
          <HelpIcon label="Build Knowledge Base help" tooltip="Creates or rebuilds the source-backed Knowledge Base from indexed files. Use this after indexing/extracting content or when you want a full knowledge refresh." />
        </div>
        <div className="wiki-action-with-help">
          <button className="outline" onClick={refreshWiki} disabled={busy}>Refresh Knowledge Base</button>
          <HelpIcon label="Refresh Knowledge Base help" tooltip="Reloads the current persisted Knowledge Base from the backend without starting a rebuild. Useful after a rebuild finishes or when another process updated the saved knowledge." />
        </div>
        <div className="wiki-action-with-help">
          <button className="outline" onClick={() => setReadingMode((v) => !v)} disabled={!selectedWikiPage}>
            {readingMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {readingMode ? 'Exit Reading' : 'Reading Mode'}
          </button>
          <HelpIcon label="Reading Mode help" tooltip="Focuses the selected knowledge article for a cleaner reading experience. It does not change or rebuild content." />
        </div>
        <div className="wiki-action-with-help">
          <button className="outline" onClick={() => askAboutWikiPage()} disabled={!selectedWikiPage || busy}>Ask about knowledge</button>
          <HelpIcon label="Ask about knowledge help" tooltip="Sends the selected Knowledge Base article as context to the Ask AI view so you can ask questions grounded in indexed source documents." />
        </div>
      </div>
    </section>

    <WikiRebuildPanel options={options} />

    <section className="wiki-layout">
      <aside className="wiki-sidebar panel">
        <div className="panel-title">
          <div>
            <h2><BookOpen /> Knowledge Map</h2>
            <p>{wiki?.page_count || 0} saved knowledge page(s), grouped by category.</p>
          </div>
        </div>
        {!wiki?.pages.length && <p className="muted">No Knowledge Base pages yet. Click Build Knowledge Base after building your workspace.</p>}
        {wiki?.pages.length ? <WikiNavigationTree pages={wiki.pages} selectedPageId={selectedWikiPage?.id} onSelect={openWikiPage} /> : null}
      </aside>

      <section className="wiki-main panel">
        {selectedWikiPage ? <>
          <div className="wiki-titlebar">
            <div>
              <span className="wiki-page-type">Knowledge page · {selectedWikiPage.page_type}</span>
              <h1>{selectedWikiPage.title}</h1>
              <p>{selectedWikiPage.summary}</p>
              <div className="wiki-evidence-badges" aria-label="Knowledge evidence quality">
                <span>{selectedWikiPage.sources.length} file source(s)</span>
                <span>{selectedWikiPage.sections?.length || 0} knowledge section(s)</span>
                {citationCoverageLabel ? <span>{citationCoverageLabel}</span> : null}
                {selectedWikiPage.weak_source_warning ? <span className="warning">Weak source coverage</span> : null}
                {sourceFingerprint ? <span title={selectedWikiPage.source_fingerprint}>Fingerprint {sourceFingerprint}</span> : null}
              </div>
            </div>
            <div className="wiki-action-with-help">
              <button className="outline" onClick={() => askAboutWikiPage(selectedWikiPage)}>Ask about this knowledge page</button>
              <HelpIcon label="Ask about this knowledge page help" tooltip="Opens the Ask AI flow with this exact knowledge article as context, so the answer can reference relevant indexed source documents." />
            </div>
          </div>
          <div className="wiki-page-search" role="search" aria-label="Search inside selected Knowledge Base article">
            <Search size={16} />
            <input
              type="search"
              value={pageSearchTerm}
              placeholder="Search inside this knowledge page..."
              onChange={(event) => setPageSearchTerm(event.target.value)}
            />
            {pageSearchTerm ? <span>{pageSearchMatchCount} match(es)</span> : <span>Knowledge page search</span>}
            {pageSearchTerm ? <button type="button" className="outline" onClick={() => setPageSearchTerm('')} aria-label="Clear knowledge page search"><X size={14} /> Clear</button> : null}
          </div>
          <MarkdownArticle markdown={selectedWikiPage.markdown} pages={wiki?.pages || []} onWikiLink={openWikiPage} onSourceRefClick={handleSourceCitationClick} searchTerm={pageSearchTerm} activeCitationRef={activeCitationRef} />
        </> : <p>Select a knowledge page.</p>}
      </section>

      <aside className="wiki-source-rail panel">
        {selectedWikiPage ? <>
          <h3>File Sources</h3>
          <p className="muted">Original indexed files used as evidence for this saved knowledge page.</p>
          <div className="source-list compact-source-list">
            {selectedWikiPage.sources.map((source) => <div
              className={`source-card wiki-source-card${activeSourceRef === source.ref ? ' wiki-source-card-active' : ''}`}
              key={`${source.ref}-${source.file_id}`}
              ref={(el) => { sourceCardRefs.current[source.ref] = el; }}
            >
              <strong>[{source.ref}] {source.filename || 'Source file'}</strong>
              <p>{source.location || 'file-level reference'}</p>
              {source.absolute_path && <a className="source-path-link" href={filePathHref(source.absolute_path)} title="Open source file path" target="_blank" rel="noreferrer">{source.absolute_path}</a>}
              <div className="source-actions">
                <button className="outline" onClick={() => openSourcePreview(source)}>Preview file source</button>
                {source.file_id && <button className="outline" onClick={() => revealSourceFile(source.file_id as string, source.absolute_path || undefined)}>Reveal in folder</button>}
                <button className="outline" onClick={() => copyCitationRef(source.ref)}>Copy citation</button>
                {source.absolute_path && <button className="outline" onClick={() => copySourcePath(source.absolute_path)}>Copy path</button>}
                {source.file_id && <button className="outline" onClick={() => openSourceContext(source.file_id as string)}>Open file context</button>}
              </div>
            </div>)}
          </div>
        </> : <p>Select a knowledge page to inspect its file sources.</p>}
      </aside>
    </section>

    <WikiSourcePreviewDrawer
      source={previewSource}
      activeChunkRef={activeChunkRef}
      onClose={() => {
        setPreviewSource(null);
        setActiveChunkRef(null);
      }}
      onCopyCitation={copyCitationRef}
      onCopyPath={copySourcePath}
    />
  </>;
}
