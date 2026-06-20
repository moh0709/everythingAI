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

const AGENT_CONNECTORS_HASH = '#agent-connectors';

const NAV_ITEMS: Array<{ id: string; target: AdminSection; label: string }> = [
  { id: 'dashboard', target: 'dashboard', label: 'Dashboard' },
  { id: 'explorer', target: 'explorer', label: 'Files & Content' },
  { id: 'planning', target: 'planning', label: 'Planning' },
  { id: 'askai', target: 'askai', label: 'Ask AI' },
  { id: 'agentConnectors', target: 'settings', label: 'Agent Connectors' },
  { id: 'analytics', target: 'analytics', label: 'Analytics' },
  { id: 'settings', target: 'settings', label: 'Settings' },
];

function clearAdminHash() {
  if (typeof window === 'undefined' || !window.location.hash) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

function scrollToAgentConnectorsPanel() {
  window.setTimeout(() => {
    const headings = Array.from(document.querySelectorAll('h2'));
    const heading = headings.find((item) => item.textContent?.includes('Admin Agent Connectors'));
    heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

function isActiveNavItem(item: { id: string; target: AdminSection }, section: AdminSection) {
  const activeHash = typeof window !== 'undefined' ? window.location.hash : '';
  if (item.id === 'agentConnectors') {
    return section === 'settings' && activeHash === AGENT_CONNECTORS_HASH;
  }
  if (item.id === 'settings') {
    return section === 'settings' && activeHash !== AGENT_CONNECTORS_HASH;
  }
  return section === item.target;
}

export function AdminHeader({ section, setSection, loadAudit, activeProvider }: AdminHeaderProps) {
  function handleNavClick(item: { id: string; target: AdminSection }) {
    if (item.id === 'agentConnectors') {
      window.location.hash = AGENT_CONNECTORS_HASH;
      setSection('settings');
      scrollToAgentConnectorsPanel();
      return;
    }

    clearAdminHash();
    if (item.target === 'analytics') {
      loadAudit();
      return;
    }
    setSection(item.target);
  }

  return <header className="top-nav">
    <div className="brand"><FolderOpen size={28} /><strong>EverythingAI</strong><span className="chip orange">ADMIN DASHBOARD</span></div>
    <nav>
      {NAV_ITEMS.map((item) => <button
        key={item.id}
        className={isActiveNavItem(item, section) ? 'active' : ''}
        onClick={() => handleNavClick(item)}
      >
        {item.label}
      </button>)}
    </nav>
    <div className="provider-pill"><span />Provider: {providerLabel(activeProvider)}</div>
  </header>;
}

export default AdminHeader;
