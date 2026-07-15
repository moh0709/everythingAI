export const RUNTIME_MODES = Object.freeze({
  POLLING: 'POLLING',
  WEBHOOK: 'WEBHOOK',
  UNKNOWN: 'UNKNOWN'
});

const CLI_FLAG = '--mode';
const ENV_FLAG = 'HERMES_RUNTIME_MODE';

function normalizeModeValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'polling') {
    return RUNTIME_MODES.POLLING;
  }
  if (normalized === 'webhook') {
    return RUNTIME_MODES.WEBHOOK;
  }
  return null;
}

function collectCliSignals(argv) {
  const args = Array.isArray(argv) ? argv.slice() : [];
  const signals = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === CLI_FLAG) {
      signals.push({ source: CLI_FLAG, raw: args[index + 1] ?? null });
      index += 1;
      continue;
    }
    if (typeof arg === 'string' && arg.startsWith(`${CLI_FLAG}=`)) {
      signals.push({ source: CLI_FLAG, raw: arg.slice(CLI_FLAG.length + 1) });
    }
  }

  return signals;
}

function collectExplicitSignals({ env = process.env, argv = process.argv.slice(2) } = {}) {
  const signals = collectCliSignals(argv);
  const envMode = env?.[ENV_FLAG];
  if (envMode !== undefined && String(envMode).trim() !== '') {
    signals.push({ source: ENV_FLAG, raw: envMode });
  }
  return signals;
}

function unknownModeResult({ source, evidence, remediation }) {
  return {
    mode: RUNTIME_MODES.UNKNOWN,
    source,
    evidence,
    remediation
  };
}

export function detectRuntimeMode({ env = process.env, argv = process.argv.slice(2) } = {}) {
  const signals = collectExplicitSignals({ env, argv });

  if (signals.length === 0) {
    return unknownModeResult({
      source: 'none',
      evidence: ['no explicit runtime mode found'],
      remediation: 'Pass --mode polling or --mode webhook, or set HERMES_RUNTIME_MODE to the same explicit value.'
    });
  }

  const normalized = signals.map((signal) => ({
    ...signal,
    mode: normalizeModeValue(signal.raw)
  }));

  const invalidSignal = normalized.find((signal) => signal.mode === null);
  if (invalidSignal) {
    return unknownModeResult({
      source: invalidSignal.source,
      evidence: normalized.map((signal) => `${signal.source}=${String(signal.raw).trim()}`),
      remediation: 'Use only polling or webhook as the explicit runtime mode.'
    });
  }

  const uniqueModes = [...new Set(normalized.map((signal) => signal.mode))];
  if (uniqueModes.length > 1) {
    return unknownModeResult({
      source: 'conflict',
      evidence: normalized.map((signal) => `${signal.source}=${String(signal.raw).trim()}`),
      remediation: 'Set exactly one explicit runtime mode value across CLI and environment.'
    });
  }

  const mode = uniqueModes[0];
  const sources = [...new Set(normalized.map((signal) => signal.source))];
  return {
    mode,
    source: sources.join(','),
    evidence: normalized.map((signal) => `${signal.source}=${String(signal.raw).trim()}`)
  };
}
