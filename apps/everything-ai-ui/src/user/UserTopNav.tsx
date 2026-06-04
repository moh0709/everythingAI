import { Brain } from 'lucide-react';
import type { UserView } from './types';

type UserTopNavProps = {
  view: UserView;
  setView: (view: UserView) => void;
  openAskView: () => void;
};

export function UserTopNav({ view, setView, openAskView }: UserTopNavProps) {
  return <header className="top-nav">
    <div className="brand"><Brain size={28} /><strong>EverythingAI</strong><span className="chip blue">CLIENT WORKSPACE</span></div>
    <nav>
      <button className={view === 'onboarding' ? 'active' : ''} onClick={() => setView('onboarding')}>Home</button>
      <button className={view === 'explore' ? 'active' : ''} onClick={() => setView('explore')}>Sources & Files</button>
      <button className={view === 'wiki' ? 'active' : ''} onClick={() => setView('wiki')}>Knowledge Base</button>
      <button className={view === 'ask' ? 'active' : ''} onClick={openAskView}>Ask AI</button>
    </nav>
    <div className="provider-pill"><span />Client • Safe mode</div>
  </header>;
}
