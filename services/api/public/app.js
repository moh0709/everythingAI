const state = {
  files: [],
  suggestions: [],
};

const els = {
  token: document.querySelector('#token'),
  folderPath: document.querySelector('#folderPath'),
  query: document.querySelector('#query'),
  files: document.querySelector('#files'),
  suggestions: document.querySelector('#suggestions'),
  insights: document.querySelector('#insights'),
  log: document.querySelector('#log'),
  answer: document.querySelector('#answer'),
  providerStatus: document.querySelector('#providerStatus'),
  settingsStatus: document.querySelector('#settingsStatus'),
  statusGrid: document.querySelector('#statusGrid'),
};

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
      <h3>${file.filename}</h3>
      <p class="muted">${file.absolute_path}</p>
      <p>Status: ${file.index_status} | ${file.extension || '(no extension)'}</p>
      <div class="actions">
        <button class="secondary" data-preview-file="${file.id}">Preview</button>
        <button data-suggest="${file.id}">Suggest organization</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No files indexed yet.</p>';
}

function renderSuggestions(suggestions) {
  state.suggestions = suggestions;
  els.suggestions.innerHTML = suggestions.map((suggestion) => `
    <article class="card">
      <h3>${suggestion.action_type}: ${suggestion.suggested_value}</h3>
      <p>${suggestion.reason}</p>
      <p class="muted">Risk: ${suggestion.risk_level} | Confidence: ${suggestion.confidence}</p>
      <div class="actions">
        <button class="secondary" data-preview="${suggestion.id}">Create preview</button>
      </div>
    </article>
  `).join('') || '<p class="muted">No suggestions yet.</p>';
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
    : 'Ollama not configured';

  els.statusGrid.innerHTML = metrics.map(([label, value]) => `
    <article class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join('');
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

async function refreshDashboard() {
  await Promise.all([
    refreshStatus(),
    refreshFiles(),
  ]);
}

document.querySelector('#indexBtn').addEventListener('click', async () => {
  const result = await api('/api/index', {
    method: 'POST',
    body: { folderPath: els.folderPath.value },
  });
  log(result);
  await refreshDashboard();
});

document.querySelector('#saveSettingsBtn').addEventListener('click', saveSettings);

document.querySelector('#clearSettingsBtn').addEventListener('click', () => {
  localStorage.removeItem('everythingai.settings');
  els.settingsStatus.textContent = 'Cleared';
});

document.querySelector('#extractBtn').addEventListener('click', async () => {
  log(await api('/api/extract', { method: 'POST', body: {} }));
  await refreshStatus();
});

document.querySelector('#embeddingsBtn').addEventListener('click', async () => {
  log(await api('/api/embeddings', { method: 'POST', body: { limit: 1000 } }));
  await refreshStatus();
});

document.querySelector('#watchBtn').addEventListener('click', async () => {
  const result = await api('/api/watch', {
    method: 'POST',
    body: { folderPath: els.folderPath.value, extract: true },
  });
  log(result);
  await refreshDashboard();
});

document.querySelector('#statusBtn').addEventListener('click', refreshStatus);

document.querySelector('#refreshBtn').addEventListener('click', refreshFiles);

document.querySelector('#searchBtn').addEventListener('click', async () => {
  const payload = await api(`/api/search?q=${encodeURIComponent(els.query.value)}&limit=20`);
  renderFiles(payload.results);
  log(`Search returned ${payload.results.length} result(s).`);
});

document.querySelector('#semanticBtn').addEventListener('click', async () => {
  const payload = await api(`/api/semantic-search?q=${encodeURIComponent(els.query.value)}&limit=20`);
  renderFiles(payload.results);
  log(`Semantic search returned ${payload.results.length} result(s).`);
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
  const payload = await api('/api/knowledge?limit=500');
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
  ].join('') || '<p class="muted">No knowledge index yet. Generate insights first.</p>';
  log({ entities: payload.entity_count, classifications: payload.classification_count });
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
  log(payload);
});

els.suggestions.addEventListener('click', async (event) => {
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
});

loadSettings();
refreshDashboard().catch((error) => log(error.message));
