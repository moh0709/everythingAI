import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireApiToken } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createFilesRouter } from './routes/files.routes.js';
import { createSearchRouter } from './routes/search.routes.js';
import { createIntelligenceRouter } from './routes/intelligence.routes.js';
import { createWatchRouter } from './routes/watch.routes.js';
import { createActionsRouter } from './routes/actions.routes.js';
import { createIntegrationsRouter } from './routes/integrations.routes.js';
import { createSystemRouter } from './routes/system.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'everythingai-api',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', requireApiToken, createFilesRouter());
app.use('/api', requireApiToken, createSearchRouter());
app.use('/api', requireApiToken, createIntelligenceRouter());
app.use('/api', requireApiToken, createWatchRouter());
app.use('/api', requireApiToken, createActionsRouter());
app.use('/api', requireApiToken, createIntegrationsRouter());
app.use('/api', requireApiToken, createSystemRouter());

app.use('/api', notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`EverythingAI API listening on port ${PORT}`);
});
