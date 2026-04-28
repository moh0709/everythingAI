import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mime from 'mime-types';
import { hashFile } from './hash.js';

const DEFAULT_MAX_FILE_SIZE_BYTES = Number.parseInt(process.env.EVERYTHINGAI_MAX_FILE_SIZE_BYTES || '', 10) || 250 * 1024 * 1024;

const DEFAULT_EXCLUDED_NAMES = [
  '$recycle.bin',
  'system volume information',
  'pagefile.sys',
  'hiberfil.sys',
  'swapfile.sys',
  'windows',
  'program files',
  'program files (x86)',
  'programdata',
  'appdata',
  'node_modules',
  '.git',
];

function toIsoDate(date) {
  return date instanceof Date && !Number.isNaN(date.valueOf()) ? date.toISOString() : null;
}

function normalizeForId(filePath) {
  return path.resolve(filePath).toLowerCase();
}

function createFileId(filePath) {
  return crypto.createHash('sha256').update(normalizeForId(filePath)).digest('hex');
}

function parseCsvSet(value) {
  return new Set((value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean));
}

function normalizeExtension(extension) {
  if (!extension) return '';
  return extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
}

function createScannerConfig(options = {}) {
  const excludedNames = new Set([
    ...DEFAULT_EXCLUDED_NAMES,
    ...(options.excludeNames || []),
    ...parseCsvSet(process.env.EVERYTHINGAI_EXCLUDE_NAMES),
  ].map((name) => name.toLowerCase()));

  const excludedExtensions = new Set([
    ...(options.excludeExtensions || []),
    ...parseCsvSet(process.env.EVERYTHINGAI_EXCLUDE_EXTENSIONS),
  ].map(normalizeExtension));

  return {
    excludedNames,
    excludedExtensions,
    maxFileSizeBytes: Number.isFinite(options.maxFileSizeBytes) && options.maxFileSizeBytes > 0
      ? options.maxFileSizeBytes
      : DEFAULT_MAX_FILE_SIZE_BYTES,
    shouldSkipUnchanged: options.shouldSkipUnchanged,
  };
}

function isExcludedName(name, config) {
  return config.excludedNames.has(name.toLowerCase());
}

function isPathInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function shouldSkipExtension(filename, config) {
  const extension = path.extname(filename).toLowerCase();
  return extension && config.excludedExtensions.has(extension);
}

export async function scanFolder(rootPath, {
  onRecord,
  logger = console,
  maxFileSizeBytes,
  excludeNames,
  excludeExtensions,
  shouldSkipUnchanged,
  onProgress,
} = {}) {
  const absoluteRoot = path.resolve(rootPath);
  const rootStats = await fs.stat(absoluteRoot);
  const config = createScannerConfig({
    maxFileSizeBytes,
    excludeNames,
    excludeExtensions,
    shouldSkipUnchanged,
  });

  if (!rootStats.isDirectory()) {
    throw new Error(`Path is not a directory: ${absoluteRoot}`);
  }

  const counters = {
    scanned: 0,
    indexed: 0,
    failed: 0,
    skipped: 0,
    skipped_unchanged: 0,
    skipped_large: 0,
    skipped_excluded: 0,
  };

  const skippedReasons = [];

  function skip(reason, itemPath) {
    counters.skipped += 1;
    if (reason === 'unchanged') counters.skipped_unchanged += 1;
    if (reason === 'large_file') counters.skipped_large += 1;
    if (reason === 'excluded') counters.skipped_excluded += 1;
    if (skippedReasons.length < 100) skippedReasons.push({ reason, path: itemPath });
  }

  async function emit(record) {
    counters.scanned += 1;
    if (record.index_status === 'indexed') counters.indexed += 1;
    if (record.index_status === 'failed') counters.failed += 1;
    if (onRecord) await onRecord(record);
    if (onProgress && counters.scanned % 50 === 0) onProgress({ ...counters });
  }

  async function scanDirectory(directoryPath) {
    let entries;

    try {
      entries = await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      counters.failed += 1;
      logger.error(`Failed to read directory ${directoryPath}: ${error.message}`);
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);

      if (isExcludedName(entry.name, config)) {
        skip('excluded', entryPath);
        continue;
      }

      if (!isPathInside(entryPath, absoluteRoot)) {
        skip('outside_root', entryPath);
        continue;
      }

      if (entry.isSymbolicLink()) {
        skip('symlink', entryPath);
        continue;
      }

      if (entry.isDirectory()) {
        await scanDirectory(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        skip('not_file', entryPath);
        continue;
      }

      if (shouldSkipExtension(entry.name, config)) {
        skip('excluded', entryPath);
        continue;
      }

      await scanFile(entryPath);
    }
  }

  async function scanFile(filePath) {
    const indexedAt = new Date().toISOString();
    const absolutePath = path.resolve(filePath);
    const filename = path.basename(absolutePath);
    const extension = path.extname(filename).toLowerCase();
    const relativePath = path.relative(absoluteRoot, absolutePath);

    try {
      const stats = await fs.stat(absolutePath);
      const modifiedAt = toIsoDate(stats.mtime);

      if (stats.size > config.maxFileSizeBytes) {
        skip('large_file', absolutePath);
        return;
      }

      if (config.shouldSkipUnchanged?.({ absolutePath, sizeBytes: stats.size, modifiedAt })) {
        skip('unchanged', absolutePath);
        return;
      }

      const contentHash = await hashFile(absolutePath);

      await emit({
        id: createFileId(absolutePath),
        filename,
        absolute_path: absolutePath,
        relative_path: relativePath,
        extension,
        mime_type: mime.lookup(filename) || 'application/octet-stream',
        size_bytes: stats.size,
        created_at: toIsoDate(stats.birthtime),
        modified_at: modifiedAt,
        content_hash: contentHash,
        index_status: 'indexed',
        last_indexed_at: indexedAt,
        error_message: null,
      });
    } catch (error) {
      logger.error(`Failed to index ${absolutePath}: ${error.message}`);

      await emit({
        id: createFileId(absolutePath),
        filename,
        absolute_path: absolutePath,
        relative_path: relativePath,
        extension,
        mime_type: mime.lookup(filename) || 'application/octet-stream',
        size_bytes: null,
        created_at: null,
        modified_at: null,
        content_hash: null,
        index_status: 'failed',
        last_indexed_at: indexedAt,
        error_message: error.message,
      });
    }
  }

  await scanDirectory(absoluteRoot);
  return {
    rootPath: absoluteRoot,
    maxFileSizeBytes: config.maxFileSizeBytes,
    ...counters,
    skippedReasons,
  };
}
