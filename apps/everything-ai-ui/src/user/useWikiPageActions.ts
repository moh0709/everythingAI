import type { WikiPage } from './types';

type UseWikiPageActionsArgs = {
  selectedWikiPage?: WikiPage;
  askQuestion: (questionText?: string) => void | Promise<void>;
};

export function useWikiPageActions({ selectedWikiPage, askQuestion }: UseWikiPageActionsArgs) {
  function askAboutWikiPage(page: WikiPage | undefined = selectedWikiPage) {
    if (!page) return;
    askQuestion(`Explain the wiki page "${page.title}" and cite the relevant source documents.`);
  }

  return { askAboutWikiPage };
}
