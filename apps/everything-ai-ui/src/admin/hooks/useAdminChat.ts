import { useState } from 'react';

export type AdminChatSource = {
  filename?: string;
  absolute_path?: string;
  snippet?: string;
  score?: number;
};

export type AdminChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: AdminChatSource[];
};

export function useAdminChat() {
  const [chatMessages, setChatMessages] = useState<AdminChatMessage[]>([]);

  function clearChat() {
    setChatMessages([]);
  }

  return {
    chatMessages,
    setChatMessages,
    clearChat,
  };
}

export default useAdminChat;
