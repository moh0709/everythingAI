import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const API_URL = process.env.EVERYTHINGAI_API_URL || 'http://localhost:4100';
const API_TOKEN = process.env.EVERYTHINGAI_API_TOKEN || 'replace-with-your-local-development-token';
const SCAN_PATH = process.env.EVERYTHINGAI_SCAN_PATH || process.cwd();

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
};

async function hashFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function walkDirectory(rootPath) {
  const results = [];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      const nested = await walkDirectory(fullPath);
      results.push(...nested);
      continue;
    }

    if (!entry.isFile()) continue;

    try {
      const stat = await fs.stat(fullPath);
      const hash = await hashFile(fullPath);

      results.push({
        filename: entry.name,
        fullPath,
        extension: path.extname(entry.name).replace('.', '').toLowerCase(),
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
        hash,
      });
    } catch (error) {
      console.warn(`Skipped file: ${fullPath}`);
      console.warn(error.message);
    }
  }

  return results;
}

async function registerDevice() {
  const response = await fetch(`${API_URL}/api/devices/register`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      hostname: os.hostname(),
      platform: os.platform(),
      agentVersion: '0.1.0',
    }),
  });

  if (!response.ok) {
    throw new Error(`Device registration failed: ${response.status}`);
  }

  const data = await response.json();
  return data.device;
}

async function ingestFiles(deviceId, files) {
  const response = await fetch(`${API_URL}/api/files/ingest`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ deviceId, files }),
  });

  if (!response.ok) {
    throw new Error(`File ingest failed: ${response.status}`);
  }

  return response.json();
}

async function main() {
  console.log(`Scanning folder: ${SCAN_PATH}`);

  const device = await registerDevice();
  console.log(`Registered device: ${device.id}`);

  const files = await walkDirectory(SCAN_PATH);
  console.log(`Found files: ${files.length}`);

  const result = await ingestFiles(device.id, files);
  console.log(`Ingested files: ${result.ingested}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
