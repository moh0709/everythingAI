import React, { FormEvent, MutableRefObject } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { EXAMPLE_PROMPTS } from './userUtils';
import type { ChatMessage } from './types';

type AskViewProps = {
  error: string;
  busy: boolean;
  status: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  chatInputRef: MutableRefObject<HTMLTextAreaElement | null>;
  handleChatSubmit: (event: FormEvent) => void;
  askQuestion: (text?: string) => void;
};

export function AskView({
  error, busy, status, chatMessages, chatInput, setChatInput,
  chatInputRef, handleChatSubmit, askQuestion,
}: AskViewProps) {
  return <>
    {error && <div className="error">{error}</div>}
    <div className={`status-strip ${busy ? 'working' : 'ready'}`}>{busy ? 'Processing...' : status}</div>

    <section className="askai-view">
      <div className="askai-header">
        <h1><MessageCircle /> Ask EverythingAI</h1>
        <p>Ask source-backed questions across indexed local knowledge. Answers are generated through the configured local provider.</p>
        <span className="chip blue"><Sparkles size={14} /> Source-backed chat</span>
      </div>

      <div className="chat-messages">
        {!chatMessages.length && <div className="chat-empty">
          <MessageCircle size={48} />
          <h2>Ask a question about your indexed workspace</h2>
          <p>EverythingAI will answer using extracted local file context when sources are available.</p>
          <div className="chat-suggestions">
            {EXAMPLE_PROMPTS.map((prompt) => <button key={prompt} className="suggestion-chip" onClick={() => askQuestion(prompt)} disabled={busy}>{prompt}</button>)}
          </div>
        </div>}

        {chatMessages.map((message, index) => <article key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
          <strong>{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'EverythingAI' : 'Error'}</strong>
          <p>{message.text}</p>
          {!!message.sources?.length && <div className="chat-sources">
            {message.sources.map((source, sourceIndex) => <div key={`${source.filename}-${sourceIndex}`} className="chat-source-item">
              <span className="source-filename">{source.filename || 'Source'}</span>
              {source.absolute_path && <span className="source-path">{source.absolute_path}</span>}
              {typeof source.score === 'number' && <span className="source-tag">Score: {source.score.toFixed(3)}</span>}
              {source.snippet && <span className="source-snippet">{source.snippet}</span>}
            </div>)}
          </div>}
        </article>)}

        {busy && <article className="chat-bubble assistant thinking"><strong>EverythingAI</strong><p>Thinking<span className="dots">...</span></p></article>}
      </div>

      <form className="chat-input-row" onSubmit={handleChatSubmit}>
        <textarea
          ref={chatInputRef}
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
          placeholder="Ask about indexed files, source context, documents, or extracted knowledge..."
          rows={2}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); askQuestion(); } }}
        />
        <button type="submit" disabled={busy || !chatInput.trim()}><Send size={16} /> Ask</button>
      </form>
    </section>
  </>;
}
