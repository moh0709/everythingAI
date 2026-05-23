export type ScanReport = {
  rootPath?: string;
  scanned?: number;
  indexed?: number;
  failed?: number;
  skipped?: number;
  skipped_unchanged?: number;
  skipped_large?: number;
  skipped_excluded?: number;
  skippedReasons?: Array<{ reason: string; path: string; message?: string | null }>;
  failedItems?: Array<{ type?: string; path: string; message?: string | null }>;
};
