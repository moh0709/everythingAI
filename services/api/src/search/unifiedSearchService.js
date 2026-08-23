import {
  listActionExecutions,
  listFileInsights,
  listFileLabels,
  listOrganizationSuggestions,
} from '../db/client.js';
import { filterActiveFileLinkedRows } from '../recovery/trashVisibility.js';
import { mapSearchResult } from './searchResultMapper.js';
import { searchFiles } from './searchService.js';
import { semanticSearchFiles } from './semanticSearch.js';

function includesQueryFactory(query) {
  const normalized = query.toLowerCase();
  return (value) => (value || '').toString().toLowerCase().includes(normalized);
}

function resultKey(row) {
  return String(row?.id || row?.file_id || row?.absolute_path || row?.filename || '');
}

function semanticScore(row) {
  const value = Number(row?.score);
  return Number.isFinite(value) ? value : null;
}

function matchPriority(basis) {
  if (basis === 'keyword + semantic') return 0;
  if (basis === 'keyword') return 1;
  return 2;
}

function explainMatch(hasKeyword, hasSemantic) {
  if (hasKeyword && hasSemantic) return 'Matched indexed text and semantic similarity.';
  if (hasKeyword) return 'Matched indexed filename, path, or extracted text.';
  return 'Matched semantic similarity to extracted content.';
}

export function rankUnifiedFileResults(keywordFiles = [], semanticFiles = [], limit = 20) {
  const keywordByKey = new Map();
  const semanticByKey = new Map();

  keywordFiles.forEach((row, index) => {
    const key = resultKey(row);
    if (key) keywordByKey.set(key, { row, rank: index + 1 });
  });

  semanticFiles.forEach((row, index) => {
    const key = resultKey(row);
    if (key) semanticByKey.set(key, { row, rank: index + 1 });
  });

  const keys = new Set([...keywordByKey.keys(), ...semanticByKey.keys()]);
  const ranked = [...keys].map((key) => {
    const keyword = keywordByKey.get(key);
    const semantic = semanticByKey.get(key);
    const hasKeyword = Boolean(keyword);
    const hasSemantic = Boolean(semantic);
    const basis = hasKeyword && hasSemantic
      ? 'keyword + semantic'
      : hasKeyword
        ? 'keyword'
        : 'semantic';
    const score = semanticScore(semantic?.row);
    const base = keyword?.row || mapSearchResult(semantic?.row || {});

    return {
      ...base,
      snippet: base.snippet || semantic?.row?.snippet || null,
      search_match: {
        basis,
        keyword_rank: keyword?.rank || null,
        semantic_rank: semantic?.rank || null,
        semantic_score: score,
        explanation: explainMatch(hasKeyword, hasSemantic),
      },
    };
  });

  ranked.sort((a, b) => {
    const priorityDelta = matchPriority(a.search_match.basis) - matchPriority(b.search_match.basis);
    if (priorityDelta !== 0) return priorityDelta;

    const keywordRankA = a.search_match.keyword_rank ?? Number.POSITIVE_INFINITY;
    const keywordRankB = b.search_match.keyword_rank ?? Number.POSITIVE_INFINITY;
    if (keywordRankA !== keywordRankB) return keywordRankA - keywordRankB;

    const semanticScoreA = a.search_match.semantic_score ?? Number.NEGATIVE_INFINITY;
    const semanticScoreB = b.search_match.semantic_score ?? Number.NEGATIVE_INFINITY;
    if (semanticScoreA !== semanticScoreB) return semanticScoreB - semanticScoreA;

    const filenameDelta = String(a.filename || '').localeCompare(String(b.filename || ''));
    if (filenameDelta !== 0) return filenameDelta;
    return resultKey(a).localeCompare(resultKey(b));
  });

  const normalizedLimit = Math.max(0, Number.parseInt(limit, 10) || 0);
  return ranked.slice(0, normalizedLimit);
}

export function unifiedSearch(db, { query, limit = 20, includeTrashed = false } = {}) {
  const includesQuery = includesQueryFactory(query);
  const files = searchFiles(db, { query, limit, includeTrashed });
  const semantic = semanticSearchFiles(db, { query, limit, includeTrashed });
  const rankedFiles = rankUnifiedFileResults(files, semantic, limit);
  const insights = filterActiveFileLinkedRows(db, listFileInsights(db, { limit: 500 }), {
    includeTrashed,
  }).filter((insight) => (
    includesQuery(insight.filename)
    || includesQuery(insight.absolute_path)
    || includesQuery(insight.summary)
    || includesQuery(insight.classification)
    || includesQuery(insight.entities_json)
  )).slice(0, limit);
  const labels = filterActiveFileLinkedRows(db, listFileLabels(db, { limit: 500 }), {
    includeTrashed,
  }).filter((label) => (
    includesQuery(label.filename)
    || includesQuery(label.absolute_path)
    || includesQuery(label.category)
    || label.tags.some((tag) => includesQuery(tag))
  )).slice(0, limit);
  const suggestions = filterActiveFileLinkedRows(db, listOrganizationSuggestions(db, { limit: 500 }), {
    includeTrashed,
  }).filter((suggestion) => (
    includesQuery(suggestion.filename)
    || includesQuery(suggestion.absolute_path)
    || includesQuery(suggestion.action_type)
    || includesQuery(suggestion.suggested_value)
    || includesQuery(suggestion.reason)
  )).slice(0, limit);
  const executions = filterActiveFileLinkedRows(db, listActionExecutions(db, { limit: 500 }), {
    includeTrashed,
  }).filter((execution) => (
    includesQuery(execution.filename)
    || includesQuery(execution.absolute_path)
    || includesQuery(execution.action_type)
    || includesQuery(execution.status)
    || includesQuery(execution.source_path)
    || includesQuery(execution.target_path)
  )).slice(0, limit);

  return {
    query,
    files,
    semantic,
    ranked_files: rankedFiles,
    insights,
    labels,
    suggestions,
    executions,
    totals: {
      files: files.length,
      semantic: semantic.length,
      ranked_files: rankedFiles.length,
      insights: insights.length,
      labels: labels.length,
      suggestions: suggestions.length,
      executions: executions.length,
    },
  };
}
