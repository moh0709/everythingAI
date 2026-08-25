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

export function SourceRecoveryContext({ folderPath, scanReport, watcherStatus }: SourceRecoveryContextProps) {
  const configuredRoot = folderPath.trim();
  const scanRoot = scanReport?.rootPath || '';
  const scanMatchesConfiguredRoot = Boolean(configuredRoot && scanRoot && configuredRoot === scanRoot);
  const scanDiffersFromConfiguredRoot = Boolean(configuredRoot && scanRoot && configuredRoot !== scanRoot);
  const matchingWatcher = configuredRoot
    ? watcherStatus?.watchers?.find((watcher) => watcher.rootPath === configuredRoot)
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
          {configuredRoot
            ? <p><code>{configuredRoot}</code></p>
            : <p>No source root is currently configured in the persisted client state.</p>}
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
          {scanReport?.rootPath ? <>
            <p>Persisted scan report for <code>{scanReport.rootPath}</code>: {count(scanReport.indexed)} indexed, {count(scanReport.skipped)} skipped, {count(scanReport.failed)} failed.</p>
            {scanMatchesConfiguredRoot ? <p><strong>Evidence scope:</strong> this persisted scan report matches the configured source root exactly, so these counts describe that recovery root.</p> : null}
            {scanDiffersFromConfiguredRoot ? <p><strong>Evidence scope:</strong> this persisted scan report belongs to another source root. Its counts do not describe the configured recovery root <code>{configuredRoot}</code>.</p> : null}
            {!configuredRoot ? <p><strong>Evidence scope:</strong> applicability to a configured recovery root is unknown because no source root is currently configured.</p> : null}
            <p>{count(scanReport.indexed)} indexed: recorded as indexed by the latest persisted scan report.</p>
            <p>{count(scanReport.skipped)} skipped: skipped by that scan; skipped does not mean failed or ready.</p>
            <p>{count(scanReport.failed)} failed: recorded as failed by that scan; use the Scan Report below for persisted failure details rather than inferring a cause here.</p>
          </> : <>
            <p>No persisted scan report is loaded in this view.</p>
            <p>No scan outcome can be concluded from this view until a persisted scan report is available.</p>
          </>}
        </div>
        <div>
          <strong>Watcher evidence</strong>
          {matchingWatcher
            ? <>
              <p>Watcher scope: exact match for <code>{configuredRoot}</code>.</p>
              <p>Status: {matchingWatcher.status}. Running: {matchingWatcher.running ? 'Yes' : 'No'} · Pending: {matchingWatcher.pending ? 'Yes' : 'No'} · Scheduled: {matchingWatcher.scheduled ? 'Yes' : 'No'}.</p>
            </>
            : configuredRoot
              ? <p>No matching persisted watcher state is loaded for the configured source root <code>{configuredRoot}</code>.</p>
              : <p>Watcher applicability is unknown because no configured recovery root is available.</p>}
          <p>Watcher state is monitoring evidence only. It does not prove extraction, recovery, or Knowledge Base success.</p>
        </div>
        <div>
          <strong>Before choosing recovery</strong>
          <p>Inspect the configured Folder Path, latest Scan Report, and Watcher Status below. Use the existing Build Knowledge or watcher controls only when you intentionally want to re-scan or resume monitoring.</p>
          <p>Next step: inspect the Scan Report and Folder Path first. Use Build Knowledge or watcher controls only when you intentionally choose to rerun the source-root flow or change monitoring.</p>
        </div>
      </div>
    </section>
  );
}
