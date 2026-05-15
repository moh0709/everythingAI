import { AdminRuntimeApp } from './AdminRuntimeApp';

/**
 * AdminApp is the React boundary for operator/admin workflows.
 *
 * The official user-facing MVP must keep using UserApp.tsx through main.tsx.
 * Admin runtime now defaults to the modular admin implementation.
 *
 * Legacy operator code remains in AppComplete.tsx for reference during migration,
 * but it is no longer imported here so strict typechecking validates the active
 * admin path instead of stale legacy prototypes.
 */
export function AdminApp() {
  return <AdminRuntimeApp />;
}

export default AdminApp;
