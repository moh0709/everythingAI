import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const uiDir = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(uiDir, '..', '..');
const apiDir = path.join(repoRoot, 'services', 'api');

const API_URL = process.env.EVERYTHINGAI_API_URL || 'http://127.0.0.1:4100';
const UI_URL = process.env.EVERYTHINGAI_UI_URL || 'http://127.0.0.1:5151';
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const npxCommand = isWindows ? 'npx.cmd' : 'npx';

const children = [];
let shuttingDown = false;

function log(prefix, message) {
  const text = String(message || '').trimEnd();
  if (!text) return;
  for (const line of text.split(/\r?\n/)) {
    console.log(`[${prefix}] ${line}`);
  }
}

function spawnProcess(prefix, command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  children.push(child);
  child.stdout.on('data', (chunk) => log(prefix, chunk));
  child.stderr.on('data', (chunk) => log(prefix, chunk));
  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[${prefix}] exited with code ${code ?? 'null'} signal ${signal ?? 'none'}`);
    }
  });

  return child;
}

function requestStatus(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });

    req.on('error', () => resolve(0));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(0);
    });
  });
}

async function waitForUrl(name, url, acceptedStatuses, timeoutMs = 60000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const status = await requestStatus(url);
    if (acceptedStatuses.includes(status)) {
      console.log(`[smoke] ${name} ready at ${url} with HTTP ${status}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${name} did not become ready at ${url} within ${timeoutMs}ms`);
}

function stopChildren() {
  shuttingDown = true;
  for (const child of children.reverse()) {
    if (!child.killed && child.exitCode === null) {
      child.kill(isWindows ? undefined : 'SIGTERM');
    }
  }
}

function runPlaywright() {
  return new Promise((resolve) => {
    const child = spawn(npxCommand, ['playwright', 'test', 'smoke/client-admin-smoke.spec.ts', '--browser=chromium', '--headed'], {
      cwd: uiDir,
      env: {
        ...process.env,
        EVERYTHINGAI_API_URL: API_URL,
        EVERYTHINGAI_UI_URL: UI_URL,
      },
      stdio: 'inherit',
      windowsHide: true,
    });

    child.on('exit', (code) => resolve(code || 0));
  });
}

process.on('SIGINT', () => {
  stopChildren();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopChildren();
  process.exit(143);
});

try {
  console.log('[smoke] Starting EverythingAI backend and frontend for local smoke test...');
  spawnProcess('api', npmCommand, ['start'], apiDir);
  await waitForUrl('Backend API', `${API_URL}/api/status`, [200, 401]);

  spawnProcess('ui', npmCommand, ['run', 'dev', '--', '--host', '127.0.0.1'], uiDir, {
    EVERYTHINGAI_API_URL: API_URL,
  });
  await waitForUrl('Frontend UI', UI_URL, [200]);

  const exitCode = await runPlaywright();
  stopChildren();
  process.exit(exitCode);
} catch (error) {
  console.error(`[smoke] ${error?.message || error}`);
  stopChildren();
  process.exit(1);
}
