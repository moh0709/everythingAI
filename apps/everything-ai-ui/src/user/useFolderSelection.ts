import { apiRequest } from '../api';
import type { ApiOptions } from '../api';
import type { SetupStep } from './types';

type UseFolderSelectionArgs = {
  options: ApiOptions;
  run: (message: string, action: () => Promise<void>) => Promise<void>;
  markStep: (id: string, statusValue: SetupStep['status']) => void;
  setFolderPath: (folderPath: string) => void;
  setStatus: (status: string) => void;
};

export function useFolderSelection({ options, run, markStep, setFolderPath, setStatus }: UseFolderSelectionArgs) {
  async function selectFolder() {
    await run('Opening folder picker...', async () => {
      markStep('folder', 'working');
      const result = await apiRequest<{ folderPath?: string; cancelled?: boolean }>(options, '/api/select-folder', {}, 'POST');
      if (result.cancelled || !result.folderPath) {
        markStep('folder', 'waiting');
        setStatus('Folder selection cancelled.');
        return;
      }
      setFolderPath(result.folderPath);
      localStorage.setItem('everythingai.ui.folderPath', result.folderPath);
      markStep('folder', 'done');
      setStatus(`Folder selected: ${result.folderPath}`);
    });
  }

  return { selectFolder };
}
