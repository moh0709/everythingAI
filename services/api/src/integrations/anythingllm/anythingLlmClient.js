import { listExtractedFiles } from '../../db/client.js';

function getConfig(options = {}) {
  return {
    baseUrl: options.baseUrl || process.env.ANYTHINGLLM_BASE_URL || '',
    apiKey: options.apiKey || process.env.ANYTHINGLLM_API_KEY || '',
    workspaceSlug: options.workspaceSlug || process.env.ANYTHINGLLM_WORKSPACE_SLUG || '',
    uploadPath: options.uploadPath || process.env.ANYTHINGLLM_UPLOAD_PATH || '/api/v1/document/upload',
  };
}

function buildExportText(file) {
  return [
    `# ${file.filename}`,
    '',
    `Source path: ${file.absolute_path}`,
    `Relative path: ${file.relative_path}`,
    `Extension: ${file.extension || '(none)'}`,
    `Modified at: ${file.modified_at || '(unknown)'}`,
    '',
    '## Extracted content',
    '',
    file.extracted_text,
  ].join('\n');
}

async function uploadTextDocument({ file, text, config, fetchImpl }) {
  const form = new FormData();
  const blob = new Blob([text], { type: 'text/plain' });
  form.append('file', blob, `${file.id}-${file.filename}.txt`);

  if (config.workspaceSlug) {
    form.append('addToWorkspaces', config.workspaceSlug);
  }

  form.append('metadata', JSON.stringify({
    source: 'EverythingAI',
    fileId: file.id,
    absolutePath: file.absolute_path,
    relativePath: file.relative_path,
    originalFilename: file.filename,
  }));

  const response = await fetchImpl(`${config.baseUrl.replace(/\/$/, '')}${config.uploadPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: form,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`AnythingLLM upload failed for ${file.filename}: HTTP ${response.status} ${responseText}`);
  }

  return {
    fileId: file.id,
    filename: file.filename,
    status: 'uploaded',
    response: responseText,
  };
}

export async function syncExtractedFilesToAnythingLlm(db, { fileId, limit = 25, fetchImpl = globalThis.fetch, ...options } = {}) {
  const config = getConfig(options);

  if (!config.baseUrl || !config.apiKey) {
    throw new Error('ANYTHINGLLM_BASE_URL and ANYTHINGLLM_API_KEY are required.');
  }

  if (!fetchImpl) {
    throw new Error('fetch is not available in this Node runtime.');
  }

  const files = listExtractedFiles(db, { fileId, limit });
  const results = [];

  for (const file of files) {
    const text = buildExportText(file);
    results.push(await uploadTextDocument({ file, text, config, fetchImpl }));
  }

  return {
    provider: 'anythingllm',
    uploaded: results.length,
    workspaceSlug: config.workspaceSlug || null,
    results,
  };
}
