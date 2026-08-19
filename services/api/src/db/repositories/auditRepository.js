export function insertAuditLog(db, event) {
  const auditContext = event.audit_context ?? {};
  const record = {
    ...event,
    actor_type: auditContext.actor?.type || 'system',
    actor_id: auditContext.actor?.id || null,
    actor_email: auditContext.actor?.email || null,
    request_id: auditContext.request?.id || null,
    request_source: auditContext.request?.source || 'internal',
  };

  db.prepare(`
    INSERT INTO audit_log (
      id,
      event_type,
      entity_type,
      entity_id,
      payload_json,
      actor_type,
      actor_id,
      actor_email,
      request_id,
      request_source,
      created_at
    )
    VALUES (
      @id,
      @event_type,
      @entity_type,
      @entity_id,
      @payload_json,
      @actor_type,
      @actor_id,
      @actor_email,
      @request_id,
      @request_source,
      @created_at
    )
  `).run(record);
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
