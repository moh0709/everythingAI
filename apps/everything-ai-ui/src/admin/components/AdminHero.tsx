import { Brain, Search, Zap } from 'lucide-react';
import type { AdminSection } from '../types';
import {
  ADMIN_SECTION_ACTIONS,
  activateAdminSection,
} from '../adminNavigation';

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
      {ADMIN_SECTION_ACTIONS.map((action) => <button
        key={action.id}
        className="purple"
        onClick={() => activateAdminSection(action.target, { setSection, loadAudit })}
      >
        {action.label}
      </button>)}
      <button className="toggle" aria-label="Automation status"><Zap size={16} /></button>
    </div>
  </div>;
}

export default AdminHero;
