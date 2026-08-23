import { useEffect, useState } from 'react';
import { Server } from 'lucide-react';
import type { ProviderModels, ProviderName, ProviderSettings } from '../../providerSettingsApi';
import { providerLabel } from '../../providerCatalog';

type ProviderConfigurationPanelProps = {
  draft: ProviderSettings;
  providerSettings: ProviderSettings | null;
  providerModels: ProviderModels | null;
  update: (path: string, value: unknown) => void;
};

export function ProviderConfigurationPanel({ draft, providerSettings, providerModels, update }: ProviderConfigurationPanelProps) {
  const active = draft.activeProvider;
  const models = providerModels?.[active] || [];

  return <div className="panel">
    <h2><Server /> {providerLabel(active)} Configuration</h2>

    {active === 'ollama' ? <div className="settings-grid">
      <label>
        Endpoint URL
        <input value={draft.ollama.endpoint} onChange={(event) => update('ollama.endpoint', event.target.value)} />
      </label>
      <label>
        Model
        <select value={draft.ollama.model} onChange={(event) => update('ollama.model', event.target.value)}>
          {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
      </label>
      <label>
        Temperature: {draft.ollama.temperature}
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={draft.ollama.temperature}
          onChange={(event) => update('ollama.temperature', Number(event.target.value))}
        />
      </label>
      <label>
        Max Tokens
        <input type="number" value={draft.ollama.maxTokens} onChange={(event) => update('ollama.maxTokens', Number(event.target.value))} />
      </label>
      <label>
        Timeout MS
        <input type="number" value={draft.ollama.timeoutMs} onChange={(event) => update('ollama.timeoutMs', Number(event.target.value))} />
      </label>
    </div> : <RemoteProviderConfiguration active={active} draft={draft} providerSettings={providerSettings} providerModels={providerModels} update={update} />}
  </div>;
}

type RemoteProviderConfigurationProps = {
  active: Exclude<ProviderName, 'ollama'>;
  draft: ProviderSettings;
  providerSettings: ProviderSettings | null;
  providerModels: ProviderModels | null;
  update: (path: string, value: unknown) => void;
};

function RemoteProviderConfiguration({ active, draft, providerSettings, providerModels, update }: RemoteProviderConfigurationProps) {
  const activeBlock = draft[active];
  const savedBlock = providerSettings?.[active];
  const models = providerModels?.[active] || [];
  const hasSavedApiKey = savedBlock?.apiKey === '__saved__';
  const isPreservedSavedKey = hasSavedApiKey && activeBlock.apiKey === '__saved__';
  const isClearPending = hasSavedApiKey && activeBlock.apiKey === '';
  const isReplacementStaged = hasSavedApiKey && activeBlock.apiKey !== '' && activeBlock.apiKey !== '__saved__';
  const isNewKeyStaged = !hasSavedApiKey && activeBlock.apiKey !== '';
  const [editingSavedKey, setEditingSavedKey] = useState(false);

  useEffect(() => {
    setEditingSavedKey(false);
  }, [active, hasSavedApiKey]);

  const apiKeyValue = isPreservedSavedKey ? '' : activeBlock.apiKey;
  const keyStatus = isClearPending
    ? 'Clear pending'
    : isReplacementStaged
      ? 'Replacement key staged'
      : isPreservedSavedKey
        ? 'Saved key preserved'
        : isNewKeyStaged
          ? 'New key staged'
          : 'No key configured';
  const keyGuidance = isClearPending
    ? 'The masked saved secret will be removed when you save AI settings.'
    : isReplacementStaged
      ? 'A new key is staged in this draft and will replace the saved secret when you save AI settings.'
      : isPreservedSavedKey
        ? editingSavedKey
          ? 'Replacement mode is active. Enter a new key, or cancel replacement to keep the saved secret unchanged.'
          : 'The saved secret stays masked. Choose Replace saved key before entering a replacement, or Clear key to stage removal.'
        : isNewKeyStaged
          ? 'This provider has a new key staged in the draft and it will be stored after Save AI Settings.'
          : 'Paste a key to save one for this provider, or leave it blank to keep it unconfigured.';

  function keepSavedKey() {
    update(`${active}.apiKey`, '__saved__');
    setEditingSavedKey(false);
  }

  function beginReplacement() {
    if (!hasSavedApiKey) return;
    update(`${active}.apiKey`, '__saved__');
    setEditingSavedKey(true);
  }

  function stageClear() {
    if (!hasSavedApiKey) return;
    const confirmed = window.confirm(`Clear the saved ${providerLabel(active)} API key? The key will be removed only after you click Save AI Settings.`);
    if (!confirmed) return;
    update(`${active}.apiKey`, '');
    setEditingSavedKey(false);
  }

  const keyInputDisabled = hasSavedApiKey && isPreservedSavedKey && !editingSavedKey;

  return <div className="settings-grid">
    <label>
      API Key
      <input
        type="password"
        value={apiKeyValue}
        disabled={keyInputDisabled}
        onChange={(event) => update(`${active}.apiKey`, event.target.value)}
        placeholder={hasSavedApiKey ? (editingSavedKey ? 'Enter replacement API key' : 'Saved key is masked') : 'Paste API key to save'}
        aria-label={`${providerLabel(active)} API key`}
        autoComplete="new-password"
      />
      <span className="muted">API key lifecycle: {keyStatus}. {keyGuidance}</span>
      <div className="button-row">
        {hasSavedApiKey && isPreservedSavedKey && !editingSavedKey && <button className="outline" type="button" onClick={beginReplacement}>Replace saved key</button>}
        {hasSavedApiKey && editingSavedKey && <button className="outline" type="button" onClick={keepSavedKey}>Cancel replacement</button>}
        {hasSavedApiKey && !isPreservedSavedKey && <button className="outline" type="button" onClick={keepSavedKey}>Keep saved key</button>}
        {hasSavedApiKey && <button className="outline" type="button" onClick={stageClear}>Clear key</button>}
        {hasSavedApiKey && isPreservedSavedKey && !editingSavedKey && <span className="scope-pill">Saved key</span>}
        {hasSavedApiKey && isPreservedSavedKey && editingSavedKey && <span className="scope-pill">Replacement mode</span>}
        {isReplacementStaged && <span className="scope-pill">Replace key</span>}
        {isClearPending && <span className="scope-pill">Clear pending</span>}
        {isNewKeyStaged && <span className="scope-pill">New key staged</span>}
      </div>
      <p className="muted">Staged key changes are saved with <strong>Save AI Settings</strong>; <strong>Test Saved Connection</strong> checks the last saved provider config.</p>
    </label>
    <label>
      Endpoint
      <input value={activeBlock.endpoint} onChange={(event) => update(`${active}.endpoint`, event.target.value)} />
    </label>
    <label>
      Model
      <select value={activeBlock.model} onChange={(event) => update(`${active}.model`, event.target.value)}>
        {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
      </select>
    </label>
    <label>
      Temperature: {activeBlock.temperature}
      <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={activeBlock.temperature}
        onChange={(event) => update(`${active}.temperature`, Number(event.target.value))}
      />
    </label>
    <label>
      Max Tokens
      <input type="number" value={activeBlock.maxTokens} onChange={(event) => update(`${active}.maxTokens`, Number(event.target.value))} />
    </label>
  </div>;
}

export default ProviderConfigurationPanel;
