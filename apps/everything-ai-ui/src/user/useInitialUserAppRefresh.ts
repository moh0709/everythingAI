import { useEffect } from 'react';

type UseInitialUserAppRefreshArgs = {
  refreshFiles: () => Promise<unknown>;
  refreshWiki: () => Promise<unknown>;
  refreshWatcherStatus: (showStatus?: boolean) => Promise<unknown>;
};

export function useInitialUserAppRefresh({ refreshFiles, refreshWiki, refreshWatcherStatus }: UseInitialUserAppRefreshArgs) {
  useEffect(() => {
    refreshFiles().catch(() => undefined);
    refreshWiki().catch(() => undefined);
    refreshWatcherStatus(false).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
