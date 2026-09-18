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

export type ArchiveMetadataUserProvenance = {
  edited_by: string;
  edited_at: string;
  replaced_ai_generated: boolean;
  prior_generated_by?: string | null;
  prior_evidence_refs?: ArchiveReviewEvidenceRef[];
};

export type ArchiveReviewMetadataEntry = {
  value: unknown;
  generated_by?: string | null;
  ai_generated: boolean;
  evidence_refs: ArchiveReviewEvidenceRef[];
  user_provenance?: ArchiveMetadataUserProvenance | null;
};

export type ArchiveReviewEnrichment = {
  enabled: boolean;
  status: 'ready' | 'disabled' | string;
  provider_neutral?: boolean;
  metadata: Record<string, ArchiveReviewMetadataEntry>;
  filesystem_mutation_allowed?: boolean;
  execution_allowed?: boolean;
  automatic_approval_allowed?: boolean;
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
  enrichment?: ArchiveReviewEnrichment;
};

export type ArchiveReviewFilter =
  | 'all'
  | ArchiveReviewStatus
  | 'stale'
  | ArchiveStaleState;

export type ArchiveMetadataProvenanceView = {
  field: string;
  origin: 'ai_generated' | 'user_edited' | 'user_authored';
  generated_by: string | null;
  evidence_count: number;
  edited_by: string | null;
  edited_at: string | null;
  replaced_ai_generated: boolean;
  prior_generated_by: string | null;
  prior_evidence_count: number;
};

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

export function getArchiveEnrichmentState(item: ArchiveReviewItem) {
  if (!item.enrichment) return 'not_supplied' as const;
  return item.enrichment.enabled ? 'enabled' as const : 'disabled' as const;
}

export function deriveArchiveMetadataProvenance(item: ArchiveReviewItem): ArchiveMetadataProvenanceView[] {
  const metadata = item.enrichment?.metadata ?? {};

  return Object.entries(metadata)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([field, entry]) => {
      const user = entry.user_provenance ?? null;
      const origin = user
        ? (user.replaced_ai_generated ? 'user_edited' : 'user_authored')
        : (entry.ai_generated ? 'ai_generated' : 'user_authored');

      return Object.freeze({
        field,
        origin,
        generated_by: entry.generated_by ?? null,
        evidence_count: Array.isArray(entry.evidence_refs) ? entry.evidence_refs.length : 0,
        edited_by: user?.edited_by ?? null,
        edited_at: user?.edited_at ?? null,
        replaced_ai_generated: user?.replaced_ai_generated === true,
        prior_generated_by: user?.prior_generated_by ?? null,
        prior_evidence_count: Array.isArray(user?.prior_evidence_refs) ? user.prior_evidence_refs.length : 0,
      });
    });
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
