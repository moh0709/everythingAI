import { useState } from 'react';
import type { ApiOptions } from '../../api';
import {
  getProviderModels,
  getProviderSettings,
  type ProviderModels,
  type ProviderSettings,
} from '../../providerSettingsApi';

export function useAdminProviderData() {
  const [providerSettings, setProviderSettings] = useState<ProviderSettings | null>(null);
  const [providerModels, setProviderModels] = useState<ProviderModels | null>(null);

  async function refreshProviderData(options: ApiOptions) {
    const [settingsPayload, modelsPayload] = await Promise.all([
      getProviderSettings(options),
      getProviderModels(options),
    ]);

    setProviderSettings(settingsPayload.settings);
    setProviderModels(modelsPayload.models);

    return {
      settings: settingsPayload.settings,
      models: modelsPayload.models,
    };
  }

  return {
    providerSettings,
    setProviderSettings,
    providerModels,
    setProviderModels,
    refreshProviderData,
  };
}

export default useAdminProviderData;
