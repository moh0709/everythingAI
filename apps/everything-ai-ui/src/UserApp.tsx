import React, { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Brain, CheckCircle2, FileText, FolderOpen, Maximize2, MessageCircle, Minimize2, Search, Send, Server, Sparkles } from 'lucide-react';
import { apiRequest, ApiOptions, IndexedFile } from './api';
import { WikiNavigationTree } from './user/WikiNavigationTree';

const DEFAULT_API = 'http://127.0.0.1:4100';
const DEFAULT_TOKEN = 'replace-with-your-local-development-token';

const EXAMPLE_PROMPTS = [
  'Summarize the latest indexed documents.',
  'What are the most important files in this workspace?',
  'Which files mention planning, invoices, customers, or projects?',
];

type UserView = 'onboarding' | 'explore' | 'wiki' | 'ask';

type SourceReference = {
  file_id?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
  source_type?: string;
  source_label?: string;
};

type DocumentContext = {
  file?: IndexedFile & {
    relative_path?: string;
    recovery_status?: string;
    source_reference?: string;
  };
  previewText?: string;
  insight?: {
    summary?: string;
    classification?: string;
    provider?: string;
  } | null;
  source_reference?: SourceReference;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: Array<{ filename?: string; absolute_path?: string; snippet?: string; score?: number }>;
};

type WikiSource = {
  ref: string;
  file_id?: string;
  filename?: string;
  absolute_path?: string;
  relative_path?: string;
  location?: string;
  evidence?: string;
};

type WikiRelatedPage = {
  id?: string;
  title: string;
  slug?: string;
};

type WikiPage = {
  id: string;
  title: string;
  slug: string;
  page_type: 'system' | 'category' | 'topic' | 'file' | string;
  category?: string;
  subcategory?: string;
  summary: string;
  markdown: string;
  source_file_ids: string[];
  related_topics: string[];
  related_pages?: WikiRelatedPage[];
  sources: WikiSource[];
  updated_at: string;
};

type WikiPayload = {
  generated_at: string;
  page_count: number;
  categories?: WikiRelatedPage[];
  pages: WikiPage[];
};

type SetupStep = {
  id: string;
  label: string;
  status: 'waiting' | 'working' | 'done' | 'failed';
};

const INITIAL_SETUP_STEPS: SetupStep[] = [
  { id: 'folder', label: 'Select folder', status: 'waiting' },
  { id: 'index', label: 'Index local files', status: 'waiting' },
  { id: 'extract', label: 'Extract readable content', status: 'waiting' },
  { id: 'insights', label: 'Generate source insights', status: 'waiting' },
  { id: 'ready', label: 'Workspace ready', status: 'waiting' },
];

function formatSize(bytes = 0) {
  if (!bytes) return '0 Bytes';
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function filePathHref(filePath = '') {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/');
  const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `file://${encodeURI(prefixed)}`;
}

function updateStep(steps: SetupStep[], id: string, status: SetupStep['status']) {
  return steps.map((step) => step.id === id ? { ...step, status } : step);
}

function findWikiPageByLabel(pages: WikiPage[], label: string) {
  const normalized = label.trim().toLowerCase();
  return pages.find((page) => page.title.toLowerCase() === normalized)
    || pages.find((page) => page.slug.toLowerCase() === normalized.replace(/\s+/g, '-'))
    || pages.find((page) => page.title.toLowerCase().includes(normalized));
}

function renderInlineMarkdown(text: string, pages: WikiPage[] = [], onWikiLink?: (pageId: string) => void): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\[.+?\]\]|\[S\d+\])/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const label = part.slice(2, -2);
      const page = findWikiPageByLabel(pages, label);
      if (page && onWikiLink) {
        return <button key={index} type="button" className="wiki-inline-link" onClick={() => onWikiLink(page.id)}>{label}</button>;
      }
      return <span key={index} className="wiki-link">{label}</span>;
    }
    if (/^\[S\d+\]$/.test(part)) return <sup key={index} className="wiki-source-ref">{part}</sup>;
    return part;
  });
}

function parseTable(lines: string[], startIndex: number) {
  const tableLines: string[] = [];
  let index = startIndex;
  while (index < lines.length && lines[index].trim().startsWith('|')) {
    tableLines.push(lines[index]);
    index += 1;
  }
  const rows = tableLines
    .filter((line) => !/^\|\s*-+/.test(line.trim()))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
  const [headers = [], ...body] = rows;
  return { headers, body, nextIndex: index };
}

function MarkdownArticle({ markdown, pages, onWikiLink }: { markdown: string; pages?: WikiPage[]; onWikiLink?: (pageId: string) => void }) {
  const lines = markdown.split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed.startsWith('|')) {
      const table = parseTable(lines, index);
      nodes.push(<table key={`table-${index}`} className="wiki-table">
        <thead><tr>{table.headers.map((header, headerIndex) => <th key={headerIndex}>{renderInlineMarkdown(header, pages, onWikiLink)}</th>)}</tr></thead>
        <tbody>{table.body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{renderInlineMarkdown(cell, pages, onWikiLink)}</td>)}</tr>)}</tbody>
      </table>);
      index = table.nextIndex;
      continue;
    }

    if (line.startsWith('# ')) nodes.push(<h1 key={index}>{renderInlineMarkdown(line.slice(2), pages, onWikiLink)}</h1>);
    else if (line.startsWith('## ')) nodes.push(<h2 key={index}>{renderInlineMarkdown(line.slice(3), pages, onWikiLink)}</h2>);
    else if (line.startsWith('### ')) nodes.push(<h3 key={index}>{renderInlineMarkdown(line.slice(4), pages, onWikiLink)}</h3>);
    else if (line.startsWith('- ')) nodes.push(<li key={index}>{renderInlineMarkdown(line.slice(2), pages, onWikiLink)}</li>);
    else if (line.startsWith('> ')) nodes.push(<blockquote key={index}>{renderInlineMarkdown(line.slice(2), pages, onWikiLink)}</blockquote>);
    else if (!line.trim()) nodes.push(<br key={index} />);
    else nodes.push(<p key={index}>{renderInlineMarkdown(line, pages, onWikiLink)}</p>);
    index += 1;
  }

  return <article className="wiki-article">{nodes}</article>;
}

export function UserApp() {
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem('everythingai.ui.baseUrl') || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem('everythingai.ui.token') || DEFAULT_TOKEN);
  const [view, setView] = useState<UserView>('onboarding');
  const [folderPath, setFolderPath] = useState(localStorage.getItem('everythingai.ui.folderPath') || '');
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>(INITIAL_SETUP_STEPS);
  const [query, setQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [files, setFiles] = useState<IndexedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [wiki, setWiki] = useState<WikiPayload | null>(null);
  const [selectedWikiPageId, setSelectedWikiPageId] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  const options: ApiOptions = useMemo(() => ({ baseUrl, token }), [baseUrl, token]);
  const selectedFile = files.find((file) => file.id === selectedFileId) || files[0];
  const selectedWikiPage = wiki?.pages.find((page) => page.id === selectedWikiPageId) || wiki?.pages[0];

  function saveConnection() {
    localStorage.setItem('everythingai.ui.baseUrl', baseUrl);
    localStorage.setItem('everythingai.ui.token', token);
    localStorage.setItem('everythingai.ui.folderPath', folderPath);
    setStatus('Connection settings saved.');
  }

  function markStep(id: string, statusValue: SetupStep['status']) {
    setSetupSteps((current) => updateStep(current, id, statusValue));
  }

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setStatus(label);
    try {
      await task();
    } catch (err: any) {
      setError(err.message || String(err));
      setStatus('Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function refreshFiles() {
    await run('Loading indexed files...', async () => {
      const payload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      setFiles(payload.files || []);
      if (!selectedFileId && payload.files?.[0]) setSelectedFileId(payload.files[0].id);
      if (payload.files?.length) setView((current) => current === 'onboarding' ? 'explore' : current);
      setStatus(`Loaded ${payload.files?.length || 0} file(s).`);
    });
  }

  async function refreshWiki() {
    await run('Loading source-backed wiki pages...', async () => {
      const payload = await apiRequest<{ wiki: WikiPayload }>(options, '/api/wiki?limit=500&filePageLimit=50');
      setWiki(payload.wiki);
      if (!selectedWikiPageId && payload.wiki.pages[0]) setSelectedWikiPageId(payload.wiki.pages[0].id);
      setStatus(`Loaded ${payload.wiki.page_count || 0} wiki page(s).`);
    });
  }

  async function buildWiki() {
    await run('Building source-backed wiki pages...', async () => {
      const payload = await apiRequest<{ wiki: WikiPayload }>(options, '/api/wiki/build', { limit: 500, filePageLimit: 50, useProvider: true }, 'POST');
      setWiki(payload.wiki);
      if (payload.wiki.pages[0]) setSelectedWikiPageId(payload.wiki.pages[0].id);
      setView('wiki');
      setStatus(`Built ${payload.wiki.page_count || 0} source-backed wiki page(s).`);
    });
  }

  async function selectFolder() {
    await run('Opening folder picker...', async () => {
      markStep('folder', 'working');
      const result = await apiRequest<{ folderPath?: string; cancelled?: boolean }>(options, '/api/select-folder', {}, 'POST');
      if (result.cancelled || !result.folderPath) {
        markStep('folder', 'waiting');
        setStatus('Folder selection cancelled.');
        return;
      }
      setFolderPath(result.folderPath);
      localStorage.setItem('everythingai.ui.folderPath', result.folderPath);
      markStep('folder', 'done');
      setStatus(`Folder selected: ${result.folderPath}`);
    });
  }

  async function buildKnowledgeWorkspace(pathOverride = folderPath) {
    const normalized = pathOverride.trim();
    if (!normalized) {
      setError('Select or enter a folder path first.');
      return;
    }

    await run('Building local knowledge workspace...', async () => {
      localStorage.setItem('everythingai.ui.folderPath', normalized);
      markStep('folder', 'done');

      markStep('index', 'working');
      await apiRequest(options, '/api/index', { folderPath: normalized, auto: true, limit: 1000, useOllama: false }, 'POST');
      markStep('index', 'done');

      markStep('extract', 'working');
      await apiRequest(options, '/api/extract', { limit: 1000 }, 'POST');
      markStep('extract', 'done');

      markStep('insights', 'working');
      await apiRequest(options, '/api/insights', { limit: 100, useProvider: true }, 'POST');
      markStep('insights', 'done');

      const wikiPayload = await apiRequest<{ wiki: WikiPayload }>(options, '/api/wiki?limit=500&filePageLimit=50');
      setWiki(wikiPayload.wiki);
      if (wikiPayload.wiki.pages[0]) setSelectedWikiPageId(wikiPayload.wiki.pages[0].id);

      const payload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      setFiles(payload.files || []);
      if (payload.files?.[0]) {
        setSelectedFileId(payload.files[0].id);
        await loadDocumentContext(payload.files[0].id, false);
      }

      markStep('ready', 'done');
      setView('wiki');
      setStatus(`Workspace ready with ${payload.files?.length || 0} indexed file(s) and ${wikiPayload.wiki.page_count || 0} wiki page(s).`);
    });
  }

  async function searchEverything() {
    await run('Searching EverythingAI...', async () => {
      const normalized = query.trim();
      if (!normalized) {
        await refreshFiles();
        return;
      }
      const payload = await apiRequest<any>(options, `/api/unified-search?q=${encodeURIComponent(normalized)}&limit=50`);
      setFiles(payload.files || []);
      if (payload.files?.[0]) {
        setSelectedFileId(payload.files[0].id);
        await loadDocumentContext(payload.files[0].id, false);
      }
      setStatus(`Search complete: ${payload.files?.length || 0} file match(es).`);
    });
  }

  async function loadDocumentContext(fileId: string, wrap = true) {
    const task = async () => {
      const payload = await apiRequest<{ document: DocumentContext }>(options, `/api/intelligence/document-context/${fileId}`);
      setSelectedFileId(fileId);
      setDocumentContext(payload.document);
      setStatus(`Context loaded: ${payload.document.file?.filename || fileId}`);
    };

    if (wrap) await run('Loading document context...', task);
    else await task();
  }

  async function revealSourceFile(fileId: string) {
    await run('Opening source file location...', async () => {
      await apiRequest(options, `/api/files/${fileId}/reveal`, {}, 'POST');
      setStatus('Source file location opened.');
    });
  }

  async function askQuestion(questionText = chatInput) {
    const question = questionText.trim();
    if (!question || busy) return;

    setView('ask');
    setChatInput('');
    setQuery('');

    await run('Asking indexed sources...', async () => {
      setChatMessages((current) => [...current, { role: 'user', text: question }]);
      const payload = await apiRequest<any>(options, '/api/chat', { question, limit: 5 }, 'POST');
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: payload.answer || 'No answer returned.',
        sources: payload.sources || [],
      }]);
      setStatus(`Answer prepared from ${payload.sources?.length || 0} referenced source(s).`);
    });

    chatInputRef.current?.focus();
  }

  function askAboutWikiPage(page = selectedWikiPage) {
    if (!page) return;
    askQuestion(`Explain the wiki page "${page.title}" and cite the relevant source documents.`);
  }

  function openWikiPage(pageId: string) {
    setSelectedWikiPageId(pageId);
    setView('wiki');
  }

  function openAskView() {
    setView('ask');
    setTimeout(() => chatInputRef.current?.focus(), 0);
  }

  function handleAskFromHero() {
    const question = query.trim();
    if (question) {
      askQuestion(question);
      return;
    }
    openAskView();
  }

  function handleChatSubmit(event: FormEvent) {
    event.preventDefault();
    askQuestion();
  }

  useEffect(() => {
    refreshFiles().catch(() => undefined);
    refreshWiki().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className={`app ${readingMode ? 'wiki-reading-mode-active' : ''}`}>
    <header className="top-nav">
      <div className="brand"><Brain size={28} /><strong>EverythingAI</strong></div>
      <nav>
        <button className={view === 'onboarding' ? 'active' : ''} onClick={() => setView('onboarding')}>Start</button>
        <button className={view === 'explore' ? 'active' : ''} onClick={() => setView('explore')}>Explore</button>
        <button className={view === 'wiki' ? 'active' : ''} onClick={() => setView('wiki')}>Wiki</button>
        <button className={view === 'ask' ? 'active' : ''} onClick={openAskView}>Ask</button>
      </nav>
      <div className="provider-pill"><span />User MVP • Safe mode</div>
    </header>

    <main className="page">
      {view === 'onboarding' && <>
        <section className="hero-row">
          <div>
            <h1><FolderOpen /> Connect your local knowledge</h1>
            <p>Select a folder and EverythingAI will index, extract, analyze, and prepare it for search, wiki pages, and chat. This user UI remains read-only and safe.</p>
          </div>
          <div className="hero-actions">
            <button className="purple" onClick={selectFolder} disabled={busy}><FolderOpen size={16} /> Select Folder</button>
            <button className="outline" onClick={() => buildKnowledgeWorkspace()} disabled={busy || !folderPath.trim()}><Sparkles size={16} /> Build Knowledge</button>
          </div>
        </section>

        {error && <div className="error">{error}</div>}
        <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2><CheckCircle2 /> Setup Progress</h2>
              <p>After setup, you can search files, read wiki pages, and ask source-backed questions.</p>
            </div>
          </div>
          <div className="source-list compact-source-list">
            {setupSteps.map((step) => <div className="source-card" key={step.id}>
              <strong>{step.label}</strong>
              <p>{step.status === 'done' ? 'Completed' : step.status === 'working' ? 'Working...' : step.status === 'failed' ? 'Failed' : 'Waiting'}</p>
            </div>)}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2><Server /> Connection & Folder</h2>
              <p>Use defaults for local development, or adjust if your backend runs elsewhere.</p>
            </div>
            <button className="outline" onClick={saveConnection}>Save</button>
          </div>
          <div className="settings-grid">
            <label>API Base URL<input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} /></label>
            <label>API Token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} /></label>
            <label>Folder Path<input value={folderPath} onChange={(event) => setFolderPath(event.target.value)} placeholder="C:\\Users\\MOH\\Documents" /></label>
          </div>
        </section>
      </>}

      {view === 'explore' && <>
        <section className="hero-row">
          <div>
            <h1><Search /> Explore your indexed knowledge</h1>
            <p>Search, ask questions, and inspect source-backed file context. Planning, moving, recovery, and audit controls are reserved for the admin/operator interface.</p>
          </div>
          <div className="hero-actions">
            <div className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchEverything(); }} placeholder="Search or ask about your files..." />
            </div>
            <button className="purple" onClick={searchEverything} disabled={busy}>Search</button>
            <button className="outline" onClick={handleAskFromHero} disabled={busy}>Ask AI</button>
          </div>
        </section>

        {error && <div className="error">{error}</div>}
        <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2><Server /> Connection</h2>
              <p>Official user UI runs on port 5151. Backend API stays on port 4100.</p>
            </div>
            <button className="outline" onClick={saveConnection}>Save</button>
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
                <h2><FileText /> Files</h2>
                <p>{files.length} visible file(s). This UI only reads and searches indexed knowledge.</p>
              </div>
              <button className="outline" onClick={refreshFiles} disabled={busy}>Refresh</button>
            </div>
            <table>
              <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th></tr></thead>
              <tbody>{files.map((file) => <tr key={file.id} onClick={() => loadDocumentContext(file.id)} className={selectedFile?.id === file.id ? 'selected' : ''}>
                <td>{file.filename}</td>
                <td><span className="chip blue">{file.extension || 'file'}</span></td>
                <td>{formatSize(file.size_bytes)}</td>
                <td>{file.extraction_status || file.index_status || 'indexed'}</td>
              </tr>)}</tbody>
            </table>
          </div>

          <aside className="details">
            <h2>{documentContext?.file?.filename || selectedFile?.filename || 'Select a file'}</h2>
            {documentContext ? <>
              <p><strong>Path:</strong> {documentContext.file?.absolute_path}</p>
              <p><strong>Recovery:</strong> {(documentContext.file as any)?.recovery_status || 'active'}</p>
              <p><strong>Extraction:</strong> {documentContext.file?.extraction_status || 'unknown'}</p>
              <p><strong>Source:</strong> {documentContext.source_reference?.source_label || documentContext.source_reference?.relative_path || 'local file'}</p>
              {documentContext.insight?.summary && <><h3>Insight</h3><p>{documentContext.insight.summary}</p></>}
              <h3>Preview Text</h3>
              <div className="preview-box text-preview">{documentContext.previewText || 'No preview text available.'}</div>
            </> : <p>Select a file to inspect source-backed context.</p>}
          </aside>
        </section>
      </>}

      {view === 'wiki' && <>
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
            <button className="outline" onClick={() => setReadingMode((value) => !value)} disabled={!selectedWikiPage}>
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
              <MarkdownArticle markdown={selectedWikiPage.markdown} pages={wiki?.pages || []} onWikiLink={openWikiPage} />
            </> : <p>Select a wiki page.</p>}
          </section>

          <aside className="wiki-source-rail panel">
            {selectedWikiPage ? <>
              <h3>Sources</h3>
              <p className="muted">Source of truth for this article.</p>
              <div className="source-list compact-source-list">
                {selectedWikiPage.sources.map((source) => <div className="source-card wiki-source-card" key={`${source.ref}-${source.file_id}`}>
                  <strong>[{source.ref}] {source.filename || 'Source'}</strong>
                  <p>{source.location || 'file-level reference'}</p>
                  {source.absolute_path && <a className="source-path-link" href={filePathHref(source.absolute_path)} title="Open source file path" target="_blank" rel="noreferrer">{source.absolute_path}</a>}
                  <div className="source-actions">
                    {source.file_id && <button className="outline" onClick={() => revealSourceFile(source.file_id as string)}>Reveal in folder</button>}
                    {source.file_id && <button className="outline" onClick={() => { setView('explore'); loadDocumentContext(source.file_id as string); }}>Open source context</button>}
                  </div>
                </div>)}
              </div>
            </> : <p>Select a page to inspect sources.</p>}
          </aside>
        </section>
      </>}

      {view === 'ask' && <>
        {error && <div className="error">{error}</div>}
        <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

        <section className="askai-view">
          <div className="askai-header">
            <h1><MessageCircle /> Ask EverythingAI</h1>
            <p>Ask source-backed questions across indexed local knowledge. Answers are generated through the configured local provider.</p>
            <span className="chip blue"><Sparkles size={14} /> Source-backed chat</span>
          </div>

          <div className="chat-messages">
            {!chatMessages.length && <div className="chat-empty">
              <MessageCircle size={48} />
              <h2>Ask a question about your indexed workspace</h2>
              <p>EverythingAI will answer using extracted local file context when sources are available.</p>
              <div className="chat-suggestions">
                {EXAMPLE_PROMPTS.map((prompt) => <button key={prompt} className="suggestion-chip" onClick={() => askQuestion(prompt)} disabled={busy}>{prompt}</button>)}
              </div>
            </div>}

            {chatMessages.map((message, index) => <article key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
              <strong>{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'EverythingAI' : 'Error'}</strong>
              <p>{message.text}</p>
              {!!message.sources?.length && <div className="chat-sources">
                {message.sources.map((source, sourceIndex) => <div key={`${source.filename}-${sourceIndex}`} className="chat-source-item">
                  <span className="source-filename">{source.filename || 'Source'}</span>
                  {source.absolute_path && <span className="source-path">{source.absolute_path}</span>}
                  {typeof source.score === 'number' && <span className="source-tag">Score: {source.score.toFixed(3)}</span>}
                  {source.snippet && <span className="source-snippet">{source.snippet}</span>}
                </div>)}
              </div>}
            </article>)}

            {busy && <article className="chat-bubble assistant thinking"><strong>EverythingAI</strong><p>Thinking<span className="dots">...</span></p></article>}
          </div>

          <form className="chat-input-row" onSubmit={handleChatSubmit}>
            <textarea ref={chatInputRef} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about indexed files, source context, documents, or extracted knowledge..." rows={2} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); askQuestion(); } }} />
            <button type="submit" disabled={busy || !chatInput.trim()}><Send size={16} /> Ask</button>
          </form>
        </section>
      </>}
    </main>
  </div>;
}
