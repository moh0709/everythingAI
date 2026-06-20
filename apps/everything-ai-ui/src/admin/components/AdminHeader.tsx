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

const NAV_ITEMS: Array<{ id: AdminSection; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'explorer', label: 'Files & Content' },
  { id: 'planning', label: 'Planning' },
  { id: 'askai', label: 'Ask AI' },
  { id: 'agentConnectors', label: 'Agent Connectors' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

export function AdminHeader({ section, setSection, loadAudit, activeProvider }: AdminHeaderProps) {
  return <header className="top-nav">
    <div className="brand"><FolderOpen size={28} /><strong>EverythingAI</strong><span className="chip orange">ADMIN DASHBOARD</span></div>
    <nav>
      {NAV_ITEMS.map((item) => <button
        key={item.id}
        className={section === item.id ? 'active' : ''}
        onClick={() => item.id === 'analytics' ? loadAudit() : setSection(item.id)}
      >
        {item.label}
      </button>)}
    </nav>
    <div className="provider-pill"><span />Provider: {providerLabel(activeProvider)}</div>
  </header>;
}

export default AdminHeader;
