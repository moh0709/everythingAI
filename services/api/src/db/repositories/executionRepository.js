export function insertActionExecution(db, execution) {
  db.prepare(`
    INSERT INTO action_executions (
      id,
      execution_batch_id,
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
      @execution_batch_id,
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
  `).run({
    execution_batch_id: null,
    ...execution,
  });
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

export function insertExecutionBatch(db, batch) {
  db.prepare(`
    INSERT INTO execution_batches (
      id,
      planning_session_id,
      status,
      summary_json,
      error_message,
      created_at,
      updated_at,
      approved_at,
      started_at,
      completed_at
    )
    VALUES (
      @id,
      @planning_session_id,
      @status,
      @summary_json,
      @error_message,
      @created_at,
      @updated_at,
      @approved_at,
      @started_at,
      @completed_at
    )
  `).run(batch);
}

export function updateExecutionBatch(db, batch) {
  db.prepare(`
    UPDATE execution_batches
    SET
      planning_session_id = @planning_session_id,
      status = @status,
      summary_json = @summary_json,
      error_message = @error_message,
      updated_at = @updated_at,
      approved_at = @approved_at,
      started_at = @started_at,
      completed_at = @completed_at
    WHERE id = @id
  `).run(batch);
}

export function getExecutionBatchById(db, batchId) {
  const row = db.prepare(`
    SELECT *
    FROM execution_batches
    WHERE id = ?
  `).get(batchId);

  if (!row) {
    return null;
  }

  return {
    ...row,
    summary: JSON.parse(row.summary_json),
  };
}

export function listExecutionBatches(db, { limit = 100, status, planningSessionId } = {}) {
  const clauses = [];
  const params = { limit };

  if (status) {
    clauses.push('status = @status');
    params.status = status;
  }

  if (planningSessionId) {
    clauses.push('planning_session_id = @planningSessionId');
    params.planningSessionId = planningSessionId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM execution_batches
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params).map((row) => ({
    ...row,
    summary: JSON.parse(row.summary_json),
  }));
}

export function assignExecutionToBatch(db, { executionId, executionBatchId }) {
  db.prepare(`
    UPDATE action_executions
    SET execution_batch_id = @executionBatchId
    WHERE id = @executionId
  `).run({ executionId, executionBatchId });
}

export function listExecutionsForBatch(db, batchId) {
  return db.prepare(`
    SELECT
      e.*,
      f.filename,
      f.absolute_path
    FROM action_executions e
    LEFT JOIN indexed_files f ON f.id = e.file_id
    WHERE e.execution_batch_id = ?
    ORDER BY e.executed_at DESC
  `).all(batchId);
}
