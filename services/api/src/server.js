import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db/client.js';
import { createProductionWorkspaceContextMiddleware } from './db/production/index.js';
import { resolveEnterpriseRuntimeConfig, createEnterpriseHealthReporter } from './enterprise/runtimeHealth.js';
import { requireApiToken } from './middleware/auth.js';
import { attachRequestContext } from './middleware/requestContext.js';
import { attachWorkspaceContext } from './middleware/workspaceContext.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createFilesRouter } from './routes/files.routes.js';
import { createSearchRouter } from './routes/search.routes.js';
import { createWikiRouter } from './routes/wiki.routes.js';
import { createIntelligenceRouter } from './routes/intelligence.routes.js';
import { createWatchRouter } from './routes/watch.routes.js';
import { createActionsRouter } from './routes/actions.routes.js';
import { createRecoveryRouter } from './routes/recovery.routes.js';
import { createIntegrationsRouter } from './routes/integrations.routes.js';
import { createSystemRouter } from './routes/system.routes.js';
import { createSourcePathsRouter } from './routes/sourcePaths.routes.js';
import { createProviderSettingsRouter } from './routes/providerSettings.routes.js';
import { createAgentBridgeRouter } from './routes/agentBridge.routes.js';
import { createJobsRouter } from './routes/jobs.routes.js';
import { createPlanningRouter } from './routes/planning.routes.js';
import { createExecutionBatchesRouter } from './routes/executionBatches.routes.js';
import { resumePersistedWatchers } from './watcher/watchService.js';

dotenv.config();

const PORT = process.env.PORT || 4100;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
const operatorUiEntry = path.join(publicDir, 'index.html');

export function resolveWorkspaceContextMiddleware(options = {}, dependencies = {}) {
  const productionWorkspaceResolution = options.productionWorkspaceResolution;

  if (!productionWorkspaceResolution) {
    return attachWorkspaceContext;
  }

  const createProductionWorkspaceContextMiddlewareImpl =
    dependencies.createProductionWorkspaceContextMiddleware ?? createProductionWorkspaceContextMiddleware;
  const productionWorkspaceContextMiddleware = createProductionWorkspaceContextMiddlewareImpl(productionWorkspaceResolution);

  return productionWorkspaceContextMiddleware ?? attachWorkspaceContext;
}

export function createApiApp(options = {}, dependencies = {}) {
  const app = express();
  const workspaceContextMiddleware = resolveWorkspaceContextMiddleware(options, dependencies);
  const runtimeConfig = resolveEnterpriseRuntimeConfig(options.runtimeEnv ?? process.env);
  const healthReporter = createEnterpriseHealthReporter({
    config: runtimeConfig,
    checks: dependencies.enterpriseHealthChecks ?? {},
  });

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(morgan('dev'));

  app.get('/admin', (_req, res) => {
    res.sendFile(operatorUiEntry);
  });

  app.get('/admin/', (_req, res) => {
    res.sendFile(operatorUiEntry);
  });

  app.use(express.static(publicDir, {
    setHeaders(res) {
      if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Cache-Control', 'no-store');
      }
    },
  }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'everythingai-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/live', (_req, res) => {
    res.json(healthReporter.liveness());
  });

  app.get('/health/ready', async (_req, res, next) => {
    try {
      const readiness = await healthReporter.readiness();
      res.status(readiness.status === 'ready' ? 200 : 503).json(readiness);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', attachRequestContext, workspaceContextMiddleware, requireApiToken);

  app.use('/api', createFilesRouter());
  app.use('/api', createSourcePathsRouter());
  app.use('/api', createProviderSettingsRouter());
  app.use('/api', createAgentBridgeRouter());
  app.use('/api', createJobsRouter());
  app.use('/api', createPlanningRouter());
  app.use('/api', createExecutionBatchesRouter());
  app.use('/api', createSearchRouter());
  app.use('/api', createWikiRouter());
  app.use('/api', createIntelligenceRouter());
  app.use('/api', createWatchRouter());
  app.use('/api', createActionsRouter());
  app.use('/api', createRecoveryRouter());
  app.use('/api', createIntegrationsRouter());
  app.use('/api', createSystemRouter());

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function bootstrapPersistedWatchers() {
  const db = openDatabase();
  try {
    const result = await resumePersistedWatchers(db, { logger: console });
    if (result.resumed || result.failed) {
      console.log(`Source path watcher bootstrap complete: ${result.resumed} resumed, ${result.failed} failed.`);
    }
  } catch (error) {
    console.error(`Source path watcher bootstrap failed: ${error.message}`);
  } finally {
    db.close();
  }
}

export function startServer(retries = 5, options = {}, dependencies = {}) {
  const app = createApiApp(options, dependencies);
  const server = app.listen(PORT, () => {
    console.log(`EverythingAI API listening on port ${PORT}`);
    bootstrapPersistedWatchers();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      console.warn(`Port ${PORT} in use, retrying in 1s… (${retries} retries left)`);
      server.close();
      setTimeout(() => startServer(retries - 1, options, dependencies), 1000);
    } else {
      throw err;
    }
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return server;
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  startServer();
}
