import React, { MutableRefObject } from 'react';
import { BookOpen, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import { WikiNavigationTree } from './WikiNavigationTree';
import { MarkdownArticle } from './wikiMarkdown';
import { filePathHref } from './userUtils';
import type { WikiPage, WikiPayload } from './types';

type WikiViewProps = {
  error: string;
  busy: boolean;
  status: string;
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
  revealSourceFile: (fileId: string) => void;
  openSourceContext: (fileId: string) => void;
  handleCitationClick: (ref: string) => void;
};

export function WikiView({
  error, busy, status, wiki, selectedWikiPage, readingMode, activeSourceRef,
  sourceCardRefs, buildWiki, refreshWiki, setReadingMode, openWikiPage,
  askAboutWikiPage, revealSourceFile, openSourceContext, handleCitationClick,
}: WikiViewProps) {
  return <>
    {error && <div className="error">{error}</div>}
    <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

    <section className="hero-row wiki-hero">
      <div>
        <h1><BookOpen /> Source-backed Wiki</h1>
        <p>Topics are organized by category and subcategory so users can dive into the knowledge base like an encyclopedia.</p>
      </div>
      <div className="hero-actions">
        <button className="purple" onClick={buildWiki} disabled={busy}><Sparkles size={16} /> Build Wiki</button>
        <button className="outline" onClick={refreshWiki} disabled={busy}>Refresh Wiki</button>
        <button className="outline" onClick={() => setReadingMode((v) => !v)} disabled={!selectedWikiPage}>
          {readingMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {readingMode ? 'Exit Reading' : 'Reading Mode'}
        </button>
        <button className="outline" onClick={() => askAboutWikiPage()} disabled={!selectedWikiPage || busy}>Ask about page</button>
      </div>
    </section>

    <section className="wiki-layout">
      <aside className="wiki-sidebar panel">
        <div className="panel-title">
          <div>
            <h2><BookOpen /> Knowledge Map</h2>
            <p>{wiki?.page_count || 0} page(s), grouped by category.</p>
          </div>
        </div>
        {!wiki?.pages.length && <p className="muted">No wiki pages yet. Click Build Wiki after building your knowledge workspace.</p>}
        {wiki?.pages.length ? <WikiNavigationTree pages={wiki.pages} selectedPageId={selectedWikiPage?.id} onSelect={openWikiPage} /> : null}
      </aside>

      <section className="wiki-main panel">
        {selectedWikiPage ? <>
          <div className="wiki-titlebar">
            <div>
              <span className="wiki-page-type">{selectedWikiPage.page_type}</span>
              <h1>{selectedWikiPage.title}</h1>
              <p>{selectedWikiPage.summary}</p>
            </div>
            <button className="outline" onClick={() => askAboutWikiPage(selectedWikiPage)}>Ask about this page</button>
          </div>
          <MarkdownArticle markdown={selectedWikiPage.markdown} pages={wiki?.pages || []} onWikiLink={openWikiPage} onSourceRefClick={handleCitationClick} />
        </> : <p>Select a wiki page.</p>}
      </section>

      <aside className="wiki-source-rail panel">
        {selectedWikiPage ? <>
          <h3>Sources</h3>
          <p className="muted">Source of truth for this article.</p>
          <div className="source-list compact-source-list">
            {selectedWikiPage.sources.map((source) => <div
              className={`source-card wiki-source-card${activeSourceRef === source.ref ? ' wiki-source-card-active' : ''}`}
              key={`${source.ref}-${source.file_id}`}
              ref={(el) => { sourceCardRefs.current[source.ref] = el; }}
            >
              <strong>[{source.ref}] {source.filename || 'Source'}</strong>
              <p>{source.location || 'file-level reference'}</p>
              {source.absolute_path && <a className="source-path-link" href={filePathHref(source.absolute_path)} title="Open source file path" target="_blank" rel="noreferrer">{source.absolute_path}</a>}
              <div className="source-actions">
                {source.file_id && <button className="outline" onClick={() => revealSourceFile(source.file_id as string)}>Reveal in folder</button>}
                {source.file_id && <button className="outline" onClick={() => openSourceContext(source.file_id as string)}>Open source context</button>}
              </div>
            </div>)}
          </div>
        </> : <p>Select a page to inspect sources.</p>}
      </aside>
    </section>
  </>;
}
