const queueState = {
  selectedPreviews: [],
};

const els = {
  token: document.querySelector('#token'),
  batchQueue: document.querySelector('#batchQueue'),
  batchQueueStatus: document.querySelector('#batchQueueStatus'),
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

function renderBatchQueue() {
  if (!queueState.selectedPreviews.length) {
    els.batchQueueStatus.textContent = 'No previews selected.';
    els.batchQueue.innerHTML = '<p class="muted">Create an action preview and choose Add to Batch.</p>';
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
  renderBatchQueue();
  setActivity('Ready', `Added ${normalized.action_type} preview to batch queue.`, 'success');
}

function removePreviewFromQueue(previewId) {
  queueState.selectedPreviews = queueState.selectedPreviews.filter((preview) => preview.id !== previewId);
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
    'Choose Add to Batch from the activity panel, or use the existing Execute Now confirmation if you want immediate execution.',
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

els.clearBatchQueueBtn.addEventListener('click', () => {
  queueState.selectedPreviews = [];
  renderBatchQueue();
  setActivity('Ready', 'Batch queue cleared.', 'success');
});

renderBatchQueue();
window.everythingAiBatchQueue = queueState;
