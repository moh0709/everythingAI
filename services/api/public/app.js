const state = {
  files: [],
  suggestions: [],
  planSuggestions: [],
  unifiedResults: null,
  busyCount: 0,
  activityLog: [],
};

const els = {
  views: document.querySelectorAll('.view'),
  viewButtons: document.querySelectorAll('[data-view-target]'),
  token: document.querySelector('#token'),
  folderPath: document.querySelector('#folderPath'),
  query: document.querySelector('#query'),
  files: document.querySelector('#files'),
  suggestions: document.querySelector('#suggestions'),
  planTree: document.querySelector('#planTree'),
  planActions: document.querySelector('#planActions'),
  insights: document.querySelector('#insights'),
  log: document.querySelector('#log'),
  answer: document.querySelector('#answer'),
  providerStatus: document.querySelector('#providerStatus'),
  activityStatus: document.querySelector('#activityStatus'),
  activityDetails: document.querySelector('#activityDetails'),
  errorPanel: document.querySelector('#errorPanel'),
  errorMessage: document.querySelector('#errorMessage'),
  providerSettingsDialog: document.querySelector('#providerSettingsDialog'),
  providerSettingsStatus: document.querySelector('#providerSettingsStatus'),
  providerSelect: document.querySelector('#providerSelect'),
  ollamaBaseUrl: document.querySelector('#ollamaBaseUrl'),
  ollamaModel: document.querySelector('#ollamaModel'),
  ollamaTimeoutMs: document.querySelector('#ollamaTimeoutMs'),
  ollamaNumPredict: document.querySelector('#ollamaNumPredict'),
  settingsStatus: document.querySelector('#settingsStatus'),
  statusGrid: document.querySelector('#statusGrid'),
  pipelineSteps: document.querySelectorAll('[data-pipeline-step]'),
  activityTimeline: document.querySelector('#activityTimeline'),
  auditTrail: document.querySelector('#auditTrail'),
};

function showView(viewId) {
  els.views.forEach((view) => {
    view.classList.toggle('active', view.id === viewId);
  });
  els.viewButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.viewTarget === viewId);
  });
}

function setActivity(status, details = '', tone = 'ready') {
  els.activityStatus.textContent = status;
  els.activityDetails.textContent = details;
  els.activityStatus.closest('.activity-banner').dataset.tone = tone;
  state.activityLog.unshift({
    status,
    details,
    tone,
    at: new Date().toISOString(),
  });
  renderActivityTimeline();
}

function updatePipeline(activeStep) {
  const order = ['intake', 'scan', 'plan', 'review', 'approve'];
  const activeIndex = order.indexOf(activeStep);
  els.pipelineSteps.forEach((step) => {
    const stepIndex = order.indexOf(step.dataset.pipelineStep);
    step.classList.toggle('active', step.dataset.pipelineStep === activeStep);
    step.classList.toggle('complete', activeIndex > stepIndex);
  });
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function safeValue(value, fallback = '') {
  return String(value ?? fallback)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderActivityTimeline(items = state.activityLog) {
  if (!els.activityTimeline) return;

  els.activityTimeline.innerHTML = items.slice(0, 12).map((item) => `
    <article class="activity-row" data-tone="${safeValue(item.tone)}">
      <span></span>
      <div>
        <strong>${safeValue(item.status)}</strong>
        <p>${safeValue(item.details)}</p>
        <small>${new Date(item.at).toLocaleString()}</small>
      </div>
    </article>
  `).join('') || '<p class="muted">No activity yet. Select a folder to start.</p>';
}

function showError(error) {
  const message = error?.message || String(error);
  els.errorMessage.textContent = message;
  els.errorPanel.hidden = false;
  setActivity('Failed', message, 'error');
  log({ error: message, execution: error?.execution || null });
}

function clearError() {
  els.errorPanel.hidden = true;
  els.errorMessage.textContent = '';
}

async function withUiState({ button, working = 'Working', details = 'Operation in progress...' }, task) {
  const previousLabel = button?.textContent;
  state.busyCount += 1;
  clearError();
  setActivity(working, details, 'working');
  updatePipeline('scan');

  if (button) {
    button.disabled = true;
    button.textContent = 'Working...';
  }

  try {
    const result = await task();
    return result;
  } catch (error) {
    showError(error);
    throw error;
  } finally {
    state.busyCount -= 1;
    if (button) {
      button.disabled = false;
      button.textContent = previousLabel;
    }
  }
}

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem('everythingai.settings') || '{}');
  if (saved.token) els.token.value = saved.token;
  if (saved.folderPath) els.folderPath.value = saved.folderPath;
}

function saveSettings() {
  localStorage.setItem('everythingai.settings', JSON.stringify({
    token: els.token.value,
    folderPath: els.folderPath.value,
  }));
  els.settingsStatus.textContent = 'Saved';
}

function log(value) {
  els.log.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (els.auditTrail) {
    els.auditTrail.textContent = els.log.textContent;
  }
}

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${els.token.value}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `Request failed: ${response.status}`);
    if (payload.execution) error.execution = payload.execution;
    throw error;
  }

  return payload;
}

function renderFiles(files) {
  state.files = files;
  els.files.innerHTML = files.map((file) => `
    <article class="card file-card">
      <div class="card-title">
        <h3>${safeValue(file.filename)}</h3>
        <span class="pill">${safeValue(file.extension || 'file')}</span>
      </div>
      <p class="muted">${safeValue(file.absolute_path)}</p>
      <div class="file-state">
        <span>Index: <strong>${safeValue(file.index_status)}</strong></span>
        <span>Extraction: <strong>${safeValue(file.extraction_status || 'pending')}</strong></span>
        <span>Recovery: <strong>${safeValue(file.recovery_status || 'normal')}</strong></span>
      </div>
      <div class="actions">
        <button class="secondary" data-preview-file="${safeValue(file.id)}">Preview</button>
        <button data-suggest="${safeValue(file.id)}">Add to Plan</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No files indexed yet.</p>';
}

function renderSuggestions(suggestions) {
  state.suggestions = suggestions;
  els.suggestions.innerHTML = suggestions.map((suggestion) => `
    <article class="card action-card" data-risk="${safeValue(suggestion.risk_level || 'unknown')}">
      <div class="card-title">
        <h3>${safeValue(suggestion.suggested_value)}</h3>
        <span class="pill">${safeValue(suggestion.action_type)}</span>
      </div>
      <p>${safeValue(suggestion.reason)}</p>
      <div class="confidence-meter" style="--confidence: ${Math.min(100, Math.max(0, Math.round(Number(suggestion.confidence || 0) * 100)))}%">
        <span></span>
      </div>
      <p class="muted">Risk: ${safeValue(suggestion.risk_level)} | Confidence: ${formatPercent(suggestion.confidence)}</p>
      <div class="actions">
        <button class="secondary" data-preview="${safeValue(suggestion.id)}">Safe Preview</button>
        <button class="secondary danger-disabled" disabled>Delete Disabled</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No organize suggestions yet. Select a folder, scan it, then generate an organization plan.</p>';
}

function groupPlanSuggestions(suggestions) {
  return suggestions.reduce((groups, suggestion) => {
    const folder = suggestion.action_type === 'move'
      ? suggestion.suggested_value
      : suggestion.action_type === 'category'
        ? suggestion.suggested_value
        : 'metadata';
    const group = groups.get(folder) || [];
    group.push(suggestion);
    groups.set(folder, group);
    return groups;
  }, new Map());
}

function renderPlan(suggestions) {
  state.planSuggestions = suggestions;
  const groups = groupPlanSuggestions(suggestions);

  els.planTree.innerHTML = Array.from(groups.entries()).map(([folder, items]) => `
    <article class="tree-node">
      <div class="card-title">
        <strong>${safeValue(folder)}</strong>
        <span class="pill">${items.length} actions</span>
      </div>
      <ul>
        ${items.slice(0, 6).map((item) => `
          <li><strong>${safeValue(item.action_type)}</strong> ${safeValue(item.filename || item.file_id)} -> ${safeValue(item.suggested_value)}</li>
        `).join('')}
      </ul>
    </article>
  `).join('') || '<p class="muted">No plan yet. Select a folder and run Scan and Plan.</p>';

  els.planActions.innerHTML = suggestions.map((suggestion) => `
    <article class="card action-card">
      <div class="card-title">
        <h3>${safeValue(suggestion.filename || suggestion.file_id)}</h3>
        <span class="pill">${safeValue(suggestion.action_type)}</span>
      </div>
      <p><strong>${safeValue(suggestion.suggested_value)}</strong></p>
      <p>${safeValue(suggestion.reason)}</p>
      <div class="confidence-meter" style="--confidence: ${Math.min(100, Math.max(0, Math.round(Number(suggestion.confidence || 0) * 100)))}%">
        <span></span>
      </div>
      <p class="muted">Risk: ${safeValue(suggestion.risk_level)} | Confidence: ${formatPercent(suggestion.confidence)}</p>
      <div class="actions">
        <button class="secondary" data-preview="${safeValue(suggestion.id)}">Safe Preview</button>
        <button class="secondary danger-disabled" disabled>Delete Disabled</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No actions ready for preview.</p>';

  updatePipeline(suggestions.length ? 'plan' : 'intake');
}

function renderInsights(insights) {
  els.insights.innerHTML = insights.map((insight) => `
    <article class="card">
      <h3>${safeValue(insight.filename)}</h3>
      <p><strong>${safeValue(insight.classification)}</strong></p>
      <p>${safeValue(insight.summary)}</p>
      <p class="muted">Provider: ${safeValue(insight.provider)}</p>
    </article>
  `).join('') || '<p class="muted">No insights generated yet.</p>';
}

function renderStatus(payload) {
  const status = payload.status;
  const metrics = [
    ['Files', status.total_files],
    ['Indexed', status.indexed_files],
    ['Extracted', status.extracted_files],
    ['Searchable', status.searchable_files],
    ['Embedded', status.embedded_files],
    ['Insights', status.insight_files],
    ['Suggestions', status.suggestions],
    ['Actions', status.executions],
    ['Labels', status.labeled_files],
    ['Watchers', status.active_watch_roots],
    ['Failures', status.failed_files + status.failed_extractions],
    ['Last indexed', status.last_indexed_at ? new Date(status.last_indexed_at).toLocaleString() : 'Never'],
  ];

  els.providerStatus.textContent = payload.provider.model
    ? `${payload.provider.chat}: ${payload.provider.model}`
    : `${payload.provider.chat}: model not set`;

  els.statusGrid.innerHTML = metrics.map(([label, value]) => `
    <article class="metric">
      <span>${safeValue(label)}</span>
      <strong>${safeValue(value)}</strong>
    </article>
  `).join('');
}

function renderUnifiedResults(payload) {
  state.unifiedResults = payload;
  renderFiles(payload.files);
  renderPlan(payload.suggestions);
  renderSuggestions(payload.suggestions);

  const sections = [
    ['Keyword files', payload.files, (item) => `${item.filename}\n${item.absolute_path}`],
    ['Semantic files', payload.semantic, (item) => `${item.filename}\n${item.absolute_path}`],
    ['Knowledge', payload.insights, (item) => `${item.filename}: ${item.classification}\n${item.summary}`],
    ['Labels', payload.labels, (item) => `${item.filename}: ${(item.tags || []).join(', ')} ${item.category || ''}`],
    ['Executions', payload.executions, (item) => `${item.action_type} ${item.status}: ${item.filename || item.file_id}`],
  ];

  els.insights.innerHTML = sections.map(([title, items, format]) => `
    <article class="card">
      <div class="card-title">
        <h3>${title}</h3>
        <span class="pill">${items.length}</span>
      </div>
      <pre>${safeValue(items.map(format).join('\n\n') || 'No matches.')}</pre>
    </article>
  `).join('');

  log({ query: payload.query, totals: payload.totals });
}

function renderDocumentContextText(documentContext) {
  const file = documentContext.file || {};
  const sourceReference = documentContext.source_reference || {};
  const insight = documentContext.insight || {};

  return [
    file.filename || 'Unknown file',
    file.absolute_path || '',
    '',
    `Recovery status: ${file.recovery_status || 'unknown'}`,
    `Index status: ${file.index_status || 'unknown'}`,
    `Extraction status: ${file.extraction_status || 'unknown'}`,
    file.extraction_error_message ? `Extraction error: ${file.extraction_error_message}` : '',
    '',
    `Source reference: ${sourceReference.source_label || sourceReference.relative_path || 'not available'}`,
    sourceReference.source_type ? `Source type: ${sourceReference.source_type}` : '',
    '',
    insight.summary ? `Insight: ${insight.summary}` : 'Insight: No insight yet.',
    '',
    documentContext.previewText || 'No extracted preview text available.',
  ].filter((line) => line !== '').join('\n');
}

function renderProviderSettings(settings) {
  els.providerSelect.value = settings.provider || 'ollama';
  els.ollamaBaseUrl.value = settings.ollama?.baseUrl || 'http://127.0.0.1:11434';
  els.ollamaModel.value = settings.ollama?.model || '';
  els.ollamaTimeoutMs.value = settings.ollama?.timeoutMs || 120000;
  els.ollamaNumPredict.value = settings.ollama?.numPredict || 192;
}

async function refreshProviderSettings() {
  const payload = await api('/api/provider-settings');
  renderProviderSettings(payload.settings);
  return payload.settings;
}

async function refreshStatus() {
  const payload = await api('/api/status');
  renderStatus(payload);
}

async function refreshFiles() {
  const payload = await api('/api/files?limit=50');
  renderFiles(payload.files);
  log(`Loaded ${payload.files.length} file(s).`);
}

async function refreshPlan() {
  const payload = await api('/api/suggestions?limit=250');
  renderPlan(payload.suggestions);
  return payload.suggestions;
}

async function refreshDashboard() {
  await Promise.all([
    refreshStatus(),
    refreshFiles(),
  ]);
}

async function runAutoIndex(folderPath, button = document.querySelector('#indexBtn')) {
  return withUiState({
    button,
    working: 'Working',
    details: 'Indexing files, extracting text, creating embeddings, saving knowledge, and preparing organization suggestions...',
  }, async () => {
    const result = await api('/api/index', {
      method: 'POST',
      body: { folderPath, auto: true },
    });
    await refreshDashboard();
    const suggestions = await refreshPlan();
    renderSuggestions(suggestions);
    setActivity(
      'Ready',
      `Processed ${result.indexed || 0} file(s). Knowledge, semantic search, and ${suggestions.length} organization suggestion(s) are ready.`,
      'success',
    );
    updatePipeline('plan');
    showView('planView');
    log(result);
    return result;
  });
}

document.querySelector('#indexBtn').addEventListener('click', async (event) => {
  await runAutoIndex(els.folderPath.value, event.currentTarget);
});

async function buildKnowledge(button) {
  return withUiState({
    button,
    working: 'Working',
    details: 'Building knowledge from extracted files and saved insights...',
  }, async () => {
    const buildPayload = await api('/api/knowledge/build', {
      method: 'POST',
      body: { limit: 500 },
    });
    const payload = buildPayload.knowledge;
    els.insights.innerHTML = [
      ...payload.classifications.map((item) => `
        <article class="card">
          <h3>Category: ${item.name}</h3>
          <pre>${item.files.map((file) => `${file.filename}: ${file.summary}`).join('\n\n')}</pre>
        </article>
      `),
      ...payload.entities.map((item) => `
        <article class="card">
          <h3>Entity: ${item.name}</h3>
          <pre>${item.files.map((file) => `${file.filename} (${file.classification})`).join('\n')}</pre>
        </article>
      `),
    ].join('') || '<p class="muted">No knowledge yet. Add a folder with readable documents first.</p>';
    log({
      generated_insights: buildPayload.generated,
      entities: payload.entity_count,
      classifications: payload.classification_count,
    });
    setActivity('Ready', `Knowledge built: ${payload.classification_count} categories and ${payload.entity_count} entities.`, 'success');
    await refreshStatus();
    showView('knowledgeView');
  });
}

document.querySelector('#saveSettingsBtn').addEventListener('click', saveSettings);

document.querySelector('#clearSettingsBtn').addEventListener('click', () => {
  localStorage.removeItem('everythingai.settings');
  els.settingsStatus.textContent = 'Cleared';
});

document.querySelector('#dismissErrorBtn').addEventListener('click', clearError);

document.querySelector('#extractBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Extracting readable document text...',
  }, async () => {
    log(await api('/api/extract', { method: 'POST', body: {} }));
    await refreshStatus();
    setActivity('Ready', 'Text extraction complete.', 'success');
    updatePipeline('scan');
  });
});

document.querySelector('#embeddingsBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Generating semantic search embeddings...',
  }, async () => {
    log(await api('/api/embeddings', { method: 'POST', body: { limit: 1000 } }));
    await refreshStatus();
    setActivity('Ready', 'Embeddings are ready for semantic search.', 'success');
    updatePipeline('scan');
  });
});

document.querySelector('#watchBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Starting watcher and preparing the selected folder...',
  }, async () => {
    await runAutoIndex(els.folderPath.value);
    const result = await api('/api/watch', {
      method: 'POST',
      body: { folderPath: els.folderPath.value, extract: true, auto: true },
    });
    log(result);
    await refreshDashboard();
    await refreshPlan();
    setActivity('Ready', 'Folder is being watched. New and changed files will be automatically processed.', 'success');
    updatePipeline('plan');
  });
});

document.querySelector('#providerSettingsBtn').addEventListener('click', async () => {
  els.providerSettingsStatus.textContent = '';
  await refreshProviderSettings();
  els.providerSettingsDialog.showModal();
});

document.querySelector('#saveProviderSettingsBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Saving provider settings...',
  }, async () => {
    const payload = await api('/api/provider-settings', {
      method: 'PUT',
      body: {
        provider: els.providerSelect.value,
        ollama: {
          baseUrl: els.ollamaBaseUrl.value,
          model: els.ollamaModel.value,
          timeoutMs: els.ollamaTimeoutMs.value,
          numPredict: els.ollamaNumPredict.value,
        },
      },
    });

    renderProviderSettings(payload.settings);
    els.providerSettingsStatus.textContent = 'Saved';
    await refreshStatus();
    setActivity('Ready', 'Provider settings saved.', 'success');
  });
});

document.querySelector('#openFolderBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Waiting',
    details: 'Choose a folder to add. The app will process it automatically after selection.',
  }, async () => {
    const result = await api('/api/select-folder', { method: 'POST', body: {} });

    if (result.cancelled) {
      log('Folder selection cancelled.');
      setActivity('Ready', 'Folder selection cancelled.', 'ready');
      return;
    }

    els.folderPath.value = result.folderPath;
    saveSettings();
    log(`Selected folder: ${result.folderPath}`);
    await runAutoIndex(result.folderPath);
  });
});

document.querySelector('#statusBtn').addEventListener('click', refreshStatus);

document.querySelector('#refreshBtn').addEventListener('click', refreshFiles);

document.querySelector('#refreshPlanBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Refreshing organization plan...',
  }, async () => {
    const suggestions = await refreshPlan();
    log(`Loaded ${suggestions.length} plan suggestion(s).`);
    setActivity('Ready', 'Organization plan refreshed.', 'success');
    updatePipeline(suggestions.length ? 'plan' : 'intake');
  });
});

els.viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    showView(button.dataset.viewTarget);
  });
});

document.querySelector('#searchBtn').addEventListener('click', async () => {
  document.querySelector('#unifiedSearchBtn').click();
});

document.querySelector('#semanticBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Running semantic-style search...',
  }, async () => {
    const payload = await api(`/api/semantic-search?q=${encodeURIComponent(els.query.value)}&limit=20`);
    renderFiles(payload.results);
    log(`Semantic search returned ${payload.results.length} result(s).`);
    setActivity('Ready', `Semantic search returned ${payload.results.length} result(s).`, 'success');
    showView('filesView');
  });
});

document.querySelector('#unifiedSearchBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Searching files, knowledge, labels, suggestions, and actions...',
  }, async () => {
    const query = els.query.value.trim();
    if (!query) {
      setActivity('Waiting', 'Enter a query to search files, knowledge, labels, suggestions, and actions.', 'working');
      log('Enter a search query first.');
      return;
    }

    const payload = await api(`/api/unified-search?q=${encodeURIComponent(query)}&limit=20`);
    renderUnifiedResults(payload);
    setActivity('Ready', `Search complete: ${Object.values(payload.totals).reduce((sum, count) => sum + count, 0)} total match(es).`, 'success');
    showView('knowledgeView');
  });
});

document.querySelector('#chatBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Asking indexed sources...',
  }, async () => {
    const payload = await api('/api/chat', {
      method: 'POST',
      body: { question: els.query.value, limit: 5 },
    });
    els.providerStatus.textContent = `${payload.provider}: ${payload.provider_status}`;
    els.answer.textContent = payload.answer;
    log({ sources: payload.sources });
    setActivity('Ready', `Answer prepared from ${payload.sources?.length || 0} source(s).`, 'success');
    showView('chatView');
  });
});

document.querySelector('#anythingLlmSyncBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Syncing extracted files to AnythingLLM...',
  }, async () => {
    const payload = await api('/api/integrations/anythingllm/sync', {
      method: 'POST',
      body: { limit: 25 },
    });
    log(payload);
    setActivity('Ready', `AnythingLLM sync finished. Uploaded: ${payload.uploaded || 0}.`, 'success');
  });
});

async function suggestVisibleFiles(button) {
  return withUiState({
    button,
    working: 'Working',
    details: 'Generating organization suggestions for visible files...',
  }, async () => {
    if (!state.files.length) {
      log('No visible files to organize. Index or refresh files first.');
      setActivity('Ready', 'No visible files to organize.', 'ready');
      return;
    }

    const created = [];
    for (const file of state.files) {
      const payload = await api('/api/suggestions', {
        method: 'POST',
        body: { fileId: file.id },
      });
      created.push(...payload.suggestions);
    }

    const suggestions = await refreshPlan();
    renderSuggestions(suggestions);
    log({ generated_suggestions: created.length, files: state.files.length });
    setActivity('Ready', `Generated ${created.length} suggestion(s).`, 'success');
    updatePipeline('plan');
    showView('planView');
  });
}

document.querySelector('#suggestVisibleBtn').addEventListener('click', async (event) => suggestVisibleFiles(event.currentTarget));

document.querySelector('#suggestPlanBtn').addEventListener('click', async (event) => suggestVisibleFiles(event.currentTarget));

document.querySelector('#insightsBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Generating file insights...',
  }, async () => {
    const payload = await api('/api/insights', {
      method: 'POST',
      body: { limit: 25, useOllama: false },
    });
    renderInsights(payload.insights);
    log({ generated: payload.generated });
    await refreshStatus();
    setActivity('Ready', `Generated ${payload.generated || 0} insight(s).`, 'success');
  });
});

document.querySelector('#duplicatesBtn').addEventListener('click', async (event) => {
  await withUiState({
    button: event.currentTarget,
    working: 'Working',
    details: 'Finding duplicate files...',
  }, async () => {
    const payload = await api('/api/duplicates');
    els.insights.innerHTML = payload.groups.map((group) => `
      <article class="card">
        <h3>Duplicate group: ${group.file_count} files</h3>
        <p class="muted">Hash: ${group.content_hash}</p>
        <pre>${group.files.map((file) => file.absolute_path).join('\n')}</pre>
      </article>
    `).join('') || '<p class="muted">No duplicates found.</p>';
    log(payload);
    setActivity('Ready', `Duplicate scan complete: ${payload.duplicate_groups || 0} group(s).`, 'success');
    showView('knowledgeView');
  });
});

document.querySelector('#labelsBtn').addEventListener('click', async () => {
  const payload = await api('/api/labels?limit=100');
  log(payload);
  els.insights.innerHTML = (payload.labels || payload.files || []).map((item) => `
    <article class="card">
      <h3>${safeValue(item.filename || item.file_id)}</h3>
      <p>Category: <strong>${safeValue(item.category || 'Uncategorized')}</strong></p>
      <p class="muted">${safeValue((item.tags || []).join(', ') || 'No tags')}</p>
    </article>
  `).join('') || '<p class="muted">No labels applied yet.</p>';
  showView('knowledgeView');
});

async function loadExecutions() {
  const payload = await api('/api/action-executions?limit=100');
  log(payload);
  const executions = payload.executions || payload.actionExecutions || [];
  renderActivityTimeline(executions.map((execution) => ({
    status: `${execution.action_type || 'action'}: ${execution.status || 'unknown'}`,
    details: execution.filename || execution.file_id || execution.id,
    tone: execution.status === 'executed' ? 'success' : 'ready',
    at: execution.created_at || execution.executed_at || new Date().toISOString(),
  })));
  showView('activityView');
}

async function loadAudit() {
  const payload = await api('/api/audit-log?limit=100');
  log(payload);
  const events = payload.events || payload.audit || payload.auditLog || [];
  renderActivityTimeline(events.map((event) => ({
    status: event.event_type || event.type || 'audit',
    details: event.message || event.entity_id || event.id,
    tone: String(event.event_type || '').includes('failed') ? 'error' : 'ready',
    at: event.created_at || event.timestamp || new Date().toISOString(),
  })));
  showView('activityView');
}

document.querySelector('#executionsBtn').addEventListener('click', loadExecutions);
document.querySelector('#auditBtn').addEventListener('click', loadAudit);
document.querySelector('#activityExecutionsBtn').addEventListener('click', loadExecutions);
document.querySelector('#activityAuditBtn').addEventListener('click', loadAudit);

document.querySelector('#knowledgeBtn').addEventListener('click', async (event) => {
  await buildKnowledge(event.currentTarget);
});

document.querySelector('#knowledgeRefreshBtn').addEventListener('click', async (event) => {
  await buildKnowledge(event.currentTarget);
});

els.files.addEventListener('click', async (event) => {
  const previewFileId = event.target.dataset.previewFile;
  if (previewFileId) {
    await withUiState({
      button: event.target,
      working: 'Working',
      details: 'Loading document context...',
    }, async () => {
      const payload = await api(`/api/intelligence/document-context/${previewFileId}`);
      els.answer.textContent = renderDocumentContextText(payload.document);
      log(payload.document);
      setActivity('Ready', `Document context loaded for ${payload.document.file.filename}.`, 'success');
      showView('chatView');
    });
    return;
  }

  const fileId = event.target.dataset.suggest;
  if (!fileId) return;

  await withUiState({
    button: event.target,
    working: 'Working',
    details: 'Generating organization suggestions...',
  }, async () => {
    const payload = await api('/api/suggestions', {
      method: 'POST',
      body: { fileId },
    });
    renderSuggestions(payload.suggestions);
    await refreshPlan();
    log(payload);
    setActivity('Ready', `Generated ${payload.suggestions.length} suggestion(s).`, 'success');
    updatePipeline('review');
    showView('planView');
  });
});

async function handlePreviewClick(event) {
  const suggestionId = event.target.dataset.preview;
  if (!suggestionId) return;

  await withUiState({
    button: event.target,
    working: 'Working',
    details: 'Creating safe action preview...',
  }, async () => {
    const previewPayload = await api('/api/action-previews', {
      method: 'POST',
      body: { suggestionId },
    });
    log(previewPayload);

    if (previewPayload.preview.preview_status !== 'ready') {
      setActivity('Ready', `Preview blocked: ${previewPayload.preview.blocked_reason || 'not executable'}.`, 'ready');
      updatePipeline('review');
      return;
    }

    const approved = window.confirm([
      `Approve and execute ${previewPayload.preview.action_type}?`,
      '',
      `Source: ${previewPayload.preview.source_path || previewPayload.preview.current_value || 'app metadata'}`,
      `Target: ${previewPayload.preview.target_path || previewPayload.preview.suggested_value}`,
      '',
      'This action is audited, delete actions are disabled, and move/rename changes can be reviewed in Activity / Audit.',
    ].join('\n'));

    if (!approved) {
      setActivity('Ready', 'Action preview created but execution was cancelled.', 'ready');
      return;
    }

    const executionPayload = await api('/api/action-executions', {
      method: 'POST',
      body: { previewId: previewPayload.preview.id, approve: true },
    });
    log(executionPayload);
    await refreshDashboard();
    await refreshPlan();
    setActivity('Ready', `Action executed: ${executionPayload.execution.action_type}.`, 'success');
    updatePipeline('approve');
    showView('activityView');
  });
}

els.suggestions.addEventListener('click', handlePreviewClick);
els.planActions.addEventListener('click', handlePreviewClick);

loadSettings();
updatePipeline('intake');
renderActivityTimeline();
refreshProviderSettings()
  .then(refreshDashboard)
  .then(refreshPlan)
  .catch((error) => showError(error));
