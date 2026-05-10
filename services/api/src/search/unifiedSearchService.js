import {
  listActionExecutions,
  listFileInsights,
  listFileLabels,
  listOrganizationSuggestions,
} from '../db/client.js';
import { filterActiveFileLinkedRows } from '../recovery/trashVisibility.js';
import { searchFiles } from './searchService.js';
import { semanticSearchFiles } from './semanticSearch.js';

function includesQueryFactory(query) {
  const normalized = query.toLowerCase();
  return (value) => (value || '').toString().toLowerCase().includes(normalized);
}

export function unifiedSearch(db, { query, limit = 20, includeTrashed = false } = {}) {
  const includesQuery = includesQueryFactory(query);
  const files = searchFiles(db, { query, limit, includeTrashed });
  const semantic = semanticSearchFiles(db, { query, limit, includeTrashed });
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
    insights,
    labels,
    suggestions,
    executions,
    totals: {
      files: files.length,
      semantic: semantic.length,
      insights: insights.length,
      labels: labels.length,
      suggestions: suggestions.length,
      executions: executions.length,
    },
  };
}
