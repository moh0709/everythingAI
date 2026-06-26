import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveRequestContext, requestContextHeaders } from '../src/middleware/requestContext.js';
import { attachWorkspaceContext, deriveWorkspaceContext } from '../src/middleware/workspaceContext.js';

test('workspace context scaffolding consumes requestContext and remains read-only', () => {
  const req = {
    headers: {
      [requestContextHeaders.actorType]: 'user',
      [requestContextHeaders.tenantId]: 'tenant-123',
      [requestContextHeaders.workspaceSlug]: 'client-ops',
    },
  };

  req.requestContext = deriveRequestContext(req);
  const workspaceContext = deriveWorkspaceContext(req);

  assert.equal(workspaceContext.readOnly, true);
  assert.equal(workspaceContext.requestContext, req.requestContext);
  assert.deepEqual(workspaceContext.tenant, {
    id: 'tenant-123',
    slug: null,
  });
  assert.deepEqual(workspaceContext.workspace, {
    id: null,
    slug: 'client-ops',
  });
  assert.deepEqual(workspaceContext.resolution, {
    mode: 'request-context',
    status: 'scoped',
    tenant: 'present',
    workspace: 'present',
  });
});

test('attachWorkspaceContext stores the derived workspace context on the request', () => {
  const req = {
    headers: {
      [requestContextHeaders.actorType]: 'service_principal',
    },
  };

  attachWorkspaceContext(req, {}, () => {});

  assert.ok(req.workspaceContext);
  assert.equal(req.workspaceContext.readOnly, true);
  assert.equal(req.workspaceContext.resolution.status, 'unresolved');
  assert.equal(req.workspaceContext.requestContext.actor.type, 'service_principal');
});
