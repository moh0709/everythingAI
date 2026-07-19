#!/usr/bin/env node
/** Read-only heartbeat watchdog check for the systemd timer. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] ?? fallback : fallback;
}

const root = resolve(arg('--root', process.cwd()));
const service = arg('--service', 'hermes-poller.service');
const thresholdMs = Number(arg('--stale-ms', '120000'));
const heartbeatPath = resolve(root, '.hermes/runtime/heartbeat.json');
const now = Date.now();

function fail(result, evidence) {
  console.error(JSON.stringify({ ok: false, result, evidence }, null, 2));
  process.exitCode = 1;
}

if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
  fail('INVALID_CONFIGURATION', ['--stale-ms must be a positive number']);
} else if (!existsSync(heartbeatPath)) {
  fail('HEARTBEAT_MISSING', ['heartbeat file is absent']);
} else {
  let heartbeat;
  try {
    heartbeat = JSON.parse(readFileSync(heartbeatPath, 'utf8'));
  } catch {
    fail('HEARTBEAT_INVALID', ['heartbeat file is not valid JSON']);
  }

  if (heartbeat) {
    const timestamp = Date.parse(heartbeat.lastHeartbeat ?? '');
    const ageMs = Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : null;
    if (ageMs === null || ageMs > thresholdMs) {
      fail('HEARTBEAT_STALE', [`heartbeat age ${ageMs ?? 'unknown'}ms exceeds ${thresholdMs}ms`]);
    } else {
      try {
        execFileSync('systemctl', ['is-active', '--quiet', service], { stdio: 'ignore' });
        console.log(JSON.stringify({ ok: true, result: 'HEALTHY', service, ageMs }, null, 2));
      } catch {
        fail('SERVICE_INACTIVE', [`systemd reports ${service} is not active`]);
      }
    }
  }
}
