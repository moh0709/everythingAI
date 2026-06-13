import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { getDefaultAiProviderSettings } from '../settings/aiProviderSettings.js';

const execFileAsync = promisify(execFile);
const BRIDGE_ENABLED = process.env.EVERYTHINGAI_AGENT_BRIDGE_ENABLED === 'true';
const CHAT_ENABLED = process.env.EVERYTHINGAI_AGENT_CHAT_ENABLED === 'true';
const COMMAND_TIMEOUT_MS = Number.parseInt(process.env.EVERYTHINGAI_AGENT_BRIDGE_TIMEOUT_MS || '12000', 10);
const CHAT_TIMEOUT_MS = Number.parseInt(process.env.EVERYTHINGAI_AGENT_CHAT_TIMEOUT_MS || '120000', 10);

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

function sanitizeArg(arg = '') {
  const value = String(arg);
  if (/[;&|`$<>\n\r]/.test(value)) return null;
  return value;
}

function safeArgs(args = []) {
  const cleaned = [];
  for (const arg of args) {
    const value = sanitizeArg(arg);
    if (value === null) return null;
    cleaned.push(value);
  }
  return cleaned;
}

function splitCommand(command = '') {
  const value = command.trim();
  if (!isSafeCommand(value)) return null;
  return { executable: value, args: [] };
}

function normalizeCommandPath(value = '') {
  return String(value).trim().replace(/^"|"$/g, '');
}

function windowsCommandCandidates(commandPathOrName) {
  const value = normalizeCommandPath(commandPathOrName);
  if (!value) return [];

  const ext = path.extname(value).toLowerCase();
  if (ext) return [value];

  return [
    value,
    `${value}.cmd`,
    `${value}.bat`,
    `${value}.exe`,
  ];
}

function preferWindowsExecutable(paths = []) {
  const normalized = paths.map(normalizeCommandPath).filter(Boolean);
  const preferredExtensions = ['.cmd', '.bat', '.exe'];

  for (const extension of preferredExtensions) {
    const match = normalized.find((item) => path.extname(item).toLowerCase() === extension);
    if (match) return match;
  }

  for (const item of normalized) {
    for (const candidate of windowsCommandCandidates(item)) {
      if (fs.existsSync(candidate) && path.extname(candidate).toLowerCase() !== '.ps1') return candidate;
    }
  }

  return normalized[0] || null;
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
    const matches = result.stdout.trim().split(/\r?\n/).map(normalizeCommandPath).filter(Boolean);
    const resolved = platform === 'win32' ? preferWindowsExecutable(matches) : (matches[0] || command);
    return { found: true, path: resolved || command };
  } catch {
    return { found: false, path: null };
  }
}

async function resolveLaunchCommand(command) {
  const parsed = splitCommand(command);
  if (!parsed) return null;

  if (os.platform() !== 'win32') {
    return { executable: parsed.executable, argsPrefix: parsed.args, shell: false };
  }

  const lookup = await commandExists(parsed.executable);
  const resolvedPath = lookup.found ? lookup.path : parsed.executable;
  const candidates = windowsCommandCandidates(resolvedPath);
  const executablePath = candidates.find((candidate) => fs.existsSync(candidate)) || resolvedPath;
  const extension = path.extname(executablePath).toLowerCase();

  if (extension === '.cmd' || extension === '.bat') {
    return {
      executable: process.env.ComSpec || 'cmd.exe',
      argsPrefix: ['/d', '/s', '/c', `"${executablePath}"`, ...parsed.args],
      shell: false,
    };
  }

  if (extension === '.ps1') {
    return null;
  }

  return { executable: executablePath, argsPrefix: parsed.args, shell: false };
}

async function runCommand({ command, args = [], input = '', timeoutMs = COMMAND_TIMEOUT_MS }) {
  const launch = await resolveLaunchCommand(command);
  const cleanedArgs = safeArgs(args);
  if (!launch || !cleanedArgs) return { ok: false, stdout: '', stderr: 'Unsafe command or arguments.' };

  try {
    const result = await execFileAsync(launch.executable, [...launch.argsPrefix, ...cleanedArgs], {
      timeout: timeoutMs,
      windowsHide: true,
      shell: launch.shell,
      cwd: process.cwd(),
      env: process.env,
      input,
      maxBuffer: 1024 * 1024,
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

async function runSafeCommand(command, action = 'version') {
  const args = SAFE_ACTIONS[action];
  if (!args) return { ok: false, stdout: '', stderr: `Unsupported bridge action: ${action}` };
  if (!BRIDGE_ENABLED) {
    return {
      ok: false,
      stdout: '',
      stderr: 'Local agent bridge command execution is disabled. Set EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true on the local machine to enable safe probes.',
    };
  }
  return runCommand({ command, args, timeoutMs: COMMAND_TIMEOUT_MS });
}

export function mergeAgentIntegrations(settings = {}) {
  return { ...DEFAULT_AGENT_CONFIG, ...(settings.agentIntegrations || settings || {}) };
}

export function getBridgeStatus(agentIntegrations = {}) {
  const integrations = mergeAgentIntegrations(agentIntegrations);
  return {
    bridgeEnabled: BRIDGE_ENABLED,
    chatEnabled: CHAT_ENABLED,
    platform: os.platform(),
    cwd: process.cwd(),
    timeoutMs: COMMAND_TIMEOUT_MS,
    chatTimeoutMs: CHAT_TIMEOUT_MS,
    supportedSafeActions: Object.keys(SAFE_ACTIONS),
    integrations: Object.fromEntries(Object.entries(integrations).map(([id, config]) => [id, {
      ...config,
      commandSafe: isSafeCommand(config.command || ''),
      executionEnabled: BRIDGE_ENABLED && Boolean(config.enabled),
      chatExecutionEnabled: BRIDGE_ENABLED && CHAT_ENABLED && Boolean(config.enabled) && Boolean(config.chatEnabled),
    }])),
  };
}

export async function detectAgentIntegration(agentId, settings = {}) {
  const integrations = mergeAgentIntegrations(settings);
  const config = integrations[agentId];
  if (!config) return { agentId, known: false, found: false, message: 'Unknown agent integration.' };
  if (!isSafeCommand(config.command || '')) {
    return { agentId, known: true, found: false, command: config.command, message: 'Command is empty or contains unsafe shell characters.' };
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
    chatEnabled: Boolean(config.chatEnabled),
    message: lookup.found ? `${agentId} command found.` : `${agentId} command was not found on PATH.`,
  };
}

export async function runAgentProbe(agentId, action, settings = {}) {
  const integrations = mergeAgentIntegrations(settings);
  const config = integrations[agentId];
  if (!config) return { agentId, ok: false, message: 'Unknown agent integration.' };
  if (!config.enabled) return { agentId, ok: false, message: 'Agent integration is disabled in settings.' };
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

function buildAgentPrompt({ message, context = [] }) {
  const contextText = Array.isArray(context) && context.length
    ? `\n\nContext from EverythingAI:\n${context.map((item, index) => `Source ${index + 1}: ${item.filename || item.title || 'Unknown'}\n${item.absolute_path || ''}\n${item.snippet || item.text || ''}`).join('\n\n')}`
    : '';
  return `${message}${contextText}`.slice(0, 50000);
}

export async function chatWithAgent(agentId, { message, context = [] } = {}, settings = {}) {
  const integrations = mergeAgentIntegrations(settings);
  const config = integrations[agentId];
  if (!config) return { agentId, ok: false, message: 'Unknown agent integration.' };
  if (!config.enabled) return { agentId, ok: false, message: 'Agent integration is disabled in settings.' };
  if (!config.chatEnabled) return { agentId, ok: false, message: 'Agent chat is disabled for this integration.' };
  if (config.chatMode === 'disabled') return { agentId, ok: false, message: 'This integration does not support CLI chat mode yet.' };
  if (!BRIDGE_ENABLED || !CHAT_ENABLED) {
    return {
      agentId,
      ok: false,
      message: 'Agent chat execution is disabled. Set EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true and EVERYTHINGAI_AGENT_CHAT_ENABLED=true on the local machine.',
    };
  }
  if (!message || !String(message).trim()) return { agentId, ok: false, message: 'message is required.' };

  const input = buildAgentPrompt({ message: String(message).slice(0, config.maxInputChars || 12000), context });
  const chatArgs = Array.isArray(config.chatArgs) ? config.chatArgs : [];
  const args = config.chatMode === 'argv' ? [...chatArgs, input] : chatArgs;
  const stdin = config.chatMode === 'argv' ? '' : input;

  const result = await runCommand({
    command: config.command,
    args,
    input: stdin,
    timeoutMs: config.timeoutMs || CHAT_TIMEOUT_MS,
  });

  return {
    agentId,
    ok: result.ok,
    answer: result.stdout,
    stderr: result.stderr,
    command: config.command,
    chatMode: config.chatMode,
    bridgeEnabled: BRIDGE_ENABLED,
    chatEnabled: CHAT_ENABLED,
    message: result.ok ? `${agentId} answered.` : `${agentId} chat failed.`,
  };
}

export function bridgeSecurityNotice() {
  return {
    commandExecutionDefault: 'disabled',
    chatExecutionDefault: 'disabled',
    enableBridgeFlag: 'EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true',
    enableChatFlag: 'EVERYTHINGAI_AGENT_CHAT_ENABLED=true',
    safeProbeActionsOnly: Object.keys(SAFE_ACTIONS),
    arbitraryCommandExecution: false,
    notes: [
      'The bridge never accepts arbitrary shell commands from the browser.',
      'Only configured agent commands can be probed or chatted with.',
      'Chat execution requires both bridge and chat flags to be enabled locally.',
      'Arguments are taken from saved integration settings, not from arbitrary user input.',
      'The user message is passed through stdin or a configured argument mode only.',
    ],
  };
}
