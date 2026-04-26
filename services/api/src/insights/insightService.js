import { listExtractedFiles, upsertFileInsight } from '../db/client.js';
import { createLocalChatAnswer } from '../ai/localProvider.js';

const CLASSIFICATION_RULES = [
  { classification: 'legal', patterns: ['contract', 'agreement', 'terms', 'signed'] },
  { classification: 'financial', patterns: ['invoice', 'receipt', 'payment', 'budget', 'cost'] },
  { classification: 'project', patterns: ['project', 'milestone', 'launch', 'deliverable'] },
  { classification: 'meeting', patterns: ['meeting', 'agenda', 'minutes', 'attendees'] },
  { classification: 'technical', patterns: ['api', 'code', 'database', 'server', 'bug'] },
];

function classifyText(text) {
  const normalized = text.toLowerCase();
  return CLASSIFICATION_RULES.find((rule) => rule.patterns.some((pattern) => normalized.includes(pattern)))?.classification || 'general';
}

function extractEntities(text) {
  const peopleOrOrgs = Array.from(new Set(text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [])).slice(0, 12);
  const dates = Array.from(new Set(text.match(/\b\d{4}-\d{2}-\d{2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi) || [])).slice(0, 12);
  return { names: peopleOrOrgs, dates };
}

function deterministicSummary(file) {
  const text = (file.extracted_text || '').replace(/\s+/g, ' ').trim();
  if (!text) return `No extracted text is available for ${file.filename}.`;
  const sentence = text.match(/[^.!?]+[.!?]?/)?.[0]?.trim() || text.slice(0, 240);
  return sentence.length > 280 ? `${sentence.slice(0, 277)}...` : sentence;
}

export async function generateFileInsights(db, { fileId, limit = 25, useOllama = false } = {}) {
  const files = listExtractedFiles(db, { fileId, limit });
  const results = [];

  for (const file of files) {
    const text = `${file.filename}\n${file.extracted_text || ''}`;
    const classification = classifyText(text);
    const entities = extractEntities(text);
    let summary = deterministicSummary(file);
    let provider = 'deterministic';
    let status = 'generated';
    let errorMessage = null;

    if (useOllama) {
      const response = await createLocalChatAnswer({
        question: `Summarize this file in one concise paragraph and mention its likely category: ${file.filename}`,
        sources: [{
          filename: file.filename,
          absolute_path: file.absolute_path,
          snippet: file.extracted_text.slice(0, 1800),
        }],
      });

      provider = response.provider;
      if (response.provider_status === 'ok') {
        summary = response.answer;
      } else {
        errorMessage = response.provider_error;
      }
    }

    const insight = {
      file_id: file.id,
      summary,
      classification,
      entities_json: JSON.stringify(entities),
      provider,
      status,
      error_message: errorMessage,
      generated_at: new Date().toISOString(),
    };

    upsertFileInsight(db, insight);
    results.push({ ...insight, filename: file.filename, absolute_path: file.absolute_path, entities });
  }

  return {
    generated: results.length,
    results,
  };
}
