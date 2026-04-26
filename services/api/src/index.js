import {
  openDatabase,
  listIndexedFiles,
  upsertIndexedFile,
  resolveDatabasePath,
  getIndexedFileById,
  listFileInsights,
} from './db/client.js';
import { scanFolder } from './indexer/fileScanner.js';
import { extractIndexedFiles } from './extractors/extractionRunner.js';
import { searchFiles } from './search/searchService.js';
import { answerFromLocalFiles } from './ai/chatPipeline.js';
import { generatePreviewSuggestions } from './suggestions/suggestionService.js';
import { createActionPreview } from './previews/actionPreviewService.js';
import { executeActionPreview, undoActionExecution } from './actions/actionExecutor.js';
import { syncExtractedFilesToAnythingLlm } from './integrations/anythingllm/anythingLlmClient.js';
import { generateFileInsights } from './insights/insightService.js';
import { semanticSearchFiles } from './search/semanticSearch.js';
import { findDuplicateFiles } from './duplicates/duplicateService.js';
import { startFolderWatcher, stopFolderWatcher } from './watcher/watchService.js';
import { generateEmbeddings } from './embeddings/embeddingService.js';

function printUsage() {
  console.log(`
EverythingAI local metadata indexer

Usage:
  node src/index.js index <folder> [--db <sqlite-path>]
  node src/index.js extract [--db <sqlite-path>] [--file-id <id>] [--limit <n>]
  node src/index.js list [--db <sqlite-path>] [--limit <n>] [--status indexed|failed] [--query <text>]
  node src/index.js search <query> [--db <sqlite-path>] [--limit <n>]
  node src/index.js semantic <query> [--db <sqlite-path>] [--limit <n>]
  node src/index.js embeddings [--db <sqlite-path>] [--file-id <id>] [--limit <n>]
  node src/index.js chat <question> [--db <sqlite-path>] [--limit <n>]
  node src/index.js insights [--db <sqlite-path>] [--file-id <id>] [--limit <n>] [--ollama]
  node src/index.js duplicates [--db <sqlite-path>]
  node src/index.js watch <folder> [--db <sqlite-path>]
  node src/index.js unwatch <folder> [--db <sqlite-path>]
  node src/index.js suggest <file-id> [--db <sqlite-path>]
  node src/index.js preview <suggestion-id> [--db <sqlite-path>]
  node src/index.js execute <preview-id> --approve [--db <sqlite-path>]
  node src/index.js undo <execution-id> --approve [--db <sqlite-path>]
  node src/index.js sync-anythingllm [--db <sqlite-path>] [--file-id <id>] [--limit <n>]

Examples:
  node src/index.js index "C:\\Users\\you\\Documents\\TestFolder"
  node src/index.js extract
  node src/index.js list --limit 20
  node src/index.js search invoice
  node src/index.js semantic "supplier contract"
  node src/index.js embeddings --limit 100
  node src/index.js insights --limit 10
  node src/index.js duplicates
  node src/index.js suggest <file-id>
  node src/index.js preview <suggestion-id>
  node src/index.js execute <preview-id> --approve
  node src/index.js sync-anythingllm --limit 10
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  const positionals = [];

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];

    if (arg === '--db') {
      options.dbPath = rest[++i];
    } else if (arg === '--limit') {
      options.limit = Number.parseInt(rest[++i], 10);
    } else if (arg === '--status') {
      options.status = rest[++i];
    } else if (arg === '--query') {
      options.query = rest[++i];
    } else if (arg === '--file-id') {
      options.fileId = rest[++i];
    } else if (arg === '--approve') {
      options.approve = true;
    } else if (arg === '--ollama') {
      options.useOllama = true;
    } else {
      positionals.push(arg);
    }
  }

  return { command, positionals, options };
}

async function runIndex(folderPath, options) {
  if (!folderPath) {
    throw new Error('Missing folder path.');
  }

  const db = openDatabase(options.dbPath);
  const insertRecord = db.transaction((record) => upsertIndexedFile(db, record));

  console.log(`Indexing: ${folderPath}`);
  console.log(`Database: ${resolveDatabasePath(options.dbPath)}`);

  const result = await scanFolder(folderPath, {
    onRecord: (record) => insertRecord(record),
  });

  db.close();
  console.log(JSON.stringify(result, null, 2));
}

function runList(options) {
  const db = openDatabase(options.dbPath);
  const rows = listIndexedFiles(db, {
    limit: Number.isFinite(options.limit) ? options.limit : 100,
    status: options.status,
    query: options.query,
  });

  console.table(rows.map((row) => ({
    status: row.index_status,
    filename: row.filename,
    extension: row.extension,
    size_bytes: row.size_bytes,
    modified_at: row.modified_at,
    absolute_path: row.absolute_path,
    error: row.error_message,
  })));

  console.log(`Returned ${rows.length} record(s) from ${resolveDatabasePath(options.dbPath)}`);
  db.close();
}

async function runExtract(options) {
  const db = openDatabase(options.dbPath);
  console.log(`Database: ${resolveDatabasePath(options.dbPath)}`);

  const result = await extractIndexedFiles(db, {
    fileId: options.fileId,
    limit: Number.isFinite(options.limit) ? options.limit : 1000,
  });

  db.close();
  console.log(JSON.stringify(result, null, 2));
}

function runSearch(query, options) {
  if (!query) {
    throw new Error('Missing search query.');
  }

  const db = openDatabase(options.dbPath);
  const rows = searchFiles(db, {
    query,
    limit: Number.isFinite(options.limit) ? options.limit : 20,
  });

  console.table(rows.map((row) => ({
    filename: row.filename,
    extension: row.extension,
    extraction_status: row.extraction_status,
    modified_at: row.modified_at,
    absolute_path: row.absolute_path,
    snippet: row.snippet,
  })));

  console.log(`Returned ${rows.length} result(s) from ${resolveDatabasePath(options.dbPath)}`);
  db.close();
}

function runSemantic(query, options) {
  if (!query) {
    throw new Error('Missing semantic search query.');
  }

  const db = openDatabase(options.dbPath);
  const rows = semanticSearchFiles(db, {
    query,
    limit: Number.isFinite(options.limit) ? options.limit : 10,
  });

  console.table(rows.map((row) => ({
    filename: row.filename,
    score: row.score.toFixed(3),
    absolute_path: row.absolute_path,
    snippet: row.snippet,
  })));
  db.close();
}

async function runChat(question, options) {
  if (!question) {
    throw new Error('Missing question.');
  }

  const db = openDatabase(options.dbPath);
  const result = await answerFromLocalFiles(db, {
    question,
    limit: Number.isFinite(options.limit) ? options.limit : 5,
  });

  db.close();
  console.log(JSON.stringify(result, null, 2));
}

function runSuggest(fileId, options) {
  if (!fileId) {
    throw new Error('Missing file id.');
  }

  const db = openDatabase(options.dbPath);
  const file = getIndexedFileById(db, fileId);

  if (!file) {
    db.close();
    throw new Error(`File not found: ${fileId}`);
  }

  const suggestions = generatePreviewSuggestions(db, { fileId });
  db.close();
  console.table(suggestions.map((suggestion) => ({
    id: suggestion.id,
    action: suggestion.action_type,
    current: suggestion.current_value,
    suggested: suggestion.suggested_value,
    confidence: suggestion.confidence,
    risk: suggestion.risk_level,
    approval: Boolean(suggestion.requires_approval),
  })));
}

async function runPreview(suggestionId, options) {
  if (!suggestionId) {
    throw new Error('Missing suggestion id.');
  }

  const db = openDatabase(options.dbPath);
  const preview = await createActionPreview(db, { suggestionId });
  db.close();
  console.table([{
    action: preview.action_type,
    status: preview.preview_status,
    can_execute: Boolean(preview.can_execute),
    source: preview.source_path,
    target: preview.target_path,
    risk: preview.risk_level,
    blocked_reason: preview.blocked_reason,
  }]);
}

async function runExecute(previewId, options) {
  if (!previewId) {
    throw new Error('Missing preview id.');
  }

  const db = openDatabase(options.dbPath);
  const execution = await executeActionPreview(db, {
    previewId,
    approve: options.approve === true,
  });
  db.close();
  console.log(JSON.stringify(execution, null, 2));
}

async function runUndo(executionId, options) {
  if (!executionId) {
    throw new Error('Missing execution id.');
  }

  const db = openDatabase(options.dbPath);
  const execution = await undoActionExecution(db, {
    executionId,
    approve: options.approve === true,
  });
  db.close();
  console.log(JSON.stringify(execution, null, 2));
}

async function runSyncAnythingLlm(options) {
  const db = openDatabase(options.dbPath);
  const result = await syncExtractedFilesToAnythingLlm(db, {
    fileId: options.fileId,
    limit: Number.isFinite(options.limit) ? options.limit : 25,
  });
  db.close();
  console.log(JSON.stringify(result, null, 2));
}

async function runInsights(options) {
  const db = openDatabase(options.dbPath);
  const result = await generateFileInsights(db, {
    fileId: options.fileId,
    limit: Number.isFinite(options.limit) ? options.limit : 25,
    useOllama: options.useOllama === true,
  });
  const rows = listFileInsights(db, { fileId: options.fileId, limit: Number.isFinite(options.limit) ? options.limit : 25 });
  db.close();
  console.table(rows.map((row) => ({
    filename: row.filename,
    classification: row.classification,
    provider: row.provider,
    summary: row.summary,
  })));
  console.log(JSON.stringify({ generated: result.generated }, null, 2));
}

function runEmbeddings(options) {
  const db = openDatabase(options.dbPath);
  const result = generateEmbeddings(db, {
    fileId: options.fileId,
    limit: Number.isFinite(options.limit) ? options.limit : 1000,
  });
  db.close();
  console.log(JSON.stringify(result, null, 2));
}

function runDuplicates(options) {
  const db = openDatabase(options.dbPath);
  const result = findDuplicateFiles(db);
  db.close();
  console.log(JSON.stringify(result, null, 2));
}

async function runWatch(folderPath, options) {
  const db = openDatabase(options.dbPath);
  const result = await startFolderWatcher(db, { rootPath: folderPath });
  console.log(JSON.stringify(result, null, 2));
  console.log('Watcher is running. Press Ctrl+C to stop this process.');
}

function runUnwatch(folderPath, options) {
  const db = openDatabase(options.dbPath);
  const result = stopFolderWatcher(db, { rootPath: folderPath });
  db.close();
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const { command, positionals, options } = parseArgs(process.argv.slice(2));

  if (command === 'index') {
    await runIndex(positionals[0], options);
    return;
  }

  if (command === 'extract') {
    await runExtract(options);
    return;
  }

  if (command === 'list') {
    runList(options);
    return;
  }

  if (command === 'search') {
    runSearch(positionals.join(' '), options);
    return;
  }

  if (command === 'semantic') {
    runSemantic(positionals.join(' '), options);
    return;
  }

  if (command === 'chat') {
    await runChat(positionals.join(' '), options);
    return;
  }

  if (command === 'suggest') {
    runSuggest(positionals[0], options);
    return;
  }

  if (command === 'preview') {
    await runPreview(positionals[0], options);
    return;
  }

  if (command === 'execute') {
    await runExecute(positionals[0], options);
    return;
  }

  if (command === 'undo') {
    await runUndo(positionals[0], options);
    return;
  }

  if (command === 'sync-anythingllm') {
    await runSyncAnythingLlm(options);
    return;
  }

  if (command === 'insights') {
    await runInsights(options);
    return;
  }

  if (command === 'embeddings') {
    runEmbeddings(options);
    return;
  }

  if (command === 'duplicates') {
    runDuplicates(options);
    return;
  }

  if (command === 'watch') {
    await runWatch(positionals[0], options);
    return;
  }

  if (command === 'unwatch') {
    runUnwatch(positionals[0], options);
    return;
  }

  printUsage();
  process.exitCode = command ? 1 : 0;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
