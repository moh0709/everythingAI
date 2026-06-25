import type { AdminSection } from './types';

export const AGENT_CONNECTORS_HASH = '#agent-connectors';
export const AGENT_CONNECTORS_HEADING = 'Admin Agent Connectors';

export type AdminNavItem = {
  id: 'dashboard' | 'explorer' | 'planning' | 'askai' | 'agentConnectors' | 'analytics' | 'settings';
  target: AdminSection;
  label: string;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { id: 'dashboard', target: 'dashboard', label: 'Dashboard' },
  { id: 'explorer', target: 'explorer', label: 'Files & Content' },
  { id: 'planning', target: 'planning', label: 'Planning' },
  { id: 'askai', target: 'askai', label: 'Ask AI' },
  { id: 'agentConnectors', target: 'settings', label: 'Agent Connectors' },
  { id: 'analytics', target: 'analytics', label: 'Analytics' },
  { id: 'settings', target: 'settings', label: 'Settings' },
];

export function isAdminNavItemActive(item: AdminNavItem, section: AdminSection, activeHash?: string) {
  const currentHash = activeHash ?? (typeof window !== 'undefined' ? window.location.hash : '');

  if (item.id === 'agentConnectors') {
    return section === 'settings' && currentHash === AGENT_CONNECTORS_HASH;
  }

  if (item.id === 'settings') {
    return section === 'settings' && currentHash !== AGENT_CONNECTORS_HASH;
  }

  return section === item.target;
}

export function clearAdminHash() {
  if (typeof window === 'undefined' || !window.location.hash) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

export function scrollToAgentConnectorsPanel() {
  if (typeof window === 'undefined') return;

  window.setTimeout(() => {
    const headings = Array.from(document.querySelectorAll('h2'));
    const heading = headings.find((item) => item.textContent?.includes(AGENT_CONNECTORS_HEADING));
    heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}
