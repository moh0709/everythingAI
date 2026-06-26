import { FolderOpen } from 'lucide-react';
import { providerLabel } from '../../providerCatalog';
import type { ProviderName } from '../../providerSettingsApi';
import type { AdminSection } from '../types';
import {
  ADMIN_NAV_ITEMS,
  activateAdminNavItem,
  isAdminNavItemActive,
} from '../adminNavigation';

type AdminHeaderProps = {
  section: AdminSection;
  setSection: (section: AdminSection) => void;
  loadAudit: () => void;
  activeProvider: ProviderName;
};

export function AdminHeader({ section, setSection, loadAudit, activeProvider }: AdminHeaderProps) {
  function handleNavClick(item: (typeof ADMIN_NAV_ITEMS)[number]) {
    activateAdminNavItem(item, { setSection, loadAudit });
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
