import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  openDatabase,
  listIndexedFiles,
  listOrganizationSuggestions,
  upsertIndexedFile,
} from '../src/db/client.js';
import { scanFolder } from '../src/indexer/fileScanner.js';
import { runKnowledgeIngestionPipeline, runPlanningPipeline } from '../src/automation/localPipeline.js';
import { clearJobs, getJob, listJobs } from '../src/jobs/jobService.js';
import { runJob } from '../src/jobs/jobRunner.js';
import { JOB_STATUSES, JOB_TYPES } from '../src/jobs/jobTypes.js';
import { startFolderWatcher, stopFolderWatcher } from '../src/watcher/watchService.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-jobs-test-${Date.now()}-${Math.random()}.sqlite`);
}

async function createJobFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-jobs-'));
  await fs.writeFile(path.join(root, 'contract.txt'), 'supplier contract renewal for alpha project');
  await fs.writeFile(path.join(root, 'notes.md'), '# Notes\nproject beta planning notes');
  return root;
}

async function indexFixture(root, db) {
  const insert = db.transaction((record) => upsertIndexedFile(db, record));
  return scanFolder(root, {
    onRecord: (record) => insert(record),
    logger: { error: () => {} },
  });
}

test('job runner records completed jobs', async () => {
  clearJobs();

  const result = await runJob({
    type: JOB_TYPES.KNOWLEDGE_INGESTION_PIPELINE,
    input: { fixture: true },
    initialProgress: {
      currentStep: 'test',
      message: 'Running test job.',
    },
  }, async () => ({ ok: true }));

  const storedJob = getJob(result.job.id);
  const jobs = listJobs();

  assert.equal(result.output.ok, true);
  assert.equal(result.job.status, JOB_STATUSES.COMPLETED);
  assert.equal(result.job.progress.percent, 100);
  assert.equal(storedJob.status, JOB_STATUSES.COMPLETED);
  assert.equal(storedJob.output.ok, true);
  assert.equal(jobs.length, 1);
});

test('job runner records failed jobs and rethrows errors', async () => {
  clearJobs();

  await assert.rejects(
    () => runJob({
      type: JOB_TYPES.KNOWLEDGE_INGESTION_PIPELINE,
      input: { fixture: true },
    }, async () => {
      throw new Error('planned failure');
    }),
    /planned failure/,
  );

  const jobs = listJobs();

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].status, JOB_STATUSES.FAILED);
  assert.equal(jobs[0].errorMessage, 'planned failure');
});

test('knowledge ingestion can be wrapped as a job without creating planning suggestions', async () => {
  clearJobs();

  const root = await createJobFixture();
  const db = openDatabase(tempDbPath());

  await indexFixture(root, db);

  const jobResult = await runJob({
    type: JOB_TYPES.KNOWLEDGE_INGESTION_PIPELINE,
    input: { root },
    initialProgress: {
      currentStep: 'knowledge_ingestion',
      message: 'Running knowledge ingestion pipeline.',
    },
  }, async () => runKnowledgeIngestionPipeline(db, {
    limit: 100,
    logger: { error: () => {} },
  }));

  const suggestionsBeforePlanning = listOrganizationSuggestions(db, { limit: 100 });
  const planning = runPlanningPipeline(db, { limit: 100 });
  const suggestionsAfterPlanning = listOrganizationSuggestions(db, { limit: 100 });

  assert.equal(jobResult.job.type, JOB_TYPES.KNOWLEDGE_INGESTION_PIPELINE);
  assert.equal(jobResult.job.status, JOB_STATUSES.COMPLETED);
  assert.equal(jobResult.output.mode, 'knowledge_ingestion');
  assert.equal(jobResult.output.summary.extracted > 0, true);
  assert.equal(suggestionsBeforePlanning.length, 0);
  assert.equal(planning.suggestions > 0, true);
  assert.equal(suggestionsAfterPlanning.length >= planning.suggestions, true);

  db.close();
});

test('watcher cycles are recorded as jobs without automatic planning suggestions', async () => {
  clearJobs();

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-watch-jobs-'));
  const db = openDatabase(tempDbPath());

  await fs.writeFile(path.join(root, 'initial.txt'), 'initial supplier contract content');

  const watcher = await startFolderWatcher(db, {
    rootPath: root,
    extract: true,
    debounceMs: 200,
    logger: { error: () => {} },
  });

  await fs.writeFile(path.join(root, 'later.txt'), 'later watched project content');
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const jobs = listJobs({ limit: 20 });
  const watcherJobs = jobs.filter((job) => job.type === JOB_TYPES.WATCHER_CYCLE);
  const files = listIndexedFiles(db, { limit: 100 });
  const suggestions = listOrganizationSuggestions(db, { limit: 100 });
  const stopped = stopFolderWatcher(db, { rootPath: root });

  assert.equal(watcher.status, 'active');
  assert.equal(watcher.job.type, JOB_TYPES.WATCHER_CYCLE);
  assert.equal(watcher.job.status, JOB_STATUSES.COMPLETED);
  assert.equal(watcherJobs.length >= 1, true);
  assert.equal(files.some((file) => file.filename === 'initial.txt'), true);
  assert.equal(files.some((file) => file.filename === 'later.txt'), true);
  assert.equal(suggestions.length, 0);
  assert.equal(stopped.status, 'stopped');

  db.close();
});
