import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { getDefaultAiProviderSettings, mergeAiProviderSettings } from '../settings/aiProviderSettings.js';

const execFileAsync = promisify(execFile);
const BRIDGE_ENABLED = process.env.EVERYTHINGAI_AGENT_BRIDGE_ENABLED === 'true';
const COMMAND_TIMEOUT_MS = Number.parseInt(process.env.EVERYTHINGAI_AGENT_BRIDGE_TIMEOUT_MS || '12000', 10);

const SAFE_ACTIONS = {
  version: ['--version'],
  help: ['--help'],
};

const DEFAULT_AGENT_CONFIG = getDefaultAiProviderSettings().agentIntegrations;

function isSafeCommand(command = '') {
  const value = command.trim();
  if (!value) return false;
  if (/[;&|`$<>\n\r]/.test(value)) return false;
  return true;
}

function splitCommand(command = '') {
  const value = command.trim();
  if (!isSafeCommand(value)) return null;

  // Allow absolute paths with spaces only when wrapped by the OS file path itself is not split.
  // For simple CLI names we use the raw command directly.
  return { executable: value, args: [] };
}

async function commandExists(command) {
  const platform = os.platform();
  const lookupCommand = platform === 'win32' ? 'where' : 'command';
  const lookupArgs = platform === 'win32' ? [command] : ['-v', command];

  try {
    const result = await execFileAsync(lookupCommand, lookupArgs, {
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true,
      shell: platform !== 'win32',
    });
    return {
      found: true,
      path: result.stdout.trim().split(/\r?\n/)[0] || command,
    };
  } catch {
    return { found: false, path: null };
  }
}

async function runSafeCommand(command, action = 'version') {
  const parsed = splitCommand(command);
  if (!parsed) {
    return { ok: false, stdout: '', stderr: 'Unsafe or empty command.' };
  }

  const args = SAFE_ACTIONS[action];
  if (!args) {
    return { ok: false, stdout: '', stderr: `Unsupported bridge action: ${action}` };
  }

  if (!BRIDGE_ENABLED) {
    return {
      ok: false,
      stdout: '',
      stderr: 'Local agent bridge command execution is disabled. Set EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true on the local machine to enable safe probes.',
    };
  }

  try {
    const result = await execFileAsync(parsed.executable, [...parsed.args, ...args], {
      timeout: COMMAND_TIMEOUT_MS,
      windowsHide: true,
      shell: false,
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 128,
    });
    return { ok: true, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString().trim() || '',
      stderr: error.stderr?.toString().trim() || error.message,
    };
  }
}

export function mergeAgentIntegrations(settings = {}) {
  return {
    ...DEFAULT_AGENT_CONFIG,
    ...(settings.agentIntegrations || settings || {}),
  };
}

export function getBridgeStatus(agentIntegrations = {}) {
  const integrations = mergeAgentIntegrations(agentIntegrations);
  return {
    bridgeEnabled: BRIDGE_ENABLED,
    platform: os.platform(),
    cwd: process.cwd(),
    timeoutMs: COMMAND_TIMEOUT_MS,
    supportedSafeActions: Object.keys(SAFE_ACTIONS),
    integrations: Object.fromEntries(Object.entries(integrations).map(([id, config]) => [id, {
      ...config,
      commandSafe: isSafeCommand(config.command || ''),
      executionEnabled: BRIDGE_ENABLED && Boolean(config.enabled),
    }])),
  };
}

export async function detectAgentIntegration(agentId, settings = {}) {
  const integrations = mergeAgentIntegrations(settings);
  const config = integrations[agentId];
  if (!config) {
    return { agentId, known: false, found: false, message: 'Unknown agent integration.' };
  }

  if (!isSafeCommand(config.command || '')) {
    return {
      agentId,
      known: true,
      found: false,
      command: config.command,
      message: 'Command is empty or contains unsafe shell characters.',
    };
  }

  const lookup = await commandExists(config.command);
  return {
    agentId,
    known: true,
    enabled: Boolean(config.enabled),
    command: config.command,
    commandPath: lookup.path,
    found: lookup.found,
    mode: config.mode,
    authStrategy: config.authStrategy,
    message: lookup.found ? `${agentId} command found.` : `${agentId} command was not found on PATH.`,
  };
}

export async function runAgentProbe(agentId, action, settings = {}) {
  const integrations = mergeAgentIntegrations(settings);
  const config = integrations[agentId];
  if (!config) {
    return { agentId, ok: false, message: 'Unknown agent integration.' };
  }

  if (!config.enabled) {
    return { agentId, ok: false, message: 'Agent integration is disabled in settings.' };
  }

  const result = await runSafeCommand(config.command, action);
  return {
    agentId,
    action,
    command: config.command,
    bridgeEnabled: BRIDGE_ENABLED,
    ok: result.ok,
    stdout: result.stdout,
    stderr: result.stderr,
    message: result.ok ? `${agentId} ${action} probe completed.` : `${agentId} ${action} probe failed.`,
  };
}

export function bridgeSecurityNotice() {
  return {
    commandExecutionDefault: 'disabled',
    enableFlag: 'EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true',
    safeActionsOnly: Object.keys(SAFE_ACTIONS),
    arbitraryCommandExecution: false,
    notes: [
      'The bridge never accepts arbitrary shell commands from the browser.',
      'Only configured agent commands can be probed.',
      'Only allowlisted probe actions are supported.',
      'Full agent task execution requires a future signed local client-agent protocol.',
    ],
  };
}
