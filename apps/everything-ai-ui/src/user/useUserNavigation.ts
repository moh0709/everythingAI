import type { UserView } from './types';

type UseUserNavigationArgs = {
  query: string;
  setView: (view: UserView) => void;
  selectWikiPage: (pageId: string) => void;
  focusChatInput: () => void;
  askQuestion: (questionText?: string) => void | Promise<void>;
  loadDocumentContext: (fileId: string) => void | Promise<void>;
};

export function useUserNavigation({ query, setView, selectWikiPage, focusChatInput, askQuestion, loadDocumentContext }: UseUserNavigationArgs) {
  function openWikiPage(pageId: string) {
    selectWikiPage(pageId);
    setView('wiki');
  }

  function openAskView() {
    setView('ask');
    setTimeout(focusChatInput, 0);
  }

  function handleAskFromHero() {
    const question = query.trim();
    if (question) {
      askQuestion(question);
      return;
    }
    openAskView();
  }

  function openSourceContext(fileId: string) {
    setView('explore');
    loadDocumentContext(fileId);
  }

  return {
    openWikiPage,
    openAskView,
    handleAskFromHero,
    openSourceContext,
  };
}
