import type { ComponentType } from 'react';
import type { ProviderName } from '../../providerSettingsApi';
import { providerLabel } from '../../providerCatalog';

type ProviderCardButtonProps = {
  provider: ProviderName;
  icon: ComponentType;
  selected: boolean;
  disabled?: boolean;
  onSelect: (provider: ProviderName) => void;
};

export function ProviderCardButton({ provider, icon: Icon, selected, disabled = false, onSelect }: ProviderCardButtonProps) {
  return <button
    className={`provider-card-button ${selected ? 'selected' : ''}`}
    disabled={disabled}
    onClick={() => onSelect(provider)}
  >
    <Icon />
    <strong>{providerLabel(provider)}</strong>
    <small>{provider === 'ollama' ? 'Run models locally' : disabled ? 'Disabled by policy' : 'Remote model provider'}</small>
  </button>;
}

export default ProviderCardButton;
