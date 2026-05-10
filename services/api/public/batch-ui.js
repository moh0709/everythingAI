const queueState = {
  selectedPreviews: [],
  currentBatch: null,
};

const els = {
  token: document.querySelector('#token'),
  batchQueue: document.querySelector('#batchQueue'),
  batchQueueStatus: document.querySelector('#batchQueueStatus'),
  batchDetail: document.querySelector('#batchDetail'),
  createBatchBtn: document.querySelector('#createBatchBtn'),
  approveBatchBtn: document.querySelector('#approveBatchBtn'),
  runBatchBtn: document.querySelector('#runBatchBtn'),
  refreshBatchBtn: document.querySelector('#refreshBatchBtn'),
  clearBatchQueueBtn: document.querySelector('#clearBatchQueueBtn'),
  suggestions: document.querySelector('#suggestions'),
  planActions: document.querySelector('#planActions'),
  log: document.querySelector('#log'),
  activityStatus: document.querySelector('#activityStatus'),
  activityDetails: document.querySelector('#activityDetails'),
};

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${els.token.value}`,
  };
}

function setActivity(status, details = '', tone = 'ready') {
  els.activityStatus.textContent = status;
  els.activityDetails.textContent = details;
  els.activityStatus.closest('.activity-banner').dataset.tone = tone;
}

function log(value) {
  els.log.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: apiHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed: ${response.status}`);
  }

  return payload;
}

function normalizePreview(preview) {
  return {
    id: preview.id,
    action_type: preview.action_type,
    preview_status: preview.preview_status,
    can_execute: preview.can_execute === true || preview.can_execute === 1,
    blocked_reason: preview.blocked_reason || '',
    source_path: preview.source_path || '',
    target_path: preview.target_path || '',
    suggested_value: preview.suggested_value || '',
    risk_level: preview.risk_level || 'unknown',
  };
}

function getBatchSummary(batch) {
  return batch?.summary || {};
}

function renderBatchDetail() {
  const batch = queueState.currentBatch;

  if (!batch) {
    els.batchDetail.innerHTML = '<p class="muted">No batch created yet.</p>';
    return;
  }

  const summary = getBatchSummary(batch);
  const executions = batch.executions || [];

  els.batchDetail.innerHTML = `
    <article class="card batch-detail-card">
      <div class="card-title">
        <h3>Batch ${batch.id}</h3>
        <span class="pill">${batch.status}</span>
      </div>
      <div class="batch-metrics">
        <span>Total: <strong>${summary.total_previews ?? 0}</strong></span>
        <span>Ready: <strong>${summary.ready_previews ?? 0}</strong></span>
        <span>Blocked: <strong>${summary.blocked_previews ?? 0}</strong></span>
        <span>Executed: <strong>${summary.executed ?? 0}</strong></span>
        <span>Failed: <strong>${summary.failed ?? 0}</strong></span>
      </div>
      ${batch.approved_at ? `<p class="muted">Approved: ${batch.approved_at}</p>` : ''}
      ${batch.started_at ? `<p class="muted">Started: ${batch.started_at}</p>` : ''}
      ${batch.completed_at ? `<p class="muted">Completed: ${batch.completed_at}</p>` : ''}
      ${batch.error_message ? `<p class="muted">Error: ${batch.error_message}</p>` : ''}
      <h4>Executions</h4>
      ${executions.length ? executions.map((execution) => `
        <div class="batch-execution-row">
          <strong>${execution.action_type}</strong>
          <span>${execution.status}</span>
          <small>${execution.id}</small>
        </div>
      `).join('') : '<p class="muted">No linked executions yet.</p>'}
    </article>
  `;
}

function renderBatchQueue() {
  if (!queueState.selectedPreviews.length) {
    els.batchQueueStatus.textContent = 'No previews selected.';
    els.batchQueue.innerHTML = '<p class="muted">Create an action preview and choose Add to Batch.</p>';
    renderBatchDetail();
    return;
  }

  els.batchQueueStatus.textContent = `${queueState.selectedPreviews.length} preview(s) selected for batch.`;
  els.batchQueue.innerHTML = queueState.selectedPreviews.map((preview) => `
    <article class="card batch-queue-card">
      <div class="card-title">
        <h3>${preview.action_type}</h3>
        <span class="pill">${preview.preview_status}</span>
      </div>
      <p class="muted">${preview.source_path || preview.suggested_value || preview.id}</p>
      ${preview.target_path ? `<p>Target: ${preview.target_path}</p>` : ''}
      ${preview.suggested_value ? `<p>Value: ${preview.suggested_value}</p>` : ''}
      <div class="actions">
        <button class="secondary" data-remove-batch-preview="${preview.id}">Remove</button>
      </div>
    </article>
  `).join('');
  renderBatchDetail();
}

function addPreviewToQueue(preview) {
  const normalized = normalizePreview(preview);

  if (!normalized.can_execute || normalized.preview_status !== 'ready') {
    setActivity('Ready', `Preview blocked: ${normalized.blocked_reason || 'not executable'}.`, 'ready');
    return;
  }

  if (queueState.selectedPreviews.some((item) => item.id === normalized.id)) {
    setActivity('Ready', 'Preview is already in the batch queue.', 'ready');
    return;
  }

  queueState.selectedPreviews.push(normalized);
  queueState.currentBatch = null;
  renderBatchQueue();
  setActivity('Ready', `Added ${normalized.action_type} preview to batch queue.`, 'success');
}

function removePreviewFromQueue(previewId) {
  queueState.selectedPreviews = queueState.selectedPreviews.filter((preview) => preview.id !== previewId);
  queueState.currentBatch = null;
  renderBatchQueue();
  setActivity('Ready', 'Preview removed from batch queue.', 'success');
}

function createPreviewChoiceCard(preview) {
  const normalized = normalizePreview(preview);

  if (!normalized.can_execute || normalized.preview_status !== 'ready') {
    return `Preview blocked: ${normalized.blocked_reason || 'not executable'}.`;
  }

  return [
    `Preview created: ${normalized.action_type}`,
    normalized.source_path ? `Source: ${normalized.source_path}` : '',
    normalized.target_path ? `Target: ${normalized.target_path}` : '',
    normalized.suggested_value ? `Value: ${normalized.suggested_value}` : '',
    '',
    'Preview added to Batch Queue. Create a batch when ready.',
  ].filter(Boolean).join('\n');
}

async function handleAddToBatch(event) {
  const suggestionId = event.target.dataset.batchPreview;
  if (!suggestionId) return;

  event.preventDefault();
  event.stopPropagation();

  event.target.disabled = true;
  const previousLabel = event.target.textContent;
  event.target.textContent = 'Working...';

  try {
    const payload = await api('/api/action-previews', {
      method: 'POST',
      body: { suggestionId },
    });

    log({ batch_preview: payload.preview });
    addPreviewToQueue(payload.preview);
    setActivity('Ready', createPreviewChoiceCard(payload.preview), 'success');
  } catch (error) {
    log({ error: error.message });
    setActivity('Failed', error.message, 'error');
  } finally {
    event.target.disabled = false;
    event.target.textContent = previousLabel;
  }
}

async function createBatch() {
  if (!queueState.selectedPreviews.length) {
    setActivity('Ready', 'Add at least one ready preview to the batch queue first.', 'ready');
    return;
  }

  const payload = await api('/api/execution-batches', {
    method: 'POST',
    body: { previewIds: queueState.selectedPreviews.map((preview) => preview.id) },
  });

  queueState.currentBatch = payload.batch;
  renderBatchQueue();
  log(payload);
  setActivity('Ready', `Batch created with status: ${payload.batch.status}.`, 'success');
}

async function refreshBatch() {
  if (!queueState.currentBatch?.id) {
    setActivity('Ready', 'Create a batch before refreshing batch detail.', 'ready');
    return;
  }

  const payload = await api(`/api/execution-batches/${queueState.currentBatch.id}`);
  queueState.currentBatch = payload.batch;
  renderBatchQueue();
  log(payload);
  setActivity('Ready', `Batch refreshed: ${payload.batch.status}.`, 'success');
}

async function approveBatch() {
  if (!queueState.currentBatch?.id) {
    setActivity('Ready', 'Create a batch before approving.', 'ready');
    return;
  }

  const approved = window.confirm('Approve this batch? This keeps backend approval gates explicit.');
  if (!approved) {
    setActivity('Ready', 'Batch approval cancelled.', 'ready');
    return;
  }

  const payload = await api(`/api/execution-batches/${queueState.currentBatch.id}/approve`, {
    method: 'POST',
    body: { approve: true },
  });

  queueState.currentBatch = payload.batch;
  renderBatchQueue();
  log(payload);
  setActivity('Ready', `Batch approved: ${payload.batch.status}.`, 'success');
}

async function runBatch() {
  if (!queueState.currentBatch?.id) {
    setActivity('Ready', 'Create and approve a batch before running.', 'ready');
    return;
  }

  const approved = window.confirm('Run this approved batch now? Each action will still use the backend safe executor.');
  if (!approved) {
    setActivity('Ready', 'Batch run cancelled.', 'ready');
    return;
  }

  const payload = await api(`/api/execution-batches/${queueState.currentBatch.id}/run`, {
    method: 'POST',
    body: { approve: true },
  });

  queueState.currentBatch = payload.batch;
  renderBatchQueue();
  log(payload);
  setActivity('Ready', `Batch run finished: ${payload.batch.status}.`, 'success');
}

async function runButtonAction(button, label, task) {
  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Working...';

  try {
    await task();
  } catch (error) {
    log({ error: error.message });
    setActivity('Failed', error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = previousLabel || label;
  }
}

function enhanceSuggestionButtons(container) {
  container.querySelectorAll('[data-preview]').forEach((button) => {
    if (button.dataset.batchEnhanced === 'true') return;

    const addButton = document.createElement('button');
    addButton.className = 'secondary';
    addButton.textContent = 'Add to Batch';
    addButton.dataset.batchPreview = button.dataset.preview;

    button.insertAdjacentElement('afterend', addButton);
    button.dataset.batchEnhanced = 'true';
  });
}

const observer = new MutationObserver(() => {
  enhanceSuggestionButtons(els.suggestions);
  enhanceSuggestionButtons(els.planActions);
});

observer.observe(els.suggestions, { childList: true, subtree: true });
observer.observe(els.planActions, { childList: true, subtree: true });

document.addEventListener('click', async (event) => {
  if (event.target.dataset.batchPreview) {
    await handleAddToBatch(event);
    return;
  }

  if (event.target.dataset.removeBatchPreview) {
    removePreviewFromQueue(event.target.dataset.removeBatchPreview);
  }
});

els.createBatchBtn.addEventListener('click', (event) => runButtonAction(event.currentTarget, 'Create Batch', createBatch));
els.approveBatchBtn.addEventListener('click', (event) => runButtonAction(event.currentTarget, 'Approve Batch', approveBatch));
els.runBatchBtn.addEventListener('click', (event) => runButtonAction(event.currentTarget, 'Run Batch', runBatch));
els.refreshBatchBtn.addEventListener('click', (event) => runButtonAction(event.currentTarget, 'Refresh Batch', refreshBatch));

els.clearBatchQueueBtn.addEventListener('click', () => {
  queueState.selectedPreviews = [];
  queueState.currentBatch = null;
  renderBatchQueue();
  setActivity('Ready', 'Batch queue cleared.', 'success');
});

renderBatchQueue();
window.everythingAiBatchQueue = queueState;
