import { useState } from 'react';
import { apiRequest } from './api';
import type { IndexedFile } from './api';
import type { ScanReport } from './user/scanReportTypes';
import type { UserView, WikiPayload } from './user/types';
import { useAskState } from './user/useAskState';
import { useAskWorkflows } from './user/useAskWorkflows';
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
import { useWikiPageActions } from './user/useWikiPageActions';
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
  } = useAskState();
  const [view, setView] = useState<UserView>('onboarding');
  const [query, setQuery] = useState('');
  const [scanReport, setScanReport] = useState<ScanReport | null>(null);
  const [exploreReturnWikiPageId, setExploreReturnWikiPageId] = useState<string | null>(null);
  const [recoveryReturnFileId, setRecoveryReturnFileId] = useState<string | null>(null);

  const { refreshFiles, searchEverything, loadDocumentContext: loadDocumentContextWorkflow, revealSourceFile } = useFileDocumentWorkflows({
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

  const { askQuestion, handleChatSubmit } = useAskWorkflows({
    options,
    busy,
    chatInput,
    run,
    setView,
    setQuery,
    clearChatInput,
    addUserMessage,
    addAssistantMessage,
    focusChatInput,
    setStatus,
  });

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
      if (payload.files?.[0]) await loadDocumentContextWorkflow(payload.files[0].id, false);

      markStep('ready', 'done');
      setView('wiki');
      setStatus(`Workspace ready with ${payload.files?.length || 0} indexed file(s), ${wikiPayload.wiki.page_count || 0} wiki page(s), and ${indexPayload.skipped || 0} skipped scan item(s).`);
    });
  }

  const { askAboutWikiPage } = useWikiPageActions({ selectedWikiPage, askQuestion });

  const { openWikiPage, openAskView, handleAskFromHero, openSourceContext } = useUserNavigation({
    query,
    setView,
    selectWikiPage,
    focusChatInput,
    askQuestion,
    loadDocumentContext: loadDocumentContextWorkflow,
  });

  const exploreReturnWikiPage = exploreReturnWikiPageId
    ? wiki?.pages.find((page) => page.id === exploreReturnWikiPageId)
    : undefined;
  const recoveryReturnFile = recoveryReturnFileId
    ? files.find((file) => file.id === recoveryReturnFileId)
    : undefined;

  function openWikiSourceContext(fileId: string) {
    setExploreReturnWikiPageId(selectedWikiPageId || null);
    openSourceContext(fileId);
  }

  function returnToWikiOrigin() {
    const pageId = exploreReturnWikiPageId;
    setExploreReturnWikiPageId(null);
    if (pageId && wiki?.pages.some((page) => page.id === pageId)) {
      openWikiPage(pageId);
      return;
    }
    setView('wiki');
  }

  function openSelectedSourceRecovery() {
    setRecoveryReturnFileId(selectedFileId || null);
    setView('onboarding');
    window.requestAnimationFrame(() => document.getElementById('client-source-root-heading')?.focus());
  }

  function returnToSourceOrigin() {
    const fileId = recoveryReturnFileId;
    const fileStillExists = Boolean(fileId && files.some((file) => file.id === fileId));
    setRecoveryReturnFileId(null);
    setView('explore');
    if (fileId && fileStillExists) loadDocumentContextWorkflow(fileId);
  }

  function handleTopNavView(nextView: UserView) {
    if (nextView === 'explore') setExploreReturnWikiPageId(null);
    setRecoveryReturnFileId(null);
    setView(nextView);
  }

  return <div className={`app ${readingMode ? 'wiki-reading-mode-active' : ''}`}>
    <UserTopNav view={view} setView={handleTopNavView} openAskView={openAskView} />

    <main className="page">
      {view === 'onboarding' && <>
        {recoveryReturnFileId ? <section className="panel" aria-label="Recovery navigation context">
          <div className="panel-title">
            <div>
              <h2>Source inspection context</h2>
              <p>{recoveryReturnFile
                ? `Recovery was opened while inspecting “${recoveryReturnFile.filename}”. The selected file is only the navigation origin; recovery remains scoped to the configured source root.`
                : 'The source that opened recovery is no longer present in the current file list. Recovery remains scoped to the configured source root, and no replacement source is assumed.'}</p>
              <p>The current search query is preserved. Opening this context does not start recovery, scanning, extraction, rebuilding, watcher activity, or file mutation.</p>
            </div>
            <button className="outline" onClick={returnToSourceOrigin}>Back to Sources & Files</button>
          </div>
        </section> : null}
        <OnboardingView
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
        />
      </>}

      {view === 'explore' && <>
        {exploreReturnWikiPageId ? <section className="panel" aria-label="Navigation context">
          <div className="panel-title">
            <div>
              <h2>Knowledge Base context</h2>
              <p>{exploreReturnWikiPage
                ? `This source was opened from “${exploreReturnWikiPage.title}”. Return there without losing the current search query.`
                : 'The Knowledge Base page that opened this source is no longer present. Return to the Knowledge Base without assuming a replacement page.'}</p>
            </div>
            <button className="outline" onClick={returnToWikiOrigin}>Back to Knowledge Base</button>
          </div>
        </section> : null}
        <ExploreView
          error={error} busy={busy} status={status}
          baseUrl={baseUrl} setBaseUrl={setBaseUrl}
          token={token} setToken={setToken}
          query={query} setQuery={setQuery}
          files={files} selectedFile={selectedFile}
          documentContext={documentContext}
          refreshFiles={refreshFiles}
          searchEverything={searchEverything}
          handleAskFromHero={handleAskFromHero}
          loadDocumentContext={(fileId) => loadDocumentContextWorkflow(fileId)}
          saveConnection={saveConnection}
          openSourceRecovery={openSelectedSourceRecovery}
        />
      </>}

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
        openSourceContext={openWikiSourceContext}
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
