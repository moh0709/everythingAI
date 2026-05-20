import { FormEvent, useRef, useState } from 'react';
import type { ChatMessage } from './types';

export function useAskState(askQuestion: () => void) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  function clearChatInput() {
    setChatInput('');
  }

  function addUserMessage(text: string) {
    setChatMessages((current) => [...current, { role: 'user', text }]);
  }

  function addAssistantMessage(text: string, sources: any[] = []) {
    setChatMessages((current) => [...current, { role: 'assistant', text, sources }]);
  }

  function focusChatInput() {
    chatInputRef.current?.focus();
  }

  function handleChatSubmit(event: FormEvent) {
    event.preventDefault();
    askQuestion();
  }

  return {
    chatInput,
    setChatInput,
    clearChatInput,
    chatMessages,
    setChatMessages,
    addUserMessage,
    addAssistantMessage,
    chatInputRef,
    focusChatInput,
    handleChatSubmit,
  };
}
