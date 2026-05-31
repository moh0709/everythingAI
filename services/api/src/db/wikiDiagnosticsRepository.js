import { ensureWikiHumanValidationSchema } from './wikiHumanValidationRepository.js';
import { ensureWikiIncrementalSchema } from './wikiIncrementalRepository.js';
import { ensureWikiPersistenceSchema } from './wikiRepository.js';

function gradeForScore(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function computePageQuality(page) {
  const reasons = [];
  let score = 100;

  if (page.status !== 'active') {
    score -= 35;
    reasons.push(`Page status is ${page.status}.`);
  } else {
    reasons.push('Page is active.');
  }

  if (page.source_count <= 0) {
    score -= 30;
    reasons.push('No source records are attached.');
  } else {
    reasons.push(`${page.source_count} source record(s) attached.`);
  }

  if (page.chunk_count <= 0) {
    score -= 25;
    reasons.push('No persisted evidence chunks are attached.');
  } else {
    reasons.push(`${page.chunk_count} persisted evidence chunk(s) attached.`);
  }

  if (page.dependency_count <= 0) {
    score -= 15;
    reasons.push('No dependency records are attached.');
  } else {
    reasons.push(`${page.dependency_count} dependency record(s) attached.`);
  }

  if (Number(page.citation_coverage_score || 0) < 0.5) {
    score -= 15;
    reasons.push('Citation coverage score is weak.');
  } else {
    reasons.push('Citation coverage score is acceptable.');
  }

  if (page.weak_source_warning) {
    score -= 10;
    reasons.push('Weak source warning is present.');
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const qualityGrade = gradeForScore(normalizedScore);
  const humanValidation = page.human_validation_status || 'unreviewed';

  return {
    page_id: page.id,
    slug: page.slug,
    title: page.title,
    page_type: page.page_type,
    status: page.status,
    quality_score: normalizedScore,
    quality_grade: qualityGrade,
    source_count: Number(page.source_count || 0),
    chunk_count: Number(page.chunk_count || 0),
    dependency_count: Number(page.dependency_count || 0),
    citation_coverage_score: Number(page.citation_coverage_score || 0),
    weak_source_warning: Boolean(page.weak_source_warning),
    validation_state: {
      source_validation: page.source_count > 0 && page.chunk_count > 0 ? 'supported' : 'weak',
      runtime_validation: page.status === 'active' ? 'healthy' : 'degraded',
      ai_validation: 'not_started',
      human_validation: humanValidation,
    },
    governance_flags: {
      high_quality_unreviewed: ['A', 'B'].includes(qualityGrade) && humanValidation === 'unreviewed',
      high_quality_rejected: ['A', 'B'].includes(qualityGrade) && humanValidation === 'rejected',
      high_quality_attention: ['A', 'B'].includes(qualityGrade) && humanValidation === 'needs_attention',
      low_quality_approved: ['D', 'F'].includes(qualityGrade) && humanValidation === 'approved',
    },
    reasons,
  };
}

function computeWorkspaceTrustHealth(qualitySummary) {
  if (!qualitySummary.length) {
    return {
      status: 'unknown',
      quality_score: 0,
      quality_grade: 'F',
      page_count: 0,
      grade_counts: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      reasons: ['No page quality signals are available yet.'],
    };
  }

  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  let totalScore = 0;

  for (const pageQuality of qualitySummary) {
    gradeCounts[pageQuality.quality_grade] = (gradeCounts[pageQuality.quality_grade] || 0) + 1;
    totalScore += pageQuality.quality_score;
  }

  const averageScore = Math.round(totalScore / qualitySummary.length);
  const problemCount = gradeCounts.D + gradeCounts.F;
  const warningCount = gradeCounts.C;
  const status = problemCount > 0
    ? 'degraded'
    : warningCount > 0
      ? 'warning'
      : 'healthy';

  const reasons = [
    `${qualitySummary.length} page quality signal(s) evaluated.`,
    `Average page quality score is ${averageScore}/100.`,
  ];

  if (problemCount > 0) {
    reasons.push(`${problemCount} page(s) are in D/F trust range.`);
  }

  if (warningCount > 0) {
    reasons.push(`${warningCount} page(s) are in C warning range.`);
  }

  if (status === 'healthy') {
    reasons.push('All evaluated pages are currently in A/B trust range.');
  }

  return {
    status,
    quality_score: averageScore,
    quality_grade: gradeForScore(averageScore),
    page_count: qualitySummary.length,
    grade_counts: gradeCounts,
    reasons,
  };
}

function computeValidationSummary({ qualitySummary, validationRows }) {
  const counts = {
    unreviewed: qualitySummary.length,
    reviewed: 0,
    approved: 0,
    needs_attention: 0,
    rejected: 0,
  };

  for (const row of validationRows) {
    if (!Object.prototype.hasOwnProperty.call(counts, row.status)) continue;
    counts[row.status] += Number(row.count || 0);
    counts.unreviewed -= Number(row.count || 0);
  }

  counts.unreviewed = Math.max(0, counts.unreviewed);

  const conflictPages = qualitySummary.filter((page) => (
    page.governance_flags.high_quality_rejected
    || page.governance_flags.high_quality_attention
    || page.governance_flags.low_quality_approved
  ));

  const reviewCandidatePages = qualitySummary.filter((page) => page.governance_flags.high_quality_unreviewed);

  const reviewedTotal = counts.reviewed + counts.approved + counts.needs_attention + counts.rejected;
  const attentionTotal = counts.needs_attention + counts.rejected;
  const status = conflictPages.length > 0 || attentionTotal > 0
    ? 'attention_required'
    : counts.unreviewed > 0
      ? 'incomplete'
      : 'complete';

  const reasons = [
    `${qualitySummary.length} page(s) included in validation visibility.`,
    `${reviewedTotal} page(s) have a stored human validation record.`,
  ];

  if (counts.unreviewed > 0) {
    reasons.push(`${counts.unreviewed} page(s) are still unreviewed.`);
  }

  if (reviewCandidatePages.length > 0) {
    reasons.push(`${reviewCandidatePages.length} high-quality page(s) are review candidates.`);
  }

  if (attentionTotal > 0) {
    reasons.push(`${attentionTotal} page(s) require attention or were rejected.`);
  }

  if (conflictPages.length > 0) {
    reasons.push(`${conflictPages.length} page(s) have quality/review conflicts.`);
  }

  if (status === 'complete') {
    reasons.push('All visible pages have a stored human validation record.');
  }

  return {
    status,
    page_count: qualitySummary.length,
    counts,
    conflict_count: conflictPages.length,
    review_candidate_count: reviewCandidatePages.length,
    conflicts: conflictPages.slice(0, 10).map((page) => ({
      page_id: page.page_id,
      title: page.title,
      quality_grade: page.quality_grade,
      quality_score: page.quality_score,
      human_validation: page.validation_state.human_validation,
      flags: page.governance_flags,
    })),
    review_candidates: reviewCandidatePages.slice(0, 10).map((page) => ({
      page_id: page.page_id,
      title: page.title,
      quality_grade: page.quality_grade,
      quality_score: page.quality_score,
      human_validation: page.validation_state.human_validation,
      flags: page.governance_flags,
    })),
    reasons,
  };
}

export function getWikiDiagnostics(db, { limit = 250 } = {}) {
  ensureWikiPersistenceSchema(db);
  ensureWikiIncrementalSchema(db);
  ensureWikiHumanValidationSchema(db);

  const buildState = db.prepare(`
    SELECT key, value, updated_at
    FROM wiki_build_state
    ORDER BY key ASC
  `).all();

  const fingerprints = db.prepare(`
    SELECT file_id, absolute_path, content_hash, content_length, extracted_at, updated_at
    FROM wiki_file_fingerprints
    ORDER BY updated_at DESC, file_id ASC
    LIMIT @limit
  `).all({ limit });

  const dependencies = db.prepare(`
    SELECT id, page_id, file_id, source_ref, updated_at
    FROM wiki_page_dependencies
    ORDER BY page_id ASC, file_id ASC, source_ref ASC
    LIMIT @limit
  `).all({ limit });

  const rebuilds = db.prepare(`
    SELECT id, mode, status, input_json, summary_json, started_at, completed_at, created_at, error_message
    FROM wiki_rebuilds
    ORDER BY created_at DESC
    LIMIT @limit
  `).all({ limit });

  const pageStats = db.prepare(`
    SELECT
      COUNT(*) AS total_pages,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_pages,
      SUM(CASE WHEN status = 'stale' THEN 1 ELSE 0 END) AS stale_pages,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_pages,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived_pages
    FROM wiki_pages
  `).get();

  const evidenceStats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM wiki_page_sections) AS section_count,
      (SELECT COUNT(*) FROM wiki_page_sources) AS source_count,
      (SELECT COUNT(*) FROM wiki_source_chunks) AS chunk_count,
      (SELECT COUNT(*) FROM wiki_page_relations) AS relation_count
  `).get();

  const pageQualityRows = db.prepare(`
    SELECT
      page.id,
      page.slug,
      page.title,
      page.page_type,
      page.status,
      page.citation_coverage_score,
      page.weak_source_warning,
      human.status AS human_validation_status,
      COUNT(DISTINCT source.id) AS source_count,
      COUNT(DISTINCT chunk.id) AS chunk_count,
      COUNT(DISTINCT dependency.id) AS dependency_count
    FROM wiki_pages page
    LEFT JOIN wiki_human_validations human ON human.page_id = page.id
    LEFT JOIN wiki_page_sources source ON source.page_id = page.id
    LEFT JOIN wiki_source_chunks chunk ON chunk.page_id = page.id
    LEFT JOIN wiki_page_dependencies dependency ON dependency.page_id = page.id
    GROUP BY page.id
    ORDER BY page.title ASC
    LIMIT @limit
  `).all({ limit });

  const validationRows = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM wiki_human_validations
    GROUP BY status
  `).all();

  const qualitySummary = pageQualityRows.map(computePageQuality);

  return {
    generated_at: new Date().toISOString(),
    page_stats: {
      total_pages: Number(pageStats.total_pages || 0),
      active_pages: Number(pageStats.active_pages || 0),
      stale_pages: Number(pageStats.stale_pages || 0),
      failed_pages: Number(pageStats.failed_pages || 0),
      archived_pages: Number(pageStats.archived_pages || 0),
    },
    evidence_stats: {
      section_count: Number(evidenceStats.section_count || 0),
      source_count: Number(evidenceStats.source_count || 0),
      chunk_count: Number(evidenceStats.chunk_count || 0),
      relation_count: Number(evidenceStats.relation_count || 0),
    },
    workspace_trust_health: computeWorkspaceTrustHealth(qualitySummary),
    validation_summary: computeValidationSummary({ qualitySummary, validationRows }),
    quality_summary: qualitySummary,
    build_state: buildState,
    fingerprints,
    dependencies,
    rebuilds: rebuilds.map((rebuild) => ({
      ...rebuild,
      input: JSON.parse(rebuild.input_json || '{}'),
      summary: JSON.parse(rebuild.summary_json || '{}'),
    })),
  };
}
