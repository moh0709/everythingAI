import { FormEvent, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { apiRequest, type ApiOptions } from '../../api';

type ChatSource = {
  filename?: string;
  absolute_path?: string;
  snippet?: string;
  score?: number;
};

type ChatMessage = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  sources?: ChatSource[];
};

type AskAIViewProps = {
  options: ApiOptions;
  chatMessages: ChatMessage[];
  setChatMessages: (updater: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[])) => void;
};

const EXAMPLE_PROMPTS = [
  'What are the most important files in this workspace?',
  'Summarize the latest indexed documents.',
  'Which files mention planning, governance, or recovery?',
];

export function AskAIView({ options, chatMessages, setChatMessages }: AskAIViewProps) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  async function ask(questionText = question) {
    const normalized = questionText.trim();
    if (!normalized || busy) return;

    setQuestion('');
    setBusy(true);
    setChatMessages((current) => [...current, { role: 'user', text: normalized }]);

    try {
      const payload = await apiRequest<any>(options, '/api/chat', { question: normalized, limit: 5 }, 'POST');
      setChatMessages((current) => [...current, {
        role: 'assistant',
        text: payload.answer || 'No answer returned.',
        sources: payload.sources || [],
      }]);
    } catch (error: any) {
      setChatMessages((current) => [...current, {
        role: 'error',
        text: error.message || String(error),
      }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask();
  }

  return <section className="askai-view">
    <div className="askai-header">
      <h1><MessageCircle /> Ask EverythingAI</h1>
      <p>Ask source-backed questions across indexed local knowledge. Answers are generated through the configured admin provider.</p>
      <span className="chip blue"><Sparkles size={14} /> Source-backed chat</span>
    </div>

    <div className="chat-messages">
      {!chatMessages.length && <div className="chat-empty">
        <MessageCircle size={48} />
        <h2>Ask a question about your indexed workspace</h2>
        <p>EverythingAI will answer using extracted local file context when sources are available.</p>
        <div className="chat-suggestions">
          {EXAMPLE_PROMPTS.map((prompt) => <button
            key={prompt}
            className="suggestion-chip"
            onClick={() => ask(prompt)}
            disabled={busy}
          >
            {prompt}
          </button>)}
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

      {busy && <article className="chat-bubble assistant thinking">
        <strong>EverythingAI</strong>
        <p>Thinking<span className="dots">...</span></p>
      </article>}
    </div>

    <form className="chat-input-row" onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ask about indexed files, source context, governance, plans, or extracted knowledge..."
        rows={2}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            ask();
          }
        }}
      />
      <button type="submit" disabled={busy || !question.trim()}><Send size={16} /> Ask</button>
    </form>
  </section>;
}

export default AskAIView;
