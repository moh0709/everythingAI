import type { UserView } from './types';

type UseUserNavigationArgs = {
  query: string;
  setView: (view: UserView) => void;
  selectWikiPage: (pageId: string) => void;
  focusChatInput: () => void;
  askQuestion: (questionText?: string) => void | Promise<void>;
};

export function useUserNavigation({ query, setView, selectWikiPage, focusChatInput, askQuestion }: UseUserNavigationArgs) {
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

  return {
    openWikiPage,
    openAskView,
    handleAskFromHero,
  };
}
