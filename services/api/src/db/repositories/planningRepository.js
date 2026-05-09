export function insertPlanningSession(db, session) {
  db.prepare(`
    INSERT INTO planning_sessions (
      id,
      status,
      mode,
      source_json,
      settings_json,
      summary_json,
      error_message,
      created_at,
      updated_at,
      completed_at
    )
    VALUES (
      @id,
      @status,
      @mode,
      @source_json,
      @settings_json,
      @summary_json,
      @error_message,
      @created_at,
      @updated_at,
      @completed_at
    )
  `).run(session);
}

export function updatePlanningSession(db, session) {
  db.prepare(`
    UPDATE planning_sessions
    SET
      status = @status,
      mode = @mode,
      source_json = @source_json,
      settings_json = @settings_json,
      summary_json = @summary_json,
      error_message = @error_message,
      updated_at = @updated_at,
      completed_at = @completed_at
    WHERE id = @id
  `).run(session);
}

export function getPlanningSessionById(db, sessionId) {
  const row = db.prepare(`
    SELECT *
    FROM planning_sessions
    WHERE id = ?
  `).get(sessionId);

  if (!row) return null;

  return {
    ...row,
    source: JSON.parse(row.source_json),
    settings: JSON.parse(row.settings_json),
    summary: JSON.parse(row.summary_json),
  };
}

export function listPlanningSessions(db, { limit = 100, status } = {}) {
  const clauses = [];
  const params = { limit };

  if (status) {
    clauses.push('status = @status');
    params.status = status;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM planning_sessions
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params).map((row) => ({
    ...row,
    source: JSON.parse(row.source_json),
    settings: JSON.parse(row.settings_json),
    summary: JSON.parse(row.summary_json),
  }));
}
