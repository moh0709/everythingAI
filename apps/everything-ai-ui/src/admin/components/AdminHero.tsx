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
      <span className="chip orange">ADMIN DASHBOARD</span>
      <h1><Brain /> Operator Control Center</h1>
      <p>Manage source paths, file indexing, extracted file content, AI providers, planning rules, execution safety, analytics, and knowledge operations. Normal users should use the Client Workspace.</p>
    </div>
    <div className="hero-actions">
      <div className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search indexed files and extracted content" />
      </div>
      <button className="purple" onClick={searchEverything}>Search Files</button>
      <button className="purple" onClick={() => setSection('planning')}>Planning Rules</button>
      <button className="toggle" aria-label="Automation status"><Zap size={16} /></button>
      <button className="outline" onClick={loadAudit}>Analytics</button>
    </div>
  </div>;
}

export default AdminHero;
