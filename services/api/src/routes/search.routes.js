import { Router } from 'express';
import {
  openDatabase,
  listActionExecutions,
  listFileInsights,
  listFileLabels,
  listOrganizationSuggestions,
} from '../db/client.js';
import { searchFiles } from '../search/searchService.js';
import { semanticSearchFiles } from '../search/semanticSearch.js';
import { generateEmbeddings } from '../embeddings/embeddingService.js';
import { answerFromLocalFiles } from '../ai/chatPipeline.js';
import { requireBodyString, requireQueryString, parseLimit } from '../utils/request.js';
import { filterActiveFileLinkedRows } from '../recovery/trashVisibility.js';

function includeTrashed(queryValue) {
  return queryValue?.toString().toLowerCase() === 'true';
}

export function createSearchRouter() {
  const router = Router();

  router.get('/search', (req, res) => {
    const query = requireQueryString(req, res, 'q');
    if (!query) return;

    const db = openDatabase();
    const results = searchFiles(db, {
      query,
      limit: parseLimit(req.query.limit, 20),
      includeTrashed: includeTrashed(req.query.includeTrashed),
    });
    db.close();

    res.json({ results });
  });

  router.get('/semantic-search', (req, res) => {
    const query = requireQueryString(req, res, 'q');
    if (!query) return;

    const db = openDatabase();
    const results = semanticSearchFiles(db, {
      query,
      limit: parseLimit(req.query.limit, 10),
      includeTrashed: includeTrashed(req.query.includeTrashed),
    });
    db.close();

    res.json({ results });
  });

  router.get('/unified-search', (req, res) => {
    const query = requireQueryString(req, res, 'q');
    if (!query) return;

    const limit = parseLimit(req.query.limit, 20);
    const normalized = query.toLowerCase();
    const includeTrash = includeTrashed(req.query.includeTrashed);
    const includesQuery = (value) => (value || '').toString().toLowerCase().includes(normalized);
    const db = openDatabase();
    const files = searchFiles(db, { query, limit, includeTrashed: includeTrash });
    const semantic = semanticSearchFiles(db, { query, limit, includeTrashed: includeTrash });
    const insights = filterActiveFileLinkedRows(db, listFileInsights(db, { limit: 500 }), {
      includeTrashed: includeTrash,
    }).filter((insight) => (
      includesQuery(insight.filename)
      || includesQuery(insight.absolute_path)
      || includesQuery(insight.summary)
      || includesQuery(insight.classification)
      || includesQuery(insight.entities_json)
    )).slice(0, limit);
    const labels = filterActiveFileLinkedRows(db, listFileLabels(db, { limit: 500 }), {
      includeTrashed: includeTrash,
    }).filter((label) => (
      includesQuery(label.filename)
      || includesQuery(label.absolute_path)
      || includesQuery(label.category)
      || label.tags.some((tag) => includesQuery(tag))
    )).slice(0, limit);
    const suggestions = filterActiveFileLinkedRows(db, listOrganizationSuggestions(db, { limit: 500 }), {
      includeTrashed: includeTrash,
    }).filter((suggestion) => (
      includesQuery(suggestion.filename)
      || includesQuery(suggestion.absolute_path)
      || includesQuery(suggestion.action_type)
      || includesQuery(suggestion.suggested_value)
      || includesQuery(suggestion.reason)
    )).slice(0, limit);
    const executions = filterActiveFileLinkedRows(db, listActionExecutions(db, { limit: 500 }), {
      includeTrashed: includeTrash,
    }).filter((execution) => (
      includesQuery(execution.filename)
      || includesQuery(execution.absolute_path)
      || includesQuery(execution.action_type)
      || includesQuery(execution.status)
      || includesQuery(execution.source_path)
      || includesQuery(execution.target_path)
    )).slice(0, limit);
    db.close();

    res.json({
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
    });
  });

  router.post('/embeddings', (req, res) => {
    const db = openDatabase();
    const result = generateEmbeddings(db, {
      fileId: req.body?.fileId,
      limit: parseLimit(req.body?.limit, 1000),
    });
    db.close();

    res.json(result);
  });

  router.post('/chat', async (req, res, next) => {
    try {
      const question = requireBodyString(req, res, 'question');
      if (!question) return;

      const db = openDatabase();
      const result = await answerFromLocalFiles(db, {
        question,
        limit: parseLimit(req.body?.limit, 5),
        provider: req.body?.provider,
      });
      db.close();

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
