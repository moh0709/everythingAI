import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  discoverProductionMigrationFiles,
  loadProductionMigrationCatalog,
  readProductionMigrationFile,
} from '../src/db/production/migrationLoader.js';

async function createProductionFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-production-migrations-'));
  const production = path.join(root, 'production');
  const nested = path.join(production, 'nested');

  await fs.mkdir(nested, { recursive: true });
  await fs.writeFile(path.join(production, '001_identity_workspace_schema.sql'), '-- migration one');
  await fs.writeFile(path.join(nested, '002_followup.sql'), '-- migration two');
  await fs.writeFile(path.join(nested, 'ignore.txt'), 'not a migration');

  return { root, production };
}

test('discovers production schema files without executing them', async () => {
  const { production } = await createProductionFixture();

  const catalog = await loadProductionMigrationCatalog({ rootDir: production });
  const files = await discoverProductionMigrationFiles({ rootDir: production });

  assert.equal(catalog.autoRun, false);
  assert.equal(catalog.count, 2);
  assert.equal(files.length, 2);
  assert.deepEqual(files.map((file) => file.relativePath), [
    '001_identity_workspace_schema.sql',
    'nested/002_followup.sql',
  ]);
  assert.equal(files[0].migrationId, '001_identity_workspace_schema');
  assert.match(files[1].absolutePath, /nested[\\/]002_followup\.sql$/);
});

test('reads an explicitly requested migration file and blocks traversal outside the root', async () => {
  const { production } = await createProductionFixture();

  const content = await readProductionMigrationFile('001_identity_workspace_schema.sql', { rootDir: production });

  assert.match(content, /migration one/);
  await assert.rejects(
    () => readProductionMigrationFile('../escape.sql', { rootDir: production }),
    /Refusing to read migration outside root/,
  );
});
