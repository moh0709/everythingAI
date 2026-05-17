export function ensureWikiJobSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wiki_rebuild_jobs (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      stage TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wiki_rebuild_jobs_status
      ON wiki_rebuild_jobs(status);

    CREATE INDEX IF NOT EXISTS idx_wiki_rebuild_jobs_created
      ON wiki_rebuild_jobs(created_at DESC);
  `);
}

function safeJson(value) {
  return JSON.stringify(value ?? {});
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createWikiJob(db, job) {
  ensureWikiJobSchema(db);

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO wiki_rebuild_jobs (
      id,
      job_type,
      status,
      progress_percent,
      stage,
      metadata_json,
      created_at,
      started_at,
      completed_at,
      updated_at
    ) VALUES (
      @id,
      @job_type,
      @status,
      @progress_percent,
      @stage,
      @metadata_json,
      @created_at,
      @started_at,
      @completed_at,
      @updated_at
    )
  `).run({
    id: job.id,
    job_type: job.job_type || 'wiki-rebuild',
    status: job.status || 'queued',
    progress_percent: job.progress_percent || 0,
    stage: job.stage || 'queued',
    metadata_json: safeJson(job.metadata),
    created_at: now,
    started_at: job.started_at || null,
    completed_at: job.completed_at || null,
    updated_at: now,
  });

  return getWikiJob(db, job.id);
}

export function updateWikiJob(db, jobId, updates = {}) {
  ensureWikiJobSchema(db);

  const existing = getWikiJob(db, jobId);

  if (!existing) return null;

  db.prepare(`
    UPDATE wiki_rebuild_jobs
    SET
      status = @status,
      progress_percent = @progress_percent,
      stage = @stage,
      metadata_json = @metadata_json,
      started_at = @started_at,
      completed_at = @completed_at,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: jobId,
    status: updates.status || existing.status,
    progress_percent:
      updates.progress_percent ?? existing.progress_percent,
    stage: updates.stage || existing.stage,
    metadata_json: safeJson(updates.metadata || existing.metadata),
    started_at: updates.started_at || existing.started_at,
    completed_at: updates.completed_at || existing.completed_at,
    updated_at: new Date().toISOString(),
  });

  return getWikiJob(db, jobId);
}

export function clearCompletedWikiJobs(db) {
  ensureWikiJobSchema(db);

  const result = db.prepare(`
    DELETE FROM wiki_rebuild_jobs
    WHERE status IN ('completed', 'failed')
  `).run();

  return result.changes || 0;
}

export function getWikiJob(db, jobId) {
  ensureWikiJobSchema(db);

  const row = db.prepare(`
    SELECT *
    FROM wiki_rebuild_jobs
    WHERE id = ?
  `).get(jobId);

  if (!row) return null;

  return {
    id: row.id,
    job_type: row.job_type,
    status: row.status,
    progress_percent: row.progress_percent,
    stage: row.stage,
    metadata: parseJson(row.metadata_json),
    created_at: row.created_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    updated_at: row.updated_at,
  };
}

export function listWikiJobs(db, limit = 25) {
  ensureWikiJobSchema(db);

  const rows = db.prepare(`
    SELECT *
    FROM wiki_rebuild_jobs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  return rows.map((row) => ({
    id: row.id,
    job_type: row.job_type,
    status: row.status,
    progress_percent: row.progress_percent,
    stage: row.stage,
    metadata: parseJson(row.metadata_json),
    created_at: row.created_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    updated_at: row.updated_at,
  }));
}
