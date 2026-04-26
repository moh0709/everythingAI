import { listFileInsights } from '../db/client.js';

export function buildKnowledgeIndex(db, { limit = 500 } = {}) {
  const insights = listFileInsights(db, { limit });
  const entities = new Map();
  const classifications = new Map();

  for (const insight of insights) {
    const parsedEntities = JSON.parse(insight.entities_json || '{}');
    const names = parsedEntities.names || [];

    if (!classifications.has(insight.classification)) {
      classifications.set(insight.classification, []);
    }
    classifications.get(insight.classification).push({
      fileId: insight.file_id,
      filename: insight.filename,
      absolutePath: insight.absolute_path,
      summary: insight.summary,
    });

    for (const name of names) {
      if (!entities.has(name)) {
        entities.set(name, []);
      }
      entities.get(name).push({
        fileId: insight.file_id,
        filename: insight.filename,
        absolutePath: insight.absolute_path,
        classification: insight.classification,
      });
    }
  }

  return {
    entity_count: entities.size,
    classification_count: classifications.size,
    entities: Array.from(entities.entries()).map(([name, files]) => ({ name, files })),
    classifications: Array.from(classifications.entries()).map(([name, files]) => ({ name, files })),
  };
}
