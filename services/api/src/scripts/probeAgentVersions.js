import { detectAgentIntegration, getBridgeStatus, runAgentProbe, bridgeSecurityNotice } from '../agents/localAgentBridge.js';
import { getDefaultAiProviderSettings } from '../settings/aiProviderSettings.js';

const DEFAULT_TARGETS = ['codex', 'claudeCode'];
const requestedTargets = process.argv.slice(2).filter(Boolean);
const targets = requestedTargets.length ? requestedTargets : DEFAULT_TARGETS;

const settings = getDefaultAiProviderSettings();
const status = getBridgeStatus(settings.agentIntegrations);
const security = bridgeSecurityNotice();

function formatBoolean(value) {
  return value ? 'yes' : 'no';
}

function printHeader() {
  console.log('EverythingAI Agent Version Probe');
  console.log('=================================');
  console.log(`Bridge enabled: ${formatBoolean(status.bridgeEnabled)}`);
  console.log(`Chat enabled:   ${formatBoolean(status.chatEnabled)}`);
  console.log(`Platform:       ${status.platform}`);
  console.log(`Safe action:    version`);
  console.log('');
  console.log('Safety boundary:');
  console.log(`- Command execution default: ${security.commandExecutionDefault}`);
  console.log(`- Chat execution default:    ${security.chatExecutionDefault}`);
  console.log(`- Arbitrary shell commands:  ${security.arbitraryCommandExecution ? 'allowed' : 'blocked'}`);
  console.log(`- Bridge flag required:      ${security.enableBridgeFlag}`);
  console.log(`- Chat flag must stay off:   ${security.enableChatFlag}`);
  console.log('');
}

function printProbe(result) {
  console.log(`Connector: ${result.agentId}`);
  console.log(`  action:        ${result.action}`);
  console.log(`  command:       ${result.command || '(none)'}`);
  console.log(`  bridge enabled:${formatBoolean(result.bridgeEnabled)}`);
  console.log(`  ok:            ${formatBoolean(result.ok)}`);
  console.log(`  stdout:        ${result.stdout || '(empty)'}`);
  console.log(`  stderr:        ${result.stderr || '(empty)'}`);
  console.log(`  message:       ${result.message}`);
  console.log('');
}

async function main() {
  printHeader();

  if (status.chatEnabled) {
    console.error('Refusing to run version probes while EVERYTHINGAI_AGENT_CHAT_ENABLED=true. This phase is probe-only, not chat execution.');
    process.exitCode = 1;
    return;
  }

  if (!status.bridgeEnabled) {
    console.error('Bridge execution is disabled. Version probes require explicit local opt-in for this terminal session.');
    console.error('PowerShell example:');
    console.error('$env:EVERYTHINGAI_AGENT_BRIDGE_ENABLED="true"; npm run agents:probe:versions; Remove-Item Env:EVERYTHINGAI_AGENT_BRIDGE_ENABLED');
    process.exitCode = 1;
    return;
  }

  const results = [];

  for (const target of targets) {
    const config = settings.agentIntegrations[target];
    if (!config) {
      console.log(`Connector: ${target}`);
      console.log('  skipped: unknown connector id');
      console.log('');
      results.push({ agentId: target, ok: false, skipped: true, reason: 'unknown' });
      continue;
    }

    const detection = await detectAgentIntegration(target, settings);
    if (!detection.found) {
      console.log(`Connector: ${target}`);
      console.log(`  command:       ${detection.command || '(none)'}`);
      console.log('  skipped:       command not found on PATH');
      console.log(`  message:       ${detection.message}`);
      console.log('');
      results.push({ agentId: target, ok: false, skipped: true, reason: 'missing' });
      continue;
    }

    const probeSettings = {
      ...settings,
      agentIntegrations: {
        ...settings.agentIntegrations,
        [target]: {
          ...config,
          enabled: true,
          chatEnabled: false,
        },
      },
    };

    const result = await runAgentProbe(target, 'version', probeSettings);
    results.push(result);
    printProbe(result);
  }

  const completed = results.filter((result) => result.ok).length;
  const skipped = results.filter((result) => result.skipped).length;
  const failed = results.length - completed - skipped;

  console.log('Summary');
  console.log('-------');
  console.log(`Targets checked:    ${results.length}`);
  console.log(`Version probes OK:  ${completed}`);
  console.log(`Skipped:            ${skipped}`);
  console.log(`Failed probes:      ${failed}`);
  console.log('');
  console.log('Probe only. No chat calls were run, and arbitrary shell commands remain blocked.');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Agent connector version probe failed.');
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
