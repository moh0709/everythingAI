export function insertActionExecution(db, execution) {
  db.prepare(`
    INSERT INTO action_executions (
      id,
      preview_id,
      file_id,
      action_type,
      status,
      source_path,
      target_path,
      undo_source_path,
      undo_target_path,
      error_message,
      executed_at,
      undone_at
    )
    VALUES (
      @id,
      @preview_id,
      @file_id,
      @action_type,
      @status,
      @source_path,
      @target_path,
      @undo_source_path,
      @undo_target_path,
      @error_message,
      @executed_at,
      @undone_at
    )
  `).run(execution);
}

export function getActionExecutionById(db, executionId) {
  return db.prepare(`
    SELECT *
    FROM action_executions
    WHERE id = ?
  `).get(executionId);
}

export function listActionExecutions(db, { fileId, limit = 100 } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('e.file_id = @fileId');
    params.fileId = fileId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT
      e.*,
      f.filename,
      f.absolute_path
    FROM action_executions e
    LEFT JOIN indexed_files f ON f.id = e.file_id
    ${where}
    ORDER BY e.executed_at DESC
    LIMIT @limit
  `).all(params);
}

export function markActionExecutionUndone(db, executionId) {
  db.prepare(`
    UPDATE action_executions
    SET status = 'undone', undone_at = @undoneAt
    WHERE id = @executionId
  `).run({
    executionId,
    undoneAt: new Date().toISOString(),
  });
}
