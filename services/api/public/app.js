const state = {
  files: [],
  suggestions: [],
  planSuggestions: [],
  unifiedResults: null,
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
  providerSettingsDialog: document.querySelector('#providerSettingsDialog'),
  providerSettingsStatus: document.querySelector('#providerSettingsStatus'),
  providerSelect: document.querySelector('#providerSelect'),
  ollamaBaseUrl: document.querySelector('#ollamaBaseUrl'),
  ollamaModel: document.querySelector('#ollamaModel'),
  ollamaTimeoutMs: document.querySelector('#ollamaTimeoutMs'),
  ollamaNumPredict: document.querySelector('#ollamaNumPredict'),
  settingsStatus: document.querySelector('#settingsStatus'),
  statusGrid: document.querySelector('#statusGrid'),
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
    throw new Error(payload.message || payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

function renderFiles(files) {
  state.files = files;
  els.files.innerHTML = files.map((file) => `
    <article class="card">
      <div class="card-title">
        <h3>${file.filename}</h3>
        <span class="pill">${file.extension || 'file'}</span>
      </div>
      <p class="muted">${file.absolute_path}</p>
      <p>Status: ${file.index_status} | Extraction: ${file.extraction_status || 'pending'}</p>
      <div class="actions">
        <button class="secondary" data-preview-file="${file.id}">Preview</button>
        <button data-suggest="${file.id}">Organize</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No files indexed yet.</p>';
}

function renderSuggestions(suggestions) {
  state.suggestions = suggestions;
  els.suggestions.innerHTML = suggestions.map((suggestion) => `
    <article class="card">
      <div class="card-title">
        <h3>${suggestion.suggested_value}</h3>
        <span class="pill">${suggestion.action_type}</span>
      </div>
      <p>${suggestion.reason}</p>
      <p class="muted">Risk: ${suggestion.risk_level} | Confidence: ${Math.round(Number(suggestion.confidence || 0) * 100)}%</p>
      <div class="actions">
        <button class="secondary" data-preview="${suggestion.id}">Preview Action</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No organize suggestions yet. Index files, then use Organize on a file or Suggest Visible Files.</p>';
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
        <strong>${folder}</strong>
        <span class="pill">${items.length} actions</span>
      </div>
      <ul>
        ${items.slice(0, 6).map((item) => `
          <li>${item.filename || item.file_id}: ${item.action_type} -> ${item.suggested_value}</li>
        `).join('')}
      </ul>
    </article>
  `).join('') || '<p class="muted">No plan yet. Generate suggestions from the Library first.</p>';

  els.planActions.innerHTML = suggestions.map((suggestion) => `
    <article class="card">
      <div class="card-title">
        <h3>${suggestion.filename || suggestion.file_id}</h3>
        <span class="pill">${suggestion.action_type}</span>
      </div>
      <p><strong>${suggestion.suggested_value}</strong></p>
      <p>${suggestion.reason}</p>
      <p class="muted">Risk: ${suggestion.risk_level} | Confidence: ${Math.round(Number(suggestion.confidence || 0) * 100)}%</p>
      <div class="actions">
        <button class="secondary" data-preview="${suggestion.id}">Preview Action</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No actions ready for preview.</p>';
}

function renderInsights(insights) {
  els.insights.innerHTML = insights.map((insight) => `
    <article class="card">
      <h3>${insight.filename}</h3>
      <p><strong>${insight.classification}</strong></p>
      <p>${insight.summary}</p>
      <p class="muted">Provider: ${insight.provider}</p>
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
      <span>${label}</span>
      <strong>${value}</strong>
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
      <pre>${items.map(format).join('\n\n') || 'No matches.'}</pre>
    </article>
  `).join('');

  log({ query: payload.query, totals: payload.totals });
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

async function runAutoIndex(folderPath) {
  const indexButton = document.querySelector('#indexBtn');
  indexButton.disabled = true;
  setActivity('Working', 'Indexing files, extracting text, creating embeddings, saving knowledge, and preparing organization suggestions...', 'working');

  try {
    const result = await api('/api/index', {
      method: 'POST',
      body: { folderPath, auto: true },
    });
    await refreshDashboard();
    const suggestions = await refreshPlan();
    setActivity(
      'Ready',
      `Processed ${result.indexed || 0} file(s). Knowledge, semantic search, and ${suggestions.length} organization suggestion(s) are ready.`,
      'success',
    );
    log(result);
    return result;
  } catch (error) {
    setActivity('Failed', error.message, 'error');
    throw error;
  } finally {
    indexButton.disabled = false;
  }
}

document.querySelector('#indexBtn').addEventListener('click', async () => {
  await runAutoIndex(els.folderPath.value);
});

async function buildKnowledge() {
  const buttons = [
    document.querySelector('#knowledgeBtn'),
    document.querySelector('#knowledgeRefreshBtn'),
  ];
  buttons.forEach((button) => { button.disabled = true; });
  setActivity('Working', 'Building knowledge from extracted files and saved insights...', 'working');

  try {
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
  } catch (error) {
    setActivity('Failed', error.message, 'error');
    throw error;
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

document.querySelector('#saveSettingsBtn').addEventListener('click', saveSettings);

document.querySelector('#clearSettingsBtn').addEventListener('click', () => {
  localStorage.removeItem('everythingai.settings');
  els.settingsStatus.textContent = 'Cleared';
});

document.querySelector('#extractBtn').addEventListener('click', async () => {
  setActivity('Working', 'Extracting readable document text...', 'working');
  log(await api('/api/extract', { method: 'POST', body: {} }));
  await refreshStatus();
  setActivity('Ready', 'Text extraction complete.', 'success');
});

document.querySelector('#embeddingsBtn').addEventListener('click', async () => {
  setActivity('Working', 'Generating semantic search embeddings...', 'working');
  log(await api('/api/embeddings', { method: 'POST', body: { limit: 1000 } }));
  await refreshStatus();
  setActivity('Ready', 'Embeddings are ready for semantic search.', 'success');
});

document.querySelector('#watchBtn').addEventListener('click', async () => {
  await runAutoIndex(els.folderPath.value);
  setActivity('Working', 'Starting folder watcher. Future changes will update search, knowledge, embeddings, and plans automatically.', 'working');
  const result = await api('/api/watch', {
    method: 'POST',
    body: { folderPath: els.folderPath.value, extract: true, auto: true },
  });
  log(result);
  await refreshDashboard();
  await refreshPlan();
  setActivity('Ready', 'Folder is being watched. New and changed files will be automatically processed.', 'success');
});

document.querySelector('#providerSettingsBtn').addEventListener('click', async () => {
  els.providerSettingsStatus.textContent = '';
  await refreshProviderSettings();
  els.providerSettingsDialog.showModal();
});

document.querySelector('#saveProviderSettingsBtn').addEventListener('click', async () => {
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
});

document.querySelector('#openFolderBtn').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  setActivity('Waiting', 'Choose a folder to add. The app will process it automatically after selection.', 'working');
  log('Opening folder picker...');

  try {
    const result = await api('/api/select-folder', { method: 'POST', body: {} });

    if (result.cancelled) {
      log('Folder selection cancelled.');
      return;
    }

    els.folderPath.value = result.folderPath;
    saveSettings();
    log(`Selected folder: ${result.folderPath}`);
    await runAutoIndex(result.folderPath);
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#statusBtn').addEventListener('click', refreshStatus);

document.querySelector('#refreshBtn').addEventListener('click', refreshFiles);

document.querySelector('#refreshPlanBtn').addEventListener('click', async () => {
  const suggestions = await refreshPlan();
  log(`Loaded ${suggestions.length} plan suggestion(s).`);
});

els.viewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    showView(button.dataset.viewTarget);
  });
});

document.querySelector('#searchBtn').addEventListener('click', async () => {
  document.querySelector('#unifiedSearchBtn').click();
});

document.querySelector('#semanticBtn').addEventListener('click', async () => {
  const payload = await api(`/api/semantic-search?q=${encodeURIComponent(els.query.value)}&limit=20`);
  renderFiles(payload.results);
  log(`Semantic search returned ${payload.results.length} result(s).`);
  showView('filesView');
});

document.querySelector('#unifiedSearchBtn').addEventListener('click', async () => {
  const query = els.query.value.trim();
  if (!query) {
    setActivity('Waiting', 'Enter a query to search files, knowledge, labels, suggestions, and actions.', 'working');
    log('Enter a search query first.');
    return;
  }

  setActivity('Working', `Searching everything for "${query}"...`, 'working');
  const payload = await api(`/api/unified-search?q=${encodeURIComponent(query)}&limit=20`);
  renderUnifiedResults(payload);
  setActivity('Ready', `Search complete: ${Object.values(payload.totals).reduce((sum, count) => sum + count, 0)} total match(es).`, 'success');
  showView('knowledgeView');
});

document.querySelector('#chatBtn').addEventListener('click', async () => {
  const payload = await api('/api/chat', {
    method: 'POST',
    body: { question: els.query.value, limit: 5 },
  });
  els.providerStatus.textContent = `${payload.provider}: ${payload.provider_status}`;
  els.answer.textContent = payload.answer;
  log({ sources: payload.sources });
});

document.querySelector('#anythingLlmSyncBtn').addEventListener('click', async () => {
  const payload = await api('/api/integrations/anythingllm/sync', {
    method: 'POST',
    body: { limit: 25 },
  });
  log(payload);
});

async function suggestVisibleFiles() {
  if (!state.files.length) {
    log('No visible files to organize. Index or refresh files first.');
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
  showView('planView');
}

document.querySelector('#suggestVisibleBtn').addEventListener('click', suggestVisibleFiles);

document.querySelector('#suggestPlanBtn').addEventListener('click', suggestVisibleFiles);

document.querySelector('#insightsBtn').addEventListener('click', async () => {
  const payload = await api('/api/insights', {
    method: 'POST',
    body: { limit: 25, useOllama: false },
  });
  renderInsights(payload.insights);
  log({ generated: payload.generated });
  await refreshStatus();
});

document.querySelector('#duplicatesBtn').addEventListener('click', async () => {
  const payload = await api('/api/duplicates');
  els.insights.innerHTML = payload.groups.map((group) => `
    <article class="card">
      <h3>Duplicate group: ${group.file_count} files</h3>
      <p class="muted">Hash: ${group.content_hash}</p>
      <pre>${group.files.map((file) => file.absolute_path).join('\n')}</pre>
    </article>
  `).join('') || '<p class="muted">No duplicates found.</p>';
  log(payload);
  showView('knowledgeView');
});

document.querySelector('#duplicatesRefreshBtn').addEventListener('click', async () => {
  document.querySelector('#duplicatesBtn').click();
});

document.querySelector('#labelsBtn').addEventListener('click', async () => {
  log(await api('/api/labels?limit=100'));
});

document.querySelector('#executionsBtn').addEventListener('click', async () => {
  log(await api('/api/action-executions?limit=100'));
});

document.querySelector('#auditBtn').addEventListener('click', async () => {
  log(await api('/api/audit-log?limit=100'));
});

document.querySelector('#knowledgeBtn').addEventListener('click', async () => {
  await buildKnowledge();
});

document.querySelector('#knowledgeRefreshBtn').addEventListener('click', async () => {
  await buildKnowledge();
});

els.files.addEventListener('click', async (event) => {
  const previewFileId = event.target.dataset.previewFile;
  if (previewFileId) {
    const payload = await api(`/api/files/${previewFileId}/preview`);
    els.answer.textContent = [
      payload.file.filename,
      payload.file.absolute_path,
      '',
      payload.insight?.summary || 'No insight yet.',
      '',
      payload.previewText || 'No extracted preview text available.',
    ].join('\n');
    log(payload.file);
    return;
  }

  const fileId = event.target.dataset.suggest;
  if (!fileId) return;

  const payload = await api('/api/suggestions', {
    method: 'POST',
    body: { fileId },
  });
  renderSuggestions(payload.suggestions);
  await refreshPlan();
  log(payload);
  showView('organizeView');
});

async function handlePreviewClick(event) {
  const suggestionId = event.target.dataset.preview;
  if (!suggestionId) return;

  const previewPayload = await api('/api/action-previews', {
    method: 'POST',
    body: { suggestionId },
  });
  log(previewPayload);

  if (previewPayload.preview.preview_status !== 'ready') return;
  const approved = window.confirm(`Execute ${previewPayload.preview.action_type}? This is approved and audited.`);
  if (!approved) return;

  const executionPayload = await api('/api/action-executions', {
    method: 'POST',
    body: { previewId: previewPayload.preview.id, approve: true },
  });
  log(executionPayload);
  await refreshDashboard();
}

els.suggestions.addEventListener('click', handlePreviewClick);
els.planActions.addEventListener('click', handlePreviewClick);

loadSettings();
refreshProviderSettings()
  .then(refreshDashboard)
  .then(refreshPlan)
  .catch((error) => log(error.message));
