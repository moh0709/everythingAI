import type { Dispatch, SetStateAction } from 'react';
import { apiRequest } from '../api';
import type { ApiOptions } from '../api';
import type { UserView, WikiPayload } from './types';

type ActionRunner = (label: string, task: () => Promise<void>) => Promise<void>;

type UseWikiWorkflowsArgs = {
  options: ApiOptions;
  selectedWikiPageId: string | null;
  run: ActionRunner;
  setWiki: Dispatch<SetStateAction<WikiPayload | null>>;
  selectFirstWikiPage: (payload: WikiPayload) => void;
  setStatus: Dispatch<SetStateAction<string>>;
  setView: Dispatch<SetStateAction<UserView>>;
};

export function useWikiWorkflows({
  options,
  selectedWikiPageId,
  run,
  setWiki,
  selectFirstWikiPage,
  setStatus,
  setView,
}: UseWikiWorkflowsArgs) {
  async function refreshWiki() {
    await run('Loading source-backed wiki pages...', async () => {
      const payload = await apiRequest<{ wiki: WikiPayload }>(options, '/api/wiki?limit=500&filePageLimit=50');
      setWiki(payload.wiki);
      if (!selectedWikiPageId && payload.wiki.pages[0]) selectFirstWikiPage(payload.wiki);
      setStatus(`Loaded ${payload.wiki.page_count || 0} wiki page(s).`);
    });
  }

  async function buildWiki() {
    await run('Building source-backed wiki pages...', async () => {
      const payload = await apiRequest<{ wiki: WikiPayload }>(options, '/api/wiki/build', { limit: 500, filePageLimit: 50, useProvider: true }, 'POST');
      setWiki(payload.wiki);
      selectFirstWikiPage(payload.wiki);
      setView('wiki');
      setStatus(`Built ${payload.wiki.page_count || 0} source-backed wiki page(s).`);
    });
  }

  return {
    refreshWiki,
    buildWiki,
  };
}
