import { FolderOpen } from 'lucide-react';
import { providerLabel } from '../../providerCatalog';
import type { ProviderName } from '../../providerSettingsApi';
import type { AdminSection } from '../types';

type AdminHeaderProps = {
  section: AdminSection;
  setSection: (section: AdminSection) => void;
  loadAudit: () => void;
  activeProvider: ProviderName;
};

const NAV_ITEMS: Array<{ id: string; target: AdminSection; label: string }> = [
  { id: 'dashboard', target: 'dashboard', label: 'Dashboard' },
  { id: 'explorer', target: 'explorer', label: 'Files & Content' },
  { id: 'planning', target: 'planning', label: 'Planning' },
  { id: 'askai', target: 'askai', label: 'Ask AI' },
  { id: 'agentConnectors', target: 'settings', label: 'Agent Connectors' },
  { id: 'analytics', target: 'analytics', label: 'Analytics' },
  { id: 'settings', target: 'settings', label: 'Settings' },
];

export function AdminHeader({ section, setSection, loadAudit, activeProvider }: AdminHeaderProps) {
  return <header className="top-nav">
    <div className="brand"><FolderOpen size={28} /><strong>EverythingAI</strong><span className="chip orange">ADMIN DASHBOARD</span></div>
    <nav>
      {NAV_ITEMS.map((item) => <button
        key={item.id}
        className={section === item.target ? 'active' : ''}
        onClick={() => item.target === 'analytics' ? loadAudit() : setSection(item.target)}
      >
        {item.label}
      </button>)}
    </nav>
    <div className="provider-pill"><span />Provider: {providerLabel(activeProvider)}</div>
  </header>;
}

export default AdminHeader;
