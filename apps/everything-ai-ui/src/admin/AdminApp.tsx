import { App as OperatorApp } from '../AppComplete';

/**
 * AdminApp is the React boundary for operator/admin workflows.
 *
 * The official user-facing MVP must keep using UserApp.tsx through main.tsx.
 * This wrapper gives us a stable place to continue splitting AppComplete.tsx into
 * admin-specific components without exposing planning, execution, recovery, audit,
 * provider, or source-management workflows to the user UI.
 */
export function AdminApp() {
  return <OperatorApp />;
}

export default AdminApp;
