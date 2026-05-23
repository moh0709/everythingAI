import { useState } from 'react';
import { apiRequest } from '../api';
import type { ApiOptions } from '../api';

export type WatcherStatus = {
  id: string;
  rootPath: string;
  status: string;
  running?: boolean;
  pending?: boolean;
  scheduled?: boolean;
  debounceMs?: number;
  lastCycleAt?: string | null;
  lastJob?: { id?: string; status?: string; type?: string } | null;
};

export type WatcherStatusPayload = {
  active: number;
  watchers: WatcherStatus[];
};

type UseWatcherControlsArgs = {
  options: ApiOptions;
  folderPath: string;
  run: (message: string, action: () => Promise<void>) => Promise<void>;
  setStatus: (status: string) => void;
  setError: (error: string) => void;
};

export function useWatcherControls({ options, folderPath, run, setStatus, setError }: UseWatcherControlsArgs) {
  const [watcherStatus, setWatcherStatus] = useState<WatcherStatusPayload | null>(null);

  async function refreshWatcherStatus(showStatus = true) {
    const payload = await apiRequest<WatcherStatusPayload>(options, '/api/watch/status');
    setWatcherStatus(payload);
    if (showStatus) setStatus(`Watcher status refreshed: ${payload.active} active watcher(s).`);
    return payload;
  }

  async function startWatcher(pathOverride = folderPath) {
    const normalized = pathOverride.trim();
    if (!normalized) {
      setError('Select or enter a folder path first.');
      return;
    }

    await run('Starting folder watcher...', async () => {
      await apiRequest(options, '/api/watch', { folderPath: normalized, extract: true, auto: true }, 'POST');
      await refreshWatcherStatus(false);
      setStatus(`Watcher started for: ${normalized}`);
    });
  }

  async function stopWatcher(pathOverride = folderPath) {
    const normalized = pathOverride.trim();
    if (!normalized) {
      setError('Select or enter a folder path first.');
      return;
    }

    await run('Stopping folder watcher...', async () => {
      await apiRequest(options, '/api/unwatch', { folderPath: normalized }, 'POST');
      await refreshWatcherStatus(false);
      setStatus(`Watcher stopped for: ${normalized}`);
    });
  }

  return {
    watcherStatus,
    refreshWatcherStatus,
    startWatcher,
    stopWatcher,
  };
}
