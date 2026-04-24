import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4100;
const API_TOKEN = process.env.API_TOKEN || 'replace-with-your-local-development-token';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(morgan('dev'));

const memoryStore = {
  devices: new Map(),
  files: new Map(),
};

function requireApiToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== API_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid bearer token.',
    });
  }

  next();
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'everythingai-api',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/devices/register', requireApiToken, (req, res) => {
  const { hostname, platform, agentVersion } = req.body;

  if (!hostname) {
    return res.status(400).json({ error: 'hostname is required' });
  }

  const deviceId = nanoid();
  const device = {
    id: deviceId,
    hostname,
    platform: platform || 'unknown',
    agentVersion: agentVersion || '0.1.0',
    registeredAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  memoryStore.devices.set(deviceId, device);

  res.status(201).json({ device });
});

app.get('/api/devices', requireApiToken, (_req, res) => {
  res.json({ devices: Array.from(memoryStore.devices.values()) });
});

app.post('/api/files/ingest', requireApiToken, (req, res) => {
  const { deviceId, files } = req.body;

  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  if (!Array.isArray(files)) {
    return res.status(400).json({ error: 'files must be an array' });
  }

  const device = memoryStore.devices.get(deviceId);
  if (!device) {
    return res.status(404).json({ error: 'device not found' });
  }

  const now = new Date().toISOString();
  device.lastSeenAt = now;

  let ingested = 0;

  for (const file of files) {
    if (!file.fullPath || !file.filename) continue;

    const fileId = file.hash ? `${deviceId}:${file.hash}` : `${deviceId}:${file.fullPath}`;

    memoryStore.files.set(fileId, {
      id: fileId,
      deviceId,
      filename: file.filename,
      fullPath: file.fullPath,
      extension: file.extension || '',
      size: file.size || 0,
      createdAt: file.createdAt || null,
      modifiedAt: file.modifiedAt || null,
      hash: file.hash || null,
      indexedAt: now,
      status: 'metadata_indexed',
    });

    ingested += 1;
  }

  res.status(201).json({ ingested });
});

app.get('/api/files', requireApiToken, (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  let files = Array.from(memoryStore.files.values());

  if (q) {
    files = files.filter((file) => {
      return (
        file.filename.toLowerCase().includes(q) ||
        file.fullPath.toLowerCase().includes(q) ||
        file.extension.toLowerCase().includes(q)
      );
    });
  }

  res.json({ files });
});

app.listen(PORT, () => {
  console.log(`EverythingAI API listening on port ${PORT}`);
});
