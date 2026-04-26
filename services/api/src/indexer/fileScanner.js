import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mime from 'mime-types';
import { hashFile } from './hash.js';

const EXCLUDED_NAMES = new Set([
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
]);

function toIsoDate(date) {
  return date instanceof Date && !Number.isNaN(date.valueOf()) ? date.toISOString() : null;
}

function normalizeForId(filePath) {
  return path.resolve(filePath).toLowerCase();
}

function createFileId(filePath) {
  return crypto.createHash('sha256').update(normalizeForId(filePath)).digest('hex');
}

function isExcludedName(name) {
  return EXCLUDED_NAMES.has(name.toLowerCase());
}

function isPathInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function scanFolder(rootPath, { onRecord, logger = console } = {}) {
  const absoluteRoot = path.resolve(rootPath);
  const rootStats = await fs.stat(absoluteRoot);

  if (!rootStats.isDirectory()) {
    throw new Error(`Path is not a directory: ${absoluteRoot}`);
  }

  const counters = {
    scanned: 0,
    indexed: 0,
    failed: 0,
    skipped: 0,
  };

  async function emit(record) {
    counters.scanned += 1;
    if (record.index_status === 'indexed') counters.indexed += 1;
    if (record.index_status === 'failed') counters.failed += 1;
    if (onRecord) await onRecord(record);
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

      if (isExcludedName(entry.name)) {
        counters.skipped += 1;
        continue;
      }

      if (!isPathInside(entryPath, absoluteRoot)) {
        counters.skipped += 1;
        continue;
      }

      if (entry.isSymbolicLink()) {
        counters.skipped += 1;
        continue;
      }

      if (entry.isDirectory()) {
        await scanDirectory(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        counters.skipped += 1;
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
        modified_at: toIsoDate(stats.mtime),
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
    ...counters,
  };
}
