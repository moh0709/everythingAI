export function insertActionPreview(db, preview) {
  db.prepare(`
    INSERT INTO action_previews (
      id,
      suggestion_id,
      file_id,
      action_type,
      source_path,
      target_path,
      current_value,
      suggested_value,
      risk_level,
      requires_approval,
      can_execute,
      blocked_reason,
      preview_status,
      created_at
    )
    VALUES (
      @id,
      @suggestion_id,
      @file_id,
      @action_type,
      @source_path,
      @target_path,
      @current_value,
      @suggested_value,
      @risk_level,
      @requires_approval,
      @can_execute,
      @blocked_reason,
      @preview_status,
      @created_at
    )
  `).run(preview);
}

export function listActionPreviews(db, { fileId, suggestionId, limit = 50 } = {}) {
  const clauses = [];
  const params = { limit };

  if (fileId) {
    clauses.push('file_id = @fileId');
    params.fileId = fileId;
  }

  if (suggestionId) {
    clauses.push('suggestion_id = @suggestionId');
    params.suggestionId = suggestionId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM action_previews
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params);
}

export function listExecutableActionPreviews(db, { limit = 100 } = {}) {
  return db.prepare(`
    SELECT *
    FROM action_previews
    WHERE can_execute = 1
      AND preview_status = 'approved'
    ORDER BY created_at DESC
    LIMIT @limit
  `).all({ limit });
}

export function listPotentiallyStaleActionPreviews(db, { limit = 100 } = {}) {
  return db.prepare(`
    SELECT
      p.*,
      f.modified_at AS current_file_modified_at
    FROM action_previews p
    JOIN indexed_files f ON f.id = p.file_id
    WHERE p.preview_status = 'approved'
      AND f.modified_at > p.created_at
    ORDER BY f.modified_at DESC
    LIMIT @limit
  `).all({ limit });
}

export function getActionPreviewById(db, previewId) {
  return db.prepare(`
    SELECT
      p.*,
      f.filename,
      f.absolute_path,
      f.relative_path,
      f.extension
    FROM action_previews p
    JOIN indexed_files f ON f.id = p.file_id
    WHERE p.id = ?
  `).get(previewId);
}

export function updateActionPreviewExecutability(db, { previewId, canExecute }) {
  db.prepare(`
    UPDATE action_previews
    SET can_execute = @canExecute
    WHERE id = @previewId
  `).run({ previewId, canExecute });
}

export function updateActionPreviewValidation(db, {
  previewId,
  canExecute,
  blockedReason,
  previewStatus,
}) {
  db.prepare(`
    UPDATE action_previews
    SET
      can_execute = @canExecute,
      blocked_reason = @blockedReason,
      preview_status = @previewStatus
    WHERE id = @previewId
  `).run({
    previewId,
    canExecute,
    blockedReason,
    previewStatus,
  });
}

export function markActionPreviewStale(db, previewId) {
  db.prepare(`
    UPDATE action_previews
    SET
      can_execute = 0,
      blocked_reason = 'preview_stale',
      preview_status = 'stale'
    WHERE id = @previewId
  `).run({ previewId });
}

export function invalidateSiblingPreviewsByFileId(db, { fileId, excludePreviewId }) {
  db.prepare(`
    UPDATE action_previews
    SET
      can_execute = 0,
      blocked_reason = 'source_relocated',
      preview_status = 'blocked'
    WHERE file_id = @fileId
      AND id != @excludePreviewId
      AND can_execute = 1
      AND action_type IN ('move', 'rename')
  `).run({ fileId, excludePreviewId });
}
