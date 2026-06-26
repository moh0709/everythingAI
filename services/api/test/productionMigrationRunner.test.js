import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createProductionMigrationPlan,
  createProductionMigrationRunner,
  runProductionMigrationRunner,
} from '../src/db/production/migrationRunner.js';

async function createProductionFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'everythingai-production-runner-'));
  const production = path.join(root, 'production');

  await fs.mkdir(production, { recursive: true });
  await fs.writeFile(path.join(production, '001_identity_workspace_schema.sql'), '-- migration one');
  await fs.writeFile(path.join(production, '002_followup.sql'), '-- migration two');

  return { root, production };
}

test('production migration runner produces safe plan/list/dry-run summaries without executing SQL', async () => {
  const { production } = await createProductionFixture();
  const runner = createProductionMigrationRunner({ rootDir: production });
  let executeSqlCalls = 0;

  const plan = await runner.plan();
  const list = await runner.list();
  const dryRun = await runner.dryRun();
  const directPlan = await createProductionMigrationPlan({ rootDir: production, mode: 'plan' });
  const cliPlan = await runProductionMigrationRunner({ rootDir: production, mode: 'plan' });

  assert.equal(plan.autoRunDisabled, true);
  assert.equal(plan.requiresExplicitExecution, true);
  assert.equal(plan.summary.totalMigrations, 2);
  assert.deepEqual(plan.steps.map((step) => step.migrationId), [
    '001_identity_workspace_schema',
    '002_followup',
  ]);
  assert.deepEqual(list.steps.map((step) => step.status), ['planned', 'planned']);
  assert.equal(dryRun.mode, 'dry-run');
  assert.equal(directPlan.mode, 'plan');
  assert.equal(cliPlan.mode, 'plan');
  assert.equal(executeSqlCalls, 0);
});

test('production migration runner requires an explicit execution guard before apply', async () => {
  const { production } = await createProductionFixture();
  const runner = createProductionMigrationRunner({ rootDir: production });
  let executeSqlCalls = 0;

  await assert.rejects(
    () => runner.apply({ executeSql: async () => {
      executeSqlCalls += 1;
    } }),
    /explicitly enabled|confirmExecution: true/,
  );

  assert.equal(executeSqlCalls, 0);
});