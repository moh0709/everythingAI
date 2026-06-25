import { FolderOpen } from 'lucide-react';
import { providerLabel } from '../../providerCatalog';
import type { ProviderName } from '../../providerSettingsApi';
import type { AdminSection } from '../types';
import {
  ADMIN_NAV_ITEMS,
  AGENT_CONNECTORS_HASH,
  clearAdminHash,
  isAdminNavItemActive,
  scrollToAgentConnectorsPanel,
} from '../adminNavigation';

type AdminHeaderProps = {
  section: AdminSection;
  setSection: (section: AdminSection) => void;
  loadAudit: () => void;
  activeProvider: ProviderName;
};

export function AdminHeader({ section, setSection, loadAudit, activeProvider }: AdminHeaderProps) {
  function handleNavClick(item: (typeof ADMIN_NAV_ITEMS)[number]) {
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
      {ADMIN_NAV_ITEMS.map((item) => <button
        key={item.id}
        className={isAdminNavItemActive(item, section) ? 'active' : ''}
        onClick={() => handleNavClick(item)}
      >
        {item.label}
      </button>)}
    </nav>
    <div className="provider-pill"><span />Provider: {providerLabel(activeProvider)}</div>
  </header>;
}

export default AdminHeader;
