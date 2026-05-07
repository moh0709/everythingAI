export const JOB_TYPES = Object.freeze({
  KNOWLEDGE_INGESTION_PIPELINE: 'KNOWLEDGE_INGESTION_PIPELINE',
  WATCHER_CYCLE: 'WATCHER_CYCLE',
  INDEX_SOURCE: 'INDEX_SOURCE',
  EXTRACT_FILES: 'EXTRACT_FILES',
  GENERATE_EMBEDDINGS: 'GENERATE_EMBEDDINGS',
  GENERATE_INSIGHTS: 'GENERATE_INSIGHTS',
  BUILD_KNOWLEDGE: 'BUILD_KNOWLEDGE',
});

export const JOB_STATUSES = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const JOB_PRIORITIES = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export function isKnownJobType(type) {
  return Object.values(JOB_TYPES).includes(type);
}

export function isKnownJobStatus(status) {
  return Object.values(JOB_STATUSES).includes(status);
}
