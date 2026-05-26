import { Brain } from 'lucide-react';
import type { UserView } from './types';

type UserTopNavProps = {
  view: UserView;
  setView: (view: UserView) => void;
  openAskView: () => void;
};

export function UserTopNav({ view, setView, openAskView }: UserTopNavProps) {
  return <header className="top-nav">
    <div className="brand"><Brain size={28} /><strong>EverythingAI</strong></div>
    <nav>
      <button className={view === 'onboarding' ? 'active' : ''} onClick={() => setView('onboarding')}>Start</button>
      <button className={view === 'explore' ? 'active' : ''} onClick={() => setView('explore')}>Explore</button>
      <button className={view === 'wiki' ? 'active' : ''} onClick={() => setView('wiki')}>Wiki</button>
      <button className={view === 'ask' ? 'active' : ''} onClick={openAskView}>Ask</button>
    </nav>
    <div className="provider-pill"><span />User MVP • Safe mode</div>
  </header>;
}
