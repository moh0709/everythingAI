import type { ProviderName } from '../../providerSettingsApi';
import { providerCatalog } from '../../providerCatalog';
import { ProviderCardButton } from './ProviderCardButton';

type ProviderSelectorPanelProps = {
  activeProvider: ProviderName;
  remoteProvidersEnabled: boolean;
  filter: string;
  setFilter: (value: string) => void;
  onSelectProvider: (provider: ProviderName) => void;
  onRemoteProvidersEnabledChange: (enabled: boolean) => void;
};

export function ProviderSelectorPanel({
  activeProvider,
  remoteProvidersEnabled,
  filter,
  setFilter,
  onSelectProvider,
  onRemoteProvidersEnabledChange,
}: ProviderSelectorPanelProps) {
  const visibleProviders = providerCatalog.filter((provider) => (
    provider.label.toLowerCase().includes(filter.toLowerCase())
    || provider.id.toLowerCase().includes(filter.toLowerCase())
  ));

  return <div className="panel">
    <h2>AI Provider Configuration</h2>
    <div className="settings-grid">
      <label>
        Filter providers
        <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search provider..." />
      </label>
      <label className="setting-check">
        <input
          type="checkbox"
          checked={remoteProvidersEnabled}
          onChange={(event) => onRemoteProvidersEnabledChange(event.target.checked)}
        />
        Enable remote providers through server policy
      </label>
    </div>

    <div className="provider-grid">
      {visibleProviders.map((provider) => <ProviderCardButton
        key={provider.id}
        provider={provider.id}
        icon={provider.icon}
        selected={activeProvider === provider.id}
        disabled={provider.id !== 'ollama' && !remoteProvidersEnabled}
        onSelect={onSelectProvider}
      />)}
    </div>
  </div>;
}

export default ProviderSelectorPanel;
