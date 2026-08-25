import React from 'react';
import type { ScanReport } from './scanReportTypes';
import type { WatcherStatusPayload } from './useWatcherControls';

type SourceRecoveryContextProps = {
  folderPath: string;
  scanReport: ScanReport | null;
  watcherStatus: WatcherStatusPayload | null;
};

function count(value: number | undefined) {
  return Number.isFinite(value) ? value : 0;
}

function selectRecoveryRoot(folderPath: string, scanReport: ScanReport | null, watcherStatus: WatcherStatusPayload | null) {
  const configured = folderPath.trim();
  if (configured) return configured;
  if (scanReport?.rootPath) return scanReport.rootPath;
  return watcherStatus?.watchers?.find((watcher) => watcher.running)?.rootPath
    || watcherStatus?.watchers?.[0]?.rootPath
    || '';
}

export function SourceRecoveryContext({ folderPath, scanReport, watcherStatus }: SourceRecoveryContextProps) {
  const recoveryRoot = selectRecoveryRoot(folderPath, scanReport, watcherStatus);
  const matchingWatcher = recoveryRoot
    ? watcherStatus?.watchers?.find((watcher) => watcher.rootPath === recoveryRoot)
    : undefined;

  return (
    <section className="panel" aria-label="Source-root recovery context">
      <div className="panel-title">
        <div>
          <h2 id="client-source-recovery-heading" tabIndex={-1}>Source-root recovery context</h2>
          <p>Recovery is scoped to the configured source root. EverythingAI does not offer a per-file retry from this view.</p>
        </div>
      </div>

      <div className="settings-help-grid">
        <div>
          <strong>Configured source root</strong>
          {recoveryRoot
            ? <p><code>{recoveryRoot}</code></p>
            : <p>No source root is currently available in the persisted client state.</p>}
        </div>
        <div>
          <strong>Opening this view is read-only</strong>
          <p>Opening recovery context does not start a scan, extraction, Knowledge Base rebuild, watcher, or file mutation.</p>
        </div>
        <div>
          <strong>Why recovery is root-scoped</strong>
          <p>The existing recovery path rebuilds knowledge from the configured source root so indexing and extraction can be reconciled together. It is not a hidden per-file retry.</p>
        </div>
      </div>

      <div className="settings-help-grid">
        <div>
          <strong>Latest scan evidence</strong>
          {scanReport?.rootPath
            ? <p>Persisted scan report for <code>{scanReport.rootPath}</code>: {count(scanReport.indexed)} indexed, {count(scanReport.skipped)} skipped, {count(scanReport.failed)} failed.</p>
            : <p>No persisted scan report is loaded in this view.</p>}
        </div>
        <div>
          <strong>Watcher evidence</strong>
          {matchingWatcher
            ? <p>Status: {matchingWatcher.status}. Running: {matchingWatcher.running ? 'Yes' : 'No'} · Pending: {matchingWatcher.pending ? 'Yes' : 'No'} · Scheduled: {matchingWatcher.scheduled ? 'Yes' : 'No'}.</p>
            : <p>No matching persisted watcher state is loaded for this source root.</p>}
        </div>
        <div>
          <strong>Before choosing recovery</strong>
          <p>Inspect the configured Folder Path, latest Scan Report, and Watcher Status below. Use the existing Build Knowledge or watcher controls only when you intentionally want to re-scan or resume monitoring.</p>
        </div>
      </div>
    </section>
  );
}
