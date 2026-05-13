import { Shield } from 'lucide-react';
import type { ProviderSettings } from '../../providerSettingsApi';

type PlanningPolicyPanelProps = {
  planning: ProviderSettings['planning'];
  update: (path: string, value: unknown) => void;
};

export function PlanningPolicyPanel({ planning, update }: PlanningPolicyPanelProps) {
  return <div className="panel">
    <h2><Shield /> Planning & Execution Policy</h2>
    <p className="muted">These controls govern which action types may be proposed and how strictly execution must be approved.</p>

    <div className="settings-grid">
      <label>
        Planning strategy
        <select value={planning.strategy} onChange={(event) => update('planning.strategy', event.target.value)}>
          <option value="safe">Safe</option>
          <option value="balanced">Balanced</option>
          <option value="aggressive">Aggressive</option>
        </select>
      </label>

      <label>
        Confidence threshold: {Math.round(Number(planning.confidenceThreshold || 0) * 100)}%
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={planning.confidenceThreshold}
          onChange={(event) => update('planning.confidenceThreshold', Number(event.target.value))}
        />
      </label>

      <label className="setting-check">
        <input type="checkbox" checked={planning.allowRename} onChange={(event) => update('planning.allowRename', event.target.checked)} />
        Allow rename suggestions
      </label>

      <label className="setting-check">
        <input type="checkbox" checked={planning.allowMove} onChange={(event) => update('planning.allowMove', event.target.checked)} />
        Allow move suggestions
      </label>

      <label className="setting-check">
        <input type="checkbox" checked={planning.allowTag} onChange={(event) => update('planning.allowTag', event.target.checked)} />
        Allow tag suggestions
      </label>

      <label className="setting-check">
        <input type="checkbox" checked={planning.allowCategory} onChange={(event) => update('planning.allowCategory', event.target.checked)} />
        Allow category suggestions
      </label>

      <label className="setting-check">
        <input type="checkbox" checked={planning.requireApproval} onChange={(event) => update('planning.requireApproval', event.target.checked)} />
        Require explicit approval
      </label>

      <label className="setting-check">
        <input type="checkbox" checked={planning.dryRunOnly} onChange={(event) => update('planning.dryRunOnly', event.target.checked)} />
        Dry-run only mode
      </label>
    </div>

    <div className="warning">
      Permanent purge remains forbidden in the local MVP. Execution must stay preview-first, approval-first, and audit-backed.
    </div>
  </div>;
}

export default PlanningPolicyPanel;
