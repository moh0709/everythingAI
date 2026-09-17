export type ArchiveReviewStatus = 'pending' | 'approved' | 'rejected';
export type ArchiveConflictStatus = 'none' | 'conflict' | 'stale' | 'blocked';
export type ArchiveStaleState =
  | 'current'
  | 'source_changed'
  | 'archive_missing'
  | 'archive_changed'
  | 'sidecar_missing'
  | 'conflict';

export type ArchiveReviewEvidenceRef = {
  type: string;
  source_path: string;
  locator?: string;
};

export type ArchiveReviewItem = {
  plan_item_id: string;
  source_path: string;
  suggested_archive_path: string;
  approval_status: ArchiveReviewStatus;
  conflict_status: ArchiveConflictStatus;
  stale_state?: ArchiveStaleState;
  review_mode?: string;
  ai_generated_fields: string[];
  evidence_refs: ArchiveReviewEvidenceRef[];
};

export type ArchiveReviewFilter =
  | 'all'
  | ArchiveReviewStatus
  | 'stale'
  | ArchiveStaleState;

const STALE_STATES: ArchiveStaleState[] = [
  'current',
  'source_changed',
  'archive_missing',
  'archive_changed',
  'sidecar_missing',
  'conflict',
];

const MANUAL_REVIEW_STATES = new Set<ArchiveStaleState>(['archive_changed', 'conflict']);

export function getArchiveStaleState(item: ArchiveReviewItem): ArchiveStaleState {
  return item.stale_state ?? 'current';
}

export function isArchiveReviewItemBlocked(item: ArchiveReviewItem) {
  return item.conflict_status !== 'none' || MANUAL_REVIEW_STATES.has(getArchiveStaleState(item));
}

export function filterArchiveReviewItems(items: ArchiveReviewItem[], filter: ArchiveReviewFilter) {
  if (filter === 'all') return items;
  if (filter === 'stale') return items.filter((item) => getArchiveStaleState(item) !== 'current');
  if (filter === 'conflict') {
    return items.filter((item) => getArchiveStaleState(item) === 'conflict' || item.conflict_status !== 'none');
  }
  if (STALE_STATES.includes(filter as ArchiveStaleState)) {
    return items.filter((item) => getArchiveStaleState(item) === filter);
  }
  return items.filter((item) => item.approval_status === filter);
}

export function deriveArchiveBulkReviewSummary(items: ArchiveReviewItem[], selectedIds: Set<string>) {
  const selected = items.filter((item) => selectedIds.has(item.plan_item_id));
  const blocked = selected.filter(isArchiveReviewItemBlocked);
  const reviewable = selected.filter((item) => !isArchiveReviewItemBlocked(item));
  const stale = selected.filter((item) => getArchiveStaleState(item) !== 'current');
  const staleStateCounts = Object.fromEntries(
    STALE_STATES.map((state) => [
      state,
      selected.filter((item) => getArchiveStaleState(item) === state).length,
    ]),
  ) as Record<ArchiveStaleState, number>;

  return Object.freeze({
    selected_count: selected.length,
    stale_count: stale.length,
    conflict_count: blocked.length,
    reviewable_count: reviewable.length,
    can_approve_all: selected.length > 0 && blocked.length === 0,
    stale_state_counts: Object.freeze(staleStateCounts),
  });
}

export function applyArchiveApprovalIntent(
  items: ArchiveReviewItem[],
  selectedIds: Set<string>,
  intent: Extract<ArchiveReviewStatus, 'approved' | 'rejected'>,
) {
  return items.map((item) => {
    if (!selectedIds.has(item.plan_item_id)) return item;
    if (intent === 'approved' && isArchiveReviewItemBlocked(item)) return item;
    return { ...item, approval_status: intent };
  });
}
