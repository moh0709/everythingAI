import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { apiRequest } from '../api';
import type { ApiOptions } from '../api';
import type { UserView } from './types';

type ActionRunner = (label: string, task: () => Promise<void>) => Promise<void>;

type ChatResponse = {
  answer?: string;
  sources?: unknown[];
};

type UseAskWorkflowsArgs = {
  options: ApiOptions;
  busy: boolean;
  chatInput: string;
  run: ActionRunner;
  setView: Dispatch<SetStateAction<UserView>>;
  setQuery: Dispatch<SetStateAction<string>>;
  clearChatInput: () => void;
  addUserMessage: (text: string) => void;
  addAssistantMessage: (text: string, sources?: unknown[]) => void;
  focusChatInput: () => void;
  setStatus: Dispatch<SetStateAction<string>>;
};

export function useAskWorkflows({
  options,
  busy,
  chatInput,
  run,
  setView,
  setQuery,
  clearChatInput,
  addUserMessage,
  addAssistantMessage,
  focusChatInput,
  setStatus,
}: UseAskWorkflowsArgs) {
  async function askQuestion(questionText = chatInput) {
    const question = questionText.trim();
    if (!question || busy) return;

    setView('ask');
    clearChatInput();
    setQuery('');

    await run('Asking indexed sources...', async () => {
      addUserMessage(question);
      const payload = await apiRequest<ChatResponse>(options, '/api/chat', { question, limit: 5 }, 'POST');
      addAssistantMessage(payload.answer || 'No answer returned.', payload.sources || []);
      setStatus(`Answer prepared from ${payload.sources?.length || 0} referenced source(s).`);
    });

    focusChatInput();
  }

  function handleChatSubmit(event: FormEvent) {
    event.preventDefault();
    askQuestion();
  }

  return { askQuestion, handleChatSubmit };
}
