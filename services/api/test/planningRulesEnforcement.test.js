import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  openDatabase,
  setAppSetting,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { extractIndexedFiles } from '../src/extractors/extractionRunner.js';
import { generateConfiguredPreviewSuggestions } from '../src/suggestions/suggestionService.js';
import { createActionPreview } from '../src/previews/actionPreviewService.js';
import { executeActionPreview } from '../src/actions/actionExecutor.js';
import { getDefaultAiProviderSettings, mergeAiProviderSettings } from '../src/settings/aiProviderSettings.js';

const SETTINGS_KEY = 'ai_provider_settings';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-planning-rules-${Date.now()}-${Math.random()}.sqlite`);
}

async function prepareDb() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-planning-rules-'));
  await fs.writeFile(path.join(root, 'Alpha Contract.md'), '# Alpha\nSupplier contract renewal for alpha account');

  const db = openDatabase(tempDbPath());
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  await scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
  await extractIndexedFiles(db, { logger: { error: () => {} } });

  const file = db.prepare('SELECT * FROM indexed_files WHERE filename = ?').get('Alpha Contract.md');
  return { db, file };
}

function savePlanningSettings(db, planning) {
  const settings = mergeAiProviderSettings({
    ...getDefaultAiProviderSettings(),
    planning,
  });
  setAppSetting(db, SETTINGS_KEY, settings);
}

test('configured suggestions enforce action allow-list rules', async () => {
  const { db, file } = await prepareDb();

  try {
    const suggestions = await generateConfiguredPreviewSuggestions(db, {
      fileId: file.id,
      mode: 'deterministic',
      planningRules: {
        allowRename: false,
        allowMove: false,
        allowTag: true,
        allowCategory: true,
        confidenceThreshold: 0,
      },
    });

    assert.equal(suggestions.length > 0, true);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'rename'), false);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'move'), false);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'tag'), true);
    assert.equal(suggestions.some((suggestion) => suggestion.action_type === 'category'), true);
  } finally {
    db.close();
  }
});

test('configured suggestions enforce confidence threshold', async () => {
  const { db, file } = await prepareDb();

  try {
    const suggestions = await generateConfiguredPreviewSuggestions(db, {
      fileId: file.id,
      mode: 'deterministic',
      planningRules: {
        confidenceThreshold: 0.99,
      },
    });

    assert.equal(suggestions.length, 0);
  } finally {
    db.close();
  }
});

test('configured suggestions can mark previews as not requiring approval', async () => {
  const { db, file } = await prepareDb();

  try {
    const suggestions = await generateConfiguredPreviewSuggestions(db, {
      fileId: file.id,
      mode: 'deterministic',
      planningRules: {
        allowRename: false,
        allowMove: false,
        allowTag: true,
        allowCategory: false,
        requireApproval: false,
        confidenceThreshold: 0,
      },
    });
    const tagSuggestion = suggestions.find((suggestion) => suggestion.action_type === 'tag');
    const preview = await createActionPreview(db, { suggestionId: tagSuggestion.id });
    const execution = await executeActionPreview(db, { previewId: preview.id });

    assert.equal(tagSuggestion.requires_approval, 0);
    assert.equal(preview.requires_approval, 0);
    assert.equal(execution.status, 'executed');
  } finally {
    db.close();
  }
});

test('dry-run-only planning rule blocks action previews from execution', async () => {
  const { db, file } = await prepareDb();

  try {
    savePlanningSettings(db, {
      dryRunOnly: true,
      allowRename: false,
      allowMove: false,
      allowTag: true,
      allowCategory: false,
      requireApproval: true,
      confidenceThreshold: 0,
    });

    const suggestions = await generateConfiguredPreviewSuggestions(db, {
      fileId: file.id,
      mode: 'deterministic',
    });
    const tagSuggestion = suggestions.find((suggestion) => suggestion.action_type === 'tag');
    const preview = await createActionPreview(db, { suggestionId: tagSuggestion.id });

    assert.equal(preview.can_execute, 0);
    assert.equal(preview.preview_status, 'blocked');
    assert.match(preview.blocked_reason, /dry-run-only/i);
    await assert.rejects(
      () => executeActionPreview(db, { previewId: preview.id, approve: true }),
      /Action preview failed validation/,
    );
  } finally {
    db.close();
  }
});
