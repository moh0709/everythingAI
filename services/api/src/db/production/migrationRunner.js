import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadProductionMigrationCatalog } from './migrationLoader.js';

const PLAN_MODES = new Set(['plan', 'list', 'dry-run']);
const APPLY_MODE = 'apply';

function normalizeMode(mode) {
  if (typeof mode !== 'string') {
    return 'plan';
  }

  const normalized = mode.trim().toLowerCase();
  return PLAN_MODES.has(normalized) || normalized === APPLY_MODE ? normalized : 'plan';
}

function isTruthyEnv(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function summarizeCatalog(catalog, mode) {
  const steps = catalog.migrations.map((migration, index) => ({
    position: index + 1,
    migrationId: migration.migrationId,
    relativePath: migration.relativePath,
    status: 'planned',
  }));

  return {
    runner: 'production-migration-runner',
    mode,
    autoRunDisabled: true,
    requiresExplicitExecution: true,
    executionEnabled: false,
    catalog,
    steps,
    summary: {
      totalMigrations: catalog.count,
      plannedMigrations: steps.length,
      appliedMigrations: 0,
    },
  };
}

function assertExecutionRequested({ confirmExecution, executeSql }) {
  if (!isTruthyEnv(process.env.EAI_ALLOW_PRODUCTION_MIGRATIONS)) {
    throw new Error('Production migration execution is disabled until EAI_ALLOW_PRODUCTION_MIGRATIONS is explicitly enabled.');
  }

  if (confirmExecution !== true) {
    throw new Error('Production migration execution requires confirmExecution: true.');
  }

  if (typeof executeSql !== 'function') {
    throw new Error('Production migration execution requires an executeSql function.');
  }
}

export async function createProductionMigrationPlan(options = {}) {
  const mode = normalizeMode(options.mode);
  const rootDir = options.rootDir;
  const catalog = await loadProductionMigrationCatalog({ rootDir });
  return summarizeCatalog(catalog, mode);
}

export function createProductionMigrationRunner(options = {}) {
  const rootDir = options.rootDir;

  return {
    rootDir,
    plan: async () => createProductionMigrationPlan({ ...options, rootDir, mode: 'plan' }),
    list: async () => createProductionMigrationPlan({ ...options, rootDir, mode: 'list' }),
    dryRun: async () => createProductionMigrationPlan({ ...options, rootDir, mode: 'dry-run' }),
    apply: async (applyOptions = {}) => {
      assertExecutionRequested(applyOptions);

      const plan = await createProductionMigrationPlan({ ...options, rootDir, mode: APPLY_MODE });
      const applied = [];

      for (const migration of plan.catalog.migrations) {
        await applyOptions.executeSql(migration);
        applied.push(migration.migrationId);
      }

      return {
        ...plan,
        executionEnabled: true,
        executionStatus: 'applied',
        appliedMigrations: applied,
      };
    },
  };
}

export async function runProductionMigrationRunner(options = {}) {
  const runner = createProductionMigrationRunner(options);
  const mode = normalizeMode(options.mode);

  if (mode === 'list') {
    return runner.list();
  }

  if (mode === 'dry-run') {
    return runner.dryRun();
  }

  if (mode === APPLY_MODE) {
    return runner.apply(options);
  }

  return runner.plan();
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((value) => value.startsWith('--')));
  const rootDirArgIndex = args.indexOf('--root-dir');

  return {
    mode: flags.has('--apply') ? 'apply' : flags.has('--list') ? 'list' : flags.has('--dry-run') ? 'dry-run' : 'plan',
    confirmExecution: flags.has('--confirm-production-migrations'),
    rootDir: rootDirArgIndex >= 0 ? args[rootDirArgIndex + 1] : undefined,
  };
}

async function main(argv) {
  const cli = parseCliArgs(argv);
  const runner = createProductionMigrationRunner({ rootDir: cli.rootDir ? path.resolve(cli.rootDir) : undefined });

  if (cli.mode === 'apply') {
    const result = await runner.apply({
      confirmExecution: cli.confirmExecution,
      executeSql: async () => {
        throw new Error('Production migration execution is not enabled in this scaffolding build.');
      },
    });

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const result = await runProductionMigrationRunner({ ...cli, rootDir: runner.rootDir });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main(process.argv).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}