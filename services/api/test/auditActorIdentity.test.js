import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {
  insertAuditLog,
  listAuditLog,
  openDatabase,
} from '../src/db/client.js';

function tempDbPath() {
  return path.join(os.tmpdir(), `everythingai-audit-actor-${Date.now()}-${Math.random()}.sqlite`);
}

function event(overrides = {}) {
  return {
    id: `audit-${Date.now()}-${Math.random()}`,
    event_type: 'test.event',
    entity_type: 'test_entity',
    entity_id: 'entity-1',
    payload_json: JSON.stringify({ safe: true }),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

test('persists explicit actor and request identity with an audit event', () => {
  const db = openDatabase(tempDbPath());

  insertAuditLog(db, event({
    audit_context: {
      actor: {
        type: 'user',
        id: 'user-123',
        email: 'operator@example.com',
      },
      request: {
        id: 'request-456',
        source: 'client-ui',
      },
    },
  }));

  const [persisted] = listAuditLog(db, { entityType: 'test_entity', entityId: 'entity-1' });

  assert.equal(persisted.actor_type, 'user');
  assert.equal(persisted.actor_id, 'user-123');
  assert.equal(persisted.actor_email, 'operator@example.com');
  assert.equal(persisted.request_id, 'request-456');
  assert.equal(persisted.request_source, 'client-ui');
  assert.deepEqual(persisted.payload, { safe: true });

  db.close();
});

test('uses truthful system defaults when no request context exists', () => {
  const db = openDatabase(tempDbPath());

  insertAuditLog(db, event());
  const [persisted] = listAuditLog(db, { entityType: 'test_entity', entityId: 'entity-1' });

  assert.equal(persisted.actor_type, 'system');
  assert.equal(persisted.actor_id, null);
  assert.equal(persisted.actor_email, null);
  assert.equal(persisted.request_id, null);
  assert.equal(persisted.request_source, 'internal');

  db.close();
});
