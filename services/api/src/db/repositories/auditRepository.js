export function insertAuditLog(db, event) {
  db.prepare(`
    INSERT INTO audit_log (
      id,
      event_type,
      entity_type,
      entity_id,
      payload_json,
      created_at
    )
    VALUES (
      @id,
      @event_type,
      @entity_type,
      @entity_id,
      @payload_json,
      @created_at
    )
  `).run(event);
}

export function listAuditLog(db, { entityType, entityId, limit = 100 } = {}) {
  const clauses = [];
  const params = { limit };

  if (entityType) {
    clauses.push('entity_type = @entityType');
    params.entityType = entityType;
  }

  if (entityId) {
    clauses.push('entity_id = @entityId');
    params.entityId = entityId;
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return db.prepare(`
    SELECT *
    FROM audit_log
    ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params).map((event) => ({
    ...event,
    payload: JSON.parse(event.payload_json),
  }));
}
