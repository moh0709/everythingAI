import { Brain, Search, Zap } from 'lucide-react';
import type { AdminSection } from '../types';

type AdminHeroProps = {
  query: string;
  setQuery: (value: string) => void;
  searchEverything: () => void;
  setSection: (section: AdminSection) => void;
  loadAudit: () => void;
};

export function AdminHero({ query, setQuery, searchEverything, setSection, loadAudit }: AdminHeroProps) {
  return <div className="hero-row">
    <div>
      <h1><Brain /> AI File Intelligence Center</h1>
      <p>Advanced AI-powered file analysis, organization, and management platform</p>
    </div>
    <div className="hero-actions">
      <div className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Explore" />
      </div>
      <button className="purple" onClick={searchEverything}>Explore</button>
      <button className="purple" onClick={() => setSection('planning')}>Start Planning</button>
      <button className="toggle" aria-label="Automation status"><Zap size={16} /></button>
      <button className="outline" onClick={loadAudit}>Advanced Stats</button>
    </div>
  </div>;
}

export default AdminHero;
