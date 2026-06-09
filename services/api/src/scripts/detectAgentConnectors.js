import { detectAgentIntegration, getBridgeStatus, bridgeSecurityNotice } from '../agents/localAgentBridge.js';
import { getDefaultAiProviderSettings } from '../settings/aiProviderSettings.js';

const settings = getDefaultAiProviderSettings();
const status = getBridgeStatus(settings.agentIntegrations);
const security = bridgeSecurityNotice();
const connectorIds = Object.keys(settings.agentIntegrations || {});

function formatBoolean(value) {
  return value ? 'yes' : 'no';
}

function printHeader() {
  console.log('EverythingAI Agent Connector Detection');
  console.log('=======================================');
  console.log(`Bridge enabled: ${formatBoolean(status.bridgeEnabled)}`);
  console.log(`Chat enabled:   ${formatBoolean(status.chatEnabled)}`);
  console.log(`Platform:       ${status.platform}`);
  console.log(`Safe actions:   ${status.supportedSafeActions.join(', ')}`);
  console.log('');
  console.log('Safety boundary:');
  console.log(`- Command execution default: ${security.commandExecutionDefault}`);
  console.log(`- Chat execution default:    ${security.chatExecutionDefault}`);
  console.log(`- Arbitrary shell commands:  ${security.arbitraryCommandExecution ? 'allowed' : 'blocked'}`);
  console.log(`- Bridge flag:               ${security.enableBridgeFlag}`);
  console.log(`- Chat flag:                 ${security.enableChatFlag}`);
  console.log('');
}

function printResult(result) {
  console.log(`Connector: ${result.agentId}`);
  console.log(`  known:         ${formatBoolean(result.known)}`);
  console.log(`  enabled:       ${formatBoolean(result.enabled)}`);
  console.log(`  chat enabled:  ${formatBoolean(result.chatEnabled)}`);
  console.log(`  command:       ${result.command || '(none)'}`);
  console.log(`  found on PATH: ${formatBoolean(result.found)}`);
  console.log(`  command path:  ${result.commandPath || '(not found)'}`);
  console.log(`  mode:          ${result.mode || '(unknown)'}`);
  console.log(`  auth:          ${result.authStrategy || '(unknown)'}`);
  console.log(`  message:       ${result.message}`);
  console.log('');
}

async function main() {
  printHeader();

  const results = [];
  for (const connectorId of connectorIds) {
    const result = await detectAgentIntegration(connectorId, settings);
    results.push(result);
    printResult(result);
  }

  const found = results.filter((result) => result.found).length;
  const missing = results.length - found;

  console.log('Summary');
  console.log('-------');
  console.log(`Connectors checked: ${results.length}`);
  console.log(`Found on PATH:      ${found}`);
  console.log(`Missing on PATH:    ${missing}`);
  console.log('');
  console.log('Detection only. No version probes, chat calls, or agent command execution were run by this script.');
}

main().catch((error) => {
  console.error('Agent connector detection failed.');
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
