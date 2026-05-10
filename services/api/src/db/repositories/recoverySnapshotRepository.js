export function insertRecoverySnapshot(db, snapshot) {
  db.prepare(`
    INSERT INTO recovery_snapshots (
      id,
      file_id,
      preview_id,
      execution_id,
      snapshot_type,
      status,
      source_path,
      target_path,
      metadata_json,
      created_at,
      used_at,
      error_message
    )
    VALUES (
      @id,
      @file_id,
      @preview_id,
      @execution_id,
      @snapshot_type,
      @status,
      @source_path,
      @target_path,
      @metadata_json,
      @created_at,
      @used_at,
      @error_message
    )
  `).run(snapshot);
}

export function getRecoverySnapshotById(db, snapshotId) {
  const row = db.prepare(`
    SELECT *
    FROM recovery_snapshots
    WHERE id = ?
  `).get(snapshotId);

  if (!row) return null;

  return {
    ...row,
    metadata: JSON.parse(row.metadata_json),
  };
}

export function listRecoverySnapshots(db, { fileId, previewId, executionId, status, limit = 100 } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('file_id = @fileId');
    params.fileId = fileId;
  }

  if (previewId) {
    clauses.push('preview_id = @previewId');
    params.previewId = previewId;
  }

  if (executionId) {
    clauses.push('execution_id = @executionId');
    params.executionId = executionId;
  }

  if (status) {
    clauses.push('status = @status');
    params.status = status;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM recovery_snapshots
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params).map((row) => ({
    ...row,
    metadata: JSON.parse(row.metadata_json),
  }));
}

export function markRecoverySnapshotUsed(db, { snapshotId, executionId, usedAt = new Date().toISOString() }) {
  db.prepare(`
    UPDATE recovery_snapshots
    SET
      status = 'used',
      execution_id = COALESCE(@executionId, execution_id),
      used_at = @usedAt,
      error_message = NULL
    WHERE id = @snapshotId
  `).run({ snapshotId, executionId: executionId || null, usedAt });
}

export function markRecoverySnapshotFailed(db, { snapshotId, errorMessage }) {
  db.prepare(`
    UPDATE recovery_snapshots
    SET
      status = 'failed',
      error_message = @errorMessage
    WHERE id = @snapshotId
  `).run({ snapshotId, errorMessage });
}
