import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function walkSqlFiles(rootDir, relativeDir = '') {
  const absoluteDir = path.resolve(rootDir, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    const absolutePath = path.resolve(rootDir, relativePath);

    if (entry.isDirectory()) {
      files.push(...await walkSqlFiles(rootDir, relativePath));
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.sql')) {
      continue;
    }

    files.push({
      migrationId: relativePath.replace(/\.sql$/i, '').replaceAll(path.sep, '/'),
      filename: entry.name,
      relativePath: relativePath.replaceAll(path.sep, '/'),
      absolutePath,
    });
  }

  return files;
}

export function getProductionMigrationsRoot() {
  return __dirname;
}

export async function discoverProductionMigrationFiles({ rootDir = getProductionMigrationsRoot() } = {}) {
  const files = await walkSqlFiles(rootDir);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export async function loadProductionMigrationCatalog(options = {}) {
  const rootDir = options.rootDir ?? getProductionMigrationsRoot();
  const migrations = await discoverProductionMigrationFiles({ rootDir });

  return {
    rootDir,
    autoRun: false,
    count: migrations.length,
    migrations,
  };
}

export async function readProductionMigrationFile(relativePath, { rootDir = getProductionMigrationsRoot() } = {}) {
  if (typeof relativePath !== 'string' || relativePath.trim().length === 0) {
    throw new TypeError('relativePath must be a non-empty string');
  }

  const absoluteRoot = path.resolve(rootDir);
  const absolutePath = path.resolve(rootDir, relativePath);

  if (!absolutePath.startsWith(absoluteRoot + path.sep) && absolutePath !== absoluteRoot) {
    throw new Error(`Refusing to read migration outside root: ${relativePath}`);
  }

  return fs.readFile(absolutePath, 'utf8');
}
