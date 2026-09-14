export type ArchiveReviewStatus = 'pending' | 'approved' | 'rejected';
export type ArchiveConflictStatus = 'none' | 'conflict' | 'stale' | 'blocked';

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
  ai_generated_fields: string[];
  evidence_refs: ArchiveReviewEvidenceRef[];
};

export type ArchiveReviewFilter = 'all' | ArchiveReviewStatus | 'conflict';

export function isArchiveReviewItemBlocked(item: ArchiveReviewItem) {
  return item.conflict_status !== 'none';
}

export function filterArchiveReviewItems(items: ArchiveReviewItem[], filter: ArchiveReviewFilter) {
  if (filter === 'all') return items;
  if (filter === 'conflict') return items.filter(isArchiveReviewItemBlocked);
  return items.filter((item) => item.approval_status === filter);
}

export function deriveArchiveBulkReviewSummary(items: ArchiveReviewItem[], selectedIds: Set<string>) {
  const selected = items.filter((item) => selectedIds.has(item.plan_item_id));
  const blocked = selected.filter(isArchiveReviewItemBlocked);
  const reviewable = selected.filter((item) => !isArchiveReviewItemBlocked(item));

  return Object.freeze({
    selected_count: selected.length,
    conflict_count: blocked.length,
    reviewable_count: reviewable.length,
    can_approve_all: selected.length > 0 && blocked.length === 0,
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
