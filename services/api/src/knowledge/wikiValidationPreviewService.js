import { getPersistedWikiPageEvidence } from '../db/wikiRepository.js';

function issue(severity, type, message, evidenceRefs = []) {
  return { severity, type, message, evidence_refs: evidenceRefs };
}

function recommendationFor({ issues, pageStatus }) {
  if (pageStatus && pageStatus !== 'active') return 'rebuild_recommended';
  if (issues.some((item) => item.severity === 'high')) return 'needs_review';
  if (issues.some((item) => item.severity === 'medium')) return 'needs_review';
  return 'pass';
}

function statusFor(issues) {
  if (issues.some((item) => item.severity === 'high')) return 'failed';
  if (issues.length) return 'warning';
  return 'passed';
}

export function buildWikiValidationPreview(db, pageId) {
  const evidence = getPersistedWikiPageEvidence(db, pageId);
  if (!evidence) return null;

  const { page, sources, chunks } = evidence;
  const issues = [];
  const citationCoverage = Number(page.citation_coverage_score || 0);

  if (!sources.length) {
    issues.push(issue('high', 'missing_sources', 'No source records are attached to this page.'));
  }

  if (!chunks.length) {
    issues.push(issue('high', 'missing_chunks', 'No evidence chunks are attached to this page.'));
  }

  if (page.status && page.status !== 'active') {
    issues.push(issue('high', 'runtime_degraded', `Page status is ${page.status}.`));
  }

  if (citationCoverage < 0.5) {
    issues.push(issue('medium', 'low_citation_coverage', 'Citation coverage is below the preferred threshold.'));
  }

  if (page.weak_source_warning) {
    issues.push(issue('medium', 'weak_source_warning', 'Weak source warning is present.'));
  }

  const sourceCount = sources.length;
  const chunkCount = chunks.length;
  const supportScore = Math.max(0, Math.min(1, Math.round(citationCoverage * 100) / 100));
  const riskScore = Math.max(0, Math.min(1, Math.round((1 - supportScore) * 100) / 100));
  const status = statusFor(issues);
  const recommendation = recommendationFor({ issues, pageStatus: page.status });

  return {
    page_id: page.id,
    page_title: page.title,
    mode: 'structural',
    status,
    confidence_score: 0,
    support_score: supportScore,
    risk_score: riskScore,
    recommendation,
    issues,
    summary: `Read-only structural preview based on ${sourceCount} source record(s), ${chunkCount} evidence chunk(s), and citation coverage ${citationCoverage}.`,
    authority: 'advisory',
    persisted: false,
  };
}
