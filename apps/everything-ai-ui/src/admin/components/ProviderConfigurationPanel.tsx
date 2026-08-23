import { Server } from 'lucide-react';
import type { ProviderModels, ProviderName, ProviderSettings } from '../../providerSettingsApi';
import { providerLabel } from '../../providerCatalog';
import { ProviderApiKeyLifecycleField } from './ProviderApiKeyLifecycleField';

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
  const models = providerModels?.[active] || [];

  return <div className="settings-grid">
    <ProviderApiKeyLifecycleField active={active} draft={draft} providerSettings={providerSettings} update={update} />
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
