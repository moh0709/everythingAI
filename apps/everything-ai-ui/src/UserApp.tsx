import { useState } from 'react';
import { apiRequest } from './api';
import type { IndexedFile } from './api';
import type { ScanReport } from './user/scanReportTypes';
import type { UserView, WikiPayload, WikiPage } from './user/types';
import { useAskState } from './user/useAskState';
import { useConnectionActions } from './user/useConnectionActions';
import { useConnectionSettings } from './user/useConnectionSettings';
import { useFileDocumentState } from './user/useFileDocumentState';
import { useFileDocumentWorkflows } from './user/useFileDocumentWorkflows';
import { useFolderSelection } from './user/useFolderSelection';
import { useInitialUserAppRefresh } from './user/useInitialUserAppRefresh';
import { useSetupProgress } from './user/useSetupProgress';
import { useUserActionRunner } from './user/useUserActionRunner';
import { useUserNavigation } from './user/useUserNavigation';
import { useWatcherControls } from './user/useWatcherControls';
import { useWikiState } from './user/useWikiState';
import { useWikiWorkflows } from './user/useWikiWorkflows';
import { UserTopNav } from './user/UserTopNav';
import { WikiView } from './user/WikiView';
import { AskView } from './user/AskView';
import { ExploreView } from './user/ExploreView';
import { OnboardingView } from './user/OnboardingView';

export function UserApp() {
  const {
    baseUrl,
    setBaseUrl,
    token,
    setToken,
    folderPath,
    setFolderPath,
    options,
    saveConnectionSettings,
  } = useConnectionSettings();
  const { setupSteps, markStep } = useSetupProgress();
  const { status, setStatus, error, setError, busy, run } = useUserActionRunner();
  const {
    wiki,
    setWiki,
    selectedWikiPageId,
    selectedWikiPage,
    readingMode,
    setReadingMode,
    activeSourceRef,
    sourceCardRefs,
    selectFirstWikiPage,
    openWikiPage: selectWikiPage,
    handleCitationClick,
  } = useWikiState();
  const {
    files,
    selectedFileId,
    selectedFile,
    documentContext,
    setDocumentContext,
    loadFiles,
    selectFile,
  } = useFileDocumentState();
  const {
    chatInput,
    setChatInput,
    clearChatInput,
    chatMessages,
    addUserMessage,
    addAssistantMessage,
    chatInputRef,
    focusChatInput,
    handleChatSubmit,
  } = useAskState(() => askQuestion());
  const [view, setView] = useState<UserView>('onboarding');
  const [query, setQuery] = useState('');
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);

  const { refreshFiles, searchEverything, loadDocumentContext, revealSourceFile } = useFileDocumentWorkflows({
    options,
    query,
    selectedFileId,
    run,
    loadFiles,
    selectFile,
    setDocumentContext,
    setStatus,
    setView,
  });

  const { refreshWiki, buildWiki } = useWikiWorkflows({
    options,
    selectedWikiPageId,
    run,
    setWiki,
    selectFirstWikiPage,
    setStatus,
    setView,
  });

  const { watcherStatus, refreshWatcherStatus, startWatcher, stopWatcher } = useWatcherControls({
    options,
    folderPath,
    run,
    setStatus,
    setError,
  });

  const { selectFolder } = useFolderSelection({
    options,
    run,
    markStep,
    setFolderPath,
    setStatus,
  });

  const { saveConnection } = useConnectionActions({
    saveConnectionSettings,
    setStatus,
  });

  useInitialUserAppRefresh({ refreshFiles, refreshWiki, refreshWatcherStatus });

  async function buildKnowledgeWorkspace(pathOverride = folderPath) {
    const normalized = pathOverride.trim();
    if (!normalized) {
      setError('Select or enter a folder path first.');
      return;
    }

    await run('Building local knowledge workspace...', async () => {
      localStorage.setItem('everythingai.ui.folderPath', normalized);
      markStep('folder', 'done');
      setScanReport(null);

      markStep('index', 'working');
      const indexPayload = await apiRequest<ScanReport>(options, '/api/index', { folderPath: normalized, auto: true, limit: 1000, useOllama: false }, 'POST');
      setScanReport(indexPayload);
      markStep('index', 'done');

      markStep('extract', 'working');
      await apiRequest(options, '/api/extract', { limit: 1000 }, 'POST');
      markStep('extract', 'done');

      markStep('insights', 'working');
      await apiRequest(options, '/api/insights', { limit: 100, useProvider: true }, 'POST');
      markStep('insights', 'done');

      const wikiPayload = await apiRequest<{ wiki: WikiPayload }>(options, '/api/wiki?limit=500&filePageLimit=50');
      setWiki(wikiPayload.wiki);
      selectFirstWikiPage(wikiPayload.wiki);

      const payload = await apiRequest<{ files: IndexedFile[] }>(options, '/api/files?limit=250');
      loadFiles(payload.files || []);
      if (payload.files?.[0]) await loadDocumentContext(payload.files[0].id, false);

      markStep('ready', 'done');
      setView('wiki');
      setStatus(`Workspace ready with ${payload.files?.length || 0} indexed file(s), ${wikiPayload.wiki.page_count || 0} wiki page(s), and ${indexPayload.skipped || 0} skipped scan item(s).`);
    });
  }

  async function askQuestion(questionText = chatInput) {
    const question = questionText.trim();
    if (!question || busy) return;

    setView('ask');
    clearChatInput();
    setQuery('');

    await run('Asking indexed sources...', async () => {
      addUserMessage(question);
      const payload = await apiRequest<any>(options, '/api/chat', { question, limit: 5 }, 'POST');
      addAssistantMessage(payload.answer || 'No answer returned.', payload.sources || []);
      setStatus(`Answer prepared from ${payload.sources?.length || 0} referenced source(s).`);
    });

    focusChatInput();
  }

  function askAboutWikiPage(page: WikiPage | undefined = selectedWikiPage) {
    if (!page) return;
    askQuestion(`Explain the wiki page "${page.title}" and cite the relevant source documents.`);
  }

  const { openWikiPage, openAskView, handleAskFromHero } = useUserNavigation({
    query,
    setView,
    selectWikiPage,
    focusChatInput,
    askQuestion,
  });

  return <div className={`app ${readingMode ? 'wiki-reading-mode-active' : ''}`}>
    <UserTopNav view={view} setView={setView} openAskView={openAskView} />

    <main className="page">
      {view === 'onboarding' && <OnboardingView
        error={error} busy={busy} status={status}
        setupSteps={setupSteps}
        scanReport={scanReport}
        watcherStatus={watcherStatus}
        folderPath={folderPath} setFolderPath={setFolderPath}
        baseUrl={baseUrl} setBaseUrl={setBaseUrl}
        token={token} setToken={setToken}
        selectFolder={selectFolder}
        buildKnowledgeWorkspace={buildKnowledgeWorkspace}
        startWatcher={startWatcher}
        stopWatcher={stopWatcher}
        refreshWatcherStatus={() => refreshWatcherStatus()}
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
        options={options}
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
