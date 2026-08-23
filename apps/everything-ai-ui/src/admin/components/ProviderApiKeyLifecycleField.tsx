import { useEffect, useState } from 'react';
import type { ProviderName, ProviderSettings } from '../../providerSettingsApi';
import { providerLabel } from '../../providerCatalog';

type RemoteProviderName = Exclude<ProviderName, 'ollama'>;

type ProviderApiKeyLifecycleFieldProps = {
  active: RemoteProviderName;
  draft: ProviderSettings;
  providerSettings: ProviderSettings | null;
  update: (path: string, value: unknown) => void;
};

type KeyLifecycleState = {
  hasSavedApiKey: boolean;
  isPreservedSavedKey: boolean;
  isClearPending: boolean;
  isReplacementStaged: boolean;
  isNewKeyStaged: boolean;
};

function getKeyLifecycleState(active: RemoteProviderName, draft: ProviderSettings, providerSettings: ProviderSettings | null): KeyLifecycleState {
  const activeBlock = draft[active];
  const savedBlock = providerSettings?.[active];
  const hasSavedApiKey = savedBlock?.apiKey === '__saved__';

  return {
    hasSavedApiKey,
    isPreservedSavedKey: hasSavedApiKey && activeBlock.apiKey === '__saved__',
    isClearPending: hasSavedApiKey && activeBlock.apiKey === '',
    isReplacementStaged: hasSavedApiKey && activeBlock.apiKey !== '' && activeBlock.apiKey !== '__saved__',
    isNewKeyStaged: !hasSavedApiKey && activeBlock.apiKey !== '',
  };
}

function keyLifecycleCopy(state: KeyLifecycleState, editingSavedKey: boolean) {
  if (state.isClearPending) {
    return {
      status: 'Clear pending',
      guidance: 'The masked saved secret will be removed when you save AI settings.',
    };
  }

  if (state.isReplacementStaged) {
    return {
      status: 'Replacement key staged',
      guidance: 'A new key is staged in this draft and will replace the saved secret when you save AI settings.',
    };
  }

  if (state.isPreservedSavedKey) {
    return {
      status: 'Saved key preserved',
      guidance: editingSavedKey
        ? 'Replacement mode is active. Enter a new key, or cancel replacement to keep the saved secret unchanged.'
        : 'The saved secret stays masked. Choose Replace saved key before entering a replacement, or Clear key to stage removal.',
    };
  }

  if (state.isNewKeyStaged) {
    return {
      status: 'New key staged',
      guidance: 'This provider has a new key staged in the draft and it will be stored after Save AI Settings.',
    };
  }

  return {
    status: 'No key configured',
    guidance: 'Paste a key to save one for this provider, or leave it blank to keep it unconfigured.',
  };
}

export function ProviderApiKeyLifecycleField({ active, draft, providerSettings, update }: ProviderApiKeyLifecycleFieldProps) {
  const activeBlock = draft[active];
  const state = getKeyLifecycleState(active, draft, providerSettings);
  const [editingSavedKey, setEditingSavedKey] = useState(false);

  useEffect(() => {
    setEditingSavedKey(false);
  }, [active, state.hasSavedApiKey]);

  const apiKeyValue = state.isPreservedSavedKey ? '' : activeBlock.apiKey;
  const copy = keyLifecycleCopy(state, editingSavedKey);
  const keyInputDisabled = state.hasSavedApiKey && state.isPreservedSavedKey && !editingSavedKey;

  function keepSavedKey() {
    update(`${active}.apiKey`, '__saved__');
    setEditingSavedKey(false);
  }

  function beginReplacement() {
    if (!state.hasSavedApiKey) return;
    update(`${active}.apiKey`, '__saved__');
    setEditingSavedKey(true);
  }

  function stageClear() {
    if (!state.hasSavedApiKey) return;
    const confirmed = window.confirm(`Clear the saved ${providerLabel(active)} API key? The key will be removed only after you click Save AI Settings.`);
    if (!confirmed) return;
    update(`${active}.apiKey`, '');
    setEditingSavedKey(false);
  }

  return <label>
    API Key
    <input
      type="password"
      value={apiKeyValue}
      disabled={keyInputDisabled}
      onChange={(event) => update(`${active}.apiKey`, event.target.value)}
      placeholder={state.hasSavedApiKey ? (editingSavedKey ? 'Enter replacement API key' : 'Saved key is masked') : 'Paste API key to save'}
      aria-label={`${providerLabel(active)} API key`}
      autoComplete="new-password"
    />
    <span className="muted">API key lifecycle: {copy.status}. {copy.guidance}</span>
    <div className="button-row">
      {state.hasSavedApiKey && state.isPreservedSavedKey && !editingSavedKey && <button className="outline" type="button" onClick={beginReplacement}>Replace saved key</button>}
      {state.hasSavedApiKey && editingSavedKey && <button className="outline" type="button" onClick={keepSavedKey}>Cancel replacement</button>}
      {state.hasSavedApiKey && !state.isPreservedSavedKey && <button className="outline" type="button" onClick={keepSavedKey}>Keep saved key</button>}
      {state.hasSavedApiKey && <button className="outline" type="button" onClick={stageClear}>Clear key</button>}
      {state.hasSavedApiKey && state.isPreservedSavedKey && !editingSavedKey && <span className="scope-pill">Saved key</span>}
      {state.hasSavedApiKey && state.isPreservedSavedKey && editingSavedKey && <span className="scope-pill">Replacement mode</span>}
      {state.isReplacementStaged && <span className="scope-pill">Replace key</span>}
      {state.isClearPending && <span className="scope-pill">Clear pending</span>}
      {state.isNewKeyStaged && <span className="scope-pill">New key staged</span>}
    </div>
    <p className="muted">Staged key changes are saved with <strong>Save AI Settings</strong>; <strong>Test Saved Connection</strong> checks the last saved provider config.</p>
  </label>;
}

export default ProviderApiKeyLifecycleField;
