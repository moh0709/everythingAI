import { useRef, useState } from 'react';
import type { ChatMessage } from './types';

export function useAskState() {
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
  };
}
