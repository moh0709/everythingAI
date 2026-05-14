import { App as OperatorApp } from '../AppComplete';
import { AdminRuntimeApp } from './AdminRuntimeApp';

/**
 * AdminApp is the React boundary for operator/admin workflows.
 *
 * The official user-facing MVP must keep using UserApp.tsx through main.tsx.
 * By default this wrapper still renders the existing AppComplete operator UI.
 *
 * To test the modular admin runtime locally, open the admin React entry with:
 *
 *   ?adminRuntime=modular
 *
 * This keeps the migration opt-in and avoids changing the current runtime behavior.
 */
export function AdminApp() {
  const useModularRuntime = new URLSearchParams(window.location.search).get('adminRuntime') === 'modular';

  if (useModularRuntime) return <AdminRuntimeApp />;

  return <OperatorApp />;
}

export default AdminApp;
