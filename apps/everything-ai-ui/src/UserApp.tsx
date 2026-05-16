import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Brain } from 'lucide-react';
import { apiRequest, ApiOptions } from './api';
import type { IndexedFile } from './api';
import type { UserView, DocumentContext, ChatMessage, WikiPayload, WikiPage, SetupStep } from './user/types';
import { DEFAULT_API, DEFAULT_TOKEN, INITIAL_SETUP_STEPS, updateStep } from './user/userUtils';
import { WikiView } from './user/WikiView';
import { AskView } from './user/AskView';
import { ExploreView } from './user/ExploreView';
import { OnboardingView } from './user/OnboardingView';

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
  const [activeSourceRef, setActiveSourceRef] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const sourceCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  function askAboutWikiPage(page: WikiPage | undefined = selectedWikiPage) {
    if (!page) return;
    askQuestion(`Explain the wiki page "${page.title}" and cite the relevant source documents.`);
  }

  function openWikiPage(pageId: string) {
    setSelectedWikiPageId(pageId);
    setActiveSourceRef(null);
    setView('wiki');
  }

  function handleCitationClick(ref: string) {
    setActiveSourceRef(ref);
    sourceCardRefs.current[ref]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      {view === 'onboarding' && <OnboardingView
        error={error} busy={busy} status={status}
        setupSteps={setupSteps}
        folderPath={folderPath} setFolderPath={setFolderPath}
        baseUrl={baseUrl} setBaseUrl={setBaseUrl}
        token={token} setToken={setToken}
        selectFolder={selectFolder}
        buildKnowledgeWorkspace={buildKnowledgeWorkspace}
        saveConnection={saveConnection}
      />}

      {view === 'explore' && <ExploreView
        error={error} busy={busy} status={status}
        baseUrl={baseUrl} setBaseUrl={setBaseUrl}
        token={token} setToken={setToken}
        query={query} setQuery={setQuery}
        files={files} selectedFile={selectedFile}
        documentContext={documentContext}
        refreshFiles={refreshFiles}
        searchEverything={searchEverything}
        handleAskFromHero={handleAskFromHero}
        loadDocumentContext={(fileId) => loadDocumentContext(fileId)}
        saveConnection={saveConnection}
      />}

      {view === 'wiki' && <WikiView
        error={error} busy={busy} status={status}
        wiki={wiki} selectedWikiPage={selectedWikiPage}
        readingMode={readingMode} activeSourceRef={activeSourceRef}
        sourceCardRefs={sourceCardRefs}
        buildWiki={buildWiki} refreshWiki={refreshWiki}
        setReadingMode={setReadingMode}
        openWikiPage={openWikiPage}
        askAboutWikiPage={askAboutWikiPage}
        revealSourceFile={revealSourceFile}
        openSourceContext={(fileId) => { setView('explore'); loadDocumentContext(fileId); }}
        handleCitationClick={handleCitationClick}
      />}

      {view === 'ask' && <AskView
        error={error} busy={busy} status={status}
        chatMessages={chatMessages}
        chatInput={chatInput} setChatInput={setChatInput}
        chatInputRef={chatInputRef}
        handleChatSubmit={handleChatSubmit}
        askQuestion={askQuestion}
      />}
    </main>
  </div>;
}
