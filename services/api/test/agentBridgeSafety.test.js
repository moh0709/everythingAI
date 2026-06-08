import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bridgeSecurityNotice,
  chatWithAgent,
  detectAgentIntegration,
  getBridgeStatus,
  runAgentProbe,
} from '../src/agents/localAgentBridge.js';
import { getDefaultAiProviderSettings } from '../src/settings/aiProviderSettings.js';

const PRIMARY_CONNECTORS = ['codex', 'claudeCode', 'openCode'];
const CATALOG_CONNECTORS = ['codex', 'claudeCode', 'openCode', 'kiloCode', 'aider', 'continue', 'cline'];

function agentSettings(overrides = {}) {
  const settings = getDefaultAiProviderSettings();
  return {
    ...settings,
    agentIntegrations: {
      ...settings.agentIntegrations,
      ...(overrides.agentIntegrations || {}),
    },
  };
}

test('agent bridge defaults keep connector execution and chat disabled', () => {
  const settings = agentSettings();
  const status = getBridgeStatus(settings.agentIntegrations);

  assert.equal(status.bridgeEnabled, false);
  assert.equal(status.chatEnabled, false);
  assert.deepEqual(status.supportedSafeActions, ['version', 'help']);

  for (const connectorId of CATALOG_CONNECTORS) {
    const integration = status.integrations[connectorId];
    assert.ok(integration, `${connectorId} should exist in the default connector catalog`);
    assert.equal(integration.commandSafe, true, `${connectorId} command should be safe by default`);
    assert.equal(integration.executionEnabled, false, `${connectorId} execution must be disabled by default`);
    assert.equal(integration.chatExecutionEnabled, false, `${connectorId} chat execution must be disabled by default`);
  }
});

test('primary connector catalog contains expected safe commands and disabled flags', () => {
  const settings = agentSettings();

  const expected = {
    codex: { command: 'codex', authStrategy: 'codex-app' },
    claudeCode: { command: 'claude', authStrategy: 'external-app' },
    openCode: { command: 'opencode', authStrategy: 'external-app' },
  };

  for (const connectorId of PRIMARY_CONNECTORS) {
    const integration = settings.agentIntegrations[connectorId];
    assert.ok(integration, `${connectorId} should be configured`);
    assert.equal(integration.command, expected[connectorId].command);
    assert.equal(integration.authStrategy, expected[connectorId].authStrategy);
    assert.equal(integration.enabled, false, `${connectorId} must not be enabled by default`);
    assert.equal(integration.chatEnabled, false, `${connectorId} chat must not be enabled by default`);
    assert.equal(integration.allowWorkspaceContext, false, `${connectorId} must not allow workspace context by default`);
  }
});

test('agent detection rejects unsafe connector command overrides before PATH lookup', async () => {
  const result = await detectAgentIntegration('codex', agentSettings({
    agentIntegrations: {
      codex: {
        command: 'codex; rm -rf .',
        enabled: true,
      },
    },
  }));

  assert.equal(result.known, true);
  assert.equal(result.found, false);
  assert.equal(result.command, 'codex; rm -rf .');
  assert.match(result.message, /unsafe shell characters/i);
});

test('agent probes refuse to execute even when an integration is enabled unless backend bridge flag is set', async () => {
  for (const connectorId of PRIMARY_CONNECTORS) {
    const result = await runAgentProbe(connectorId, 'version', agentSettings({
      agentIntegrations: {
        [connectorId]: {
          enabled: true,
        },
      },
    }));

    assert.equal(result.agentId, connectorId);
    assert.equal(result.action, 'version');
    assert.equal(result.bridgeEnabled, false);
    assert.equal(result.ok, false);
    assert.match(result.stderr, /EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true/i);
  }
});

test('agent probes only allow explicit safe actions', async () => {
  const result = await runAgentProbe('codex', 'shell', agentSettings({
    agentIntegrations: {
      codex: {
        enabled: true,
      },
    },
  }));

  assert.equal(result.agentId, 'codex');
  assert.equal(result.action, 'shell');
  assert.equal(result.bridgeEnabled, false);
  assert.equal(result.ok, false);
  assert.match(result.stderr, /Unsupported bridge action/i);
});

test('agent chat refuses to execute unless both backend bridge and chat flags are set', async () => {
  for (const connectorId of PRIMARY_CONNECTORS) {
    const result = await chatWithAgent(connectorId, { message: 'hello from safety test' }, agentSettings({
      agentIntegrations: {
        [connectorId]: {
          enabled: true,
          chatEnabled: true,
        },
      },
    }));

    assert.equal(result.agentId, connectorId);
    assert.equal(result.ok, false);
    assert.match(result.message, /EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true/i);
    assert.match(result.message, /EVERYTHINGAI_AGENT_CHAT_ENABLED=true/i);
  }
});

test('agent bridge security notice documents the browser command-execution boundary', () => {
  const notice = bridgeSecurityNotice();

  assert.equal(notice.commandExecutionDefault, 'disabled');
  assert.equal(notice.chatExecutionDefault, 'disabled');
  assert.equal(notice.enableBridgeFlag, 'EVERYTHINGAI_AGENT_BRIDGE_ENABLED=true');
  assert.equal(notice.enableChatFlag, 'EVERYTHINGAI_AGENT_CHAT_ENABLED=true');
  assert.equal(notice.arbitraryCommandExecution, false);
  assert.deepEqual(notice.safeProbeActionsOnly, ['version', 'help']);
  assert.ok(notice.notes.some((note) => /never accepts arbitrary shell commands/i.test(note)));
});
