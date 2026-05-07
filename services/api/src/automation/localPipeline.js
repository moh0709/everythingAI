import { listIndexedFiles } from '../db/client.js';
import { extractIndexedFiles } from '../extractors/extractionRunner.js';
import { generateEmbeddings } from '../embeddings/embeddingService.js';
import { generateFileInsights } from '../insights/insightService.js';
import { buildKnowledgeIndex } from '../knowledge/knowledgeService.js';
import { generatePreviewSuggestions } from '../suggestions/suggestionService.js';

export async function runKnowledgeIngestionPipeline(db, {
  limit = 1000,
  extract = true,
  embeddings = true,
  insights = true,
  useOllama = false,
  logger = console,
} = {}) {
  const result = {
    extraction: null,
    embeddings: null,
    insights: null,
    knowledge: null,
  };

  if (extract) {
    result.extraction = await extractIndexedFiles(db, { limit, logger });
  }

  if (embeddings) {
    result.embeddings = generateEmbeddings(db, { limit });
  }

  if (insights) {
    result.insights = await generateFileInsights(db, { limit, useOllama });
    result.knowledge = buildKnowledgeIndex(db, { limit });
  }

  return result;
}

export function runPlanningPipeline(db, {
  limit = 1000,
} = {}) {
  let suggestions = 0;
  const files = listIndexedFiles(db, { limit });

  for (const file of files) {
    suggestions += generatePreviewSuggestions(db, { fileId: file.id }).length;
  }

  return { suggestions };
}

export async function runLocalAutomationPipeline(db, {
  limit = 1000,
  extract = true,
  embeddings = true,
  insights = true,
  suggestions = true,
  useOllama = false,
  logger = console,
} = {}) {
  const result = {
    ...(await runKnowledgeIngestionPipeline(db, {
      limit,
      extract,
      embeddings,
      insights,
      useOllama,
      logger,
    })),
    suggestions: 0,
  };

  if (suggestions) {
    result.suggestions = runPlanningPipeline(db, { limit }).suggestions;
  }

  return result;
}
