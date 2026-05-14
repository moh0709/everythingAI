import type { ReactNode } from 'react';
import type { ProviderName } from '../../providerSettingsApi';
import type { AdminSection } from '../types';
import { AdminErrorBanner } from './AdminErrorBanner';
import { AdminHeader } from './AdminHeader';
import { AdminHero } from './AdminHero';
import { AdminStatusBanner } from './AdminStatusBanner';

type AdminShellProps = {
  section: AdminSection;
  setSection: (section: AdminSection) => void;
  loadAudit: () => void;
  activeProvider: ProviderName;
  query: string;
  setQuery: (query: string) => void;
  searchEverything: () => void;
  busy: boolean;
  message: string;
  error: string;
  children: ReactNode;
};

export function AdminShell({
  section,
  setSection,
  loadAudit,
  activeProvider,
  query,
  setQuery,
  searchEverything,
  busy,
  message,
  error,
  children,
}: AdminShellProps) {
  return <div className="app">
    <AdminHeader
      section={section}
      setSection={setSection}
      loadAudit={loadAudit}
      activeProvider={activeProvider}
    />
    <main className="page">
      <AdminHero
        query={query}
        setQuery={setQuery}
        searchEverything={searchEverything}
        setSection={setSection}
        loadAudit={loadAudit}
      />
      <AdminErrorBanner error={error} />
      <AdminStatusBanner busy={busy} message={message} />
      {children}
    </main>
  </div>;
}

export default AdminShell;
