import { listIndexedFiles } from '../db/client.js';
import { extractIndexedFiles } from '../extractors/extractionRunner.js';
import { generateEmbeddings } from '../embeddings/embeddingService.js';
import { generateFileInsights } from '../insights/insightService.js';
import { buildKnowledgeIndex } from '../knowledge/knowledgeService.js';
import { generatePreviewSuggestions } from '../suggestions/suggestionService.js';

function createKnowledgeSummary({ extraction, embeddings, insights, knowledge }) {
  return {
    extracted: extraction?.extracted || 0,
    failed_extractions: extraction?.failed || 0,
    unsupported_extractions: extraction?.unsupported || 0,
    skipped_unchanged_extractions: extraction?.skipped_unchanged || 0,
    embedded: embeddings?.generated || 0,
    skipped_embeddings: embeddings?.skipped || 0,
    insight_files: insights?.generated || 0,
    failed_insights: insights?.failed || 0,
    knowledge_classifications: knowledge?.classification_count || 0,
    knowledge_entities: knowledge?.entity_count || 0,
  };
}

function createWarnings({ extraction, embeddings, insights }) {
  const warnings = [];

  if (extraction?.failed > 0) {
    warnings.push(`${extraction.failed} file(s) failed extraction.`);
  }

  if (extraction?.unsupported > 0) {
    warnings.push(`${extraction.unsupported} file(s) use unsupported extraction formats.`);
  }

  if (embeddings?.failed > 0) {
    warnings.push(`${embeddings.failed} file(s) failed embedding generation.`);
  }

  if (insights?.failed > 0) {
    warnings.push(`${insights.failed} file(s) failed insight generation.`);
  }

  return warnings;
}

export async function runKnowledgeIngestionPipeline(db, {
  limit = 1000,
  extract = true,
  embeddings = true,
  insights = true,
  useOllama = false,
  logger = console,
} = {}) {
  const result = {
    mode: 'knowledge_ingestion',
    extraction: null,
    embeddings: null,
    insights: null,
    knowledge: null,
    summary: null,
    warnings: [],
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

  result.summary = createKnowledgeSummary(result);
  result.warnings = createWarnings(result);

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

  return {
    mode: 'planning',
    suggestions,
    summary: { suggestions },
  };
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
    mode: 'local_automation_compatibility',
    suggestions: 0,
    planning: null,
  };

  if (suggestions) {
    result.planning = runPlanningPipeline(db, { limit });
    result.suggestions = result.planning.suggestions;
  }

  return result;
}
