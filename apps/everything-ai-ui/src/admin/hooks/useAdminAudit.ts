import { useState } from 'react';
import { apiRequest, type ApiOptions } from '../../api';

export type AdminAuditEvent = {
  id: string;
  created_at: string;
  entity_type?: string;
  event_type?: string;
};

export function useAdminAudit() {
  const [audit, setAudit] = useState<AdminAuditEvent[]>([]);

  async function loadAudit(options: ApiOptions, limit = 100) {
    const payload = await apiRequest<{ events: AdminAuditEvent[] }>(options, `/api/audit-log?limit=${limit}`);
    setAudit(payload.events || []);
    return payload.events || [];
  }

  return {
    audit,
    setAudit,
    loadAudit,
  };
}

export default useAdminAudit;
