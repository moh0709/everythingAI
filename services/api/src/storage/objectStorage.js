import fs from 'node:fs/promises';
import path from 'node:path';

const SAFE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function requireSafeIdentifier(value, label) {
  if (typeof value !== 'string' || !SAFE_IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function normalizeScope(scope) {
  if (!scope || typeof scope !== 'object') {
    throw new Error('Tenant and workspace scope are required');
  }

  const tenantId = typeof scope.tenantId === 'string' ? scope.tenantId.trim() : '';
  const workspaceId = typeof scope.workspaceId === 'string' ? scope.workspaceId.trim() : '';
  if (!tenantId || !workspaceId) {
    throw new Error('Tenant and workspace scope are required');
  }

  requireSafeIdentifier(tenantId, 'tenant identifier');
  requireSafeIdentifier(workspaceId, 'workspace identifier');
  return { tenantId, workspaceId };
}

function normalizeObjectId(objectId) {
  try {
    return requireSafeIdentifier(typeof objectId === 'string' ? objectId.trim() : '', 'object identifier');
  } catch {
    throw new Error('Invalid object identifier');
  }
}

export function buildScopedObjectKey(scope, objectId) {
  const { tenantId, workspaceId } = normalizeScope(scope);
  const safeObjectId = normalizeObjectId(objectId);
  return `tenants/${tenantId}/workspaces/${workspaceId}/objects/${safeObjectId}`;
}

function toBuffer(body) {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body === 'string') return Buffer.from(body);
  throw new TypeError('Object body must be a Buffer, Uint8Array, or string');
}

function isNotFoundError(error) {
  return error?.code === 'ENOENT'
    || error?.code === 'NotFound'
    || error?.code === 'NoSuchKey'
    || error?.name === 'NotFound'
    || error?.$metadata?.httpStatusCode === 404
    || error?.statusCode === 404;
}

function scopedLocalPath(rootDir, key) {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(root, ...key.split('/'));
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Object key resolved outside storage root');
  }
  return candidate;
}

export function createLocalObjectStorageAdapter({ rootDir } = {}) {
  if (typeof rootDir !== 'string' || rootDir.trim().length === 0) {
    throw new Error('Local object storage rootDir is required');
  }

  const normalizedRoot = path.resolve(rootDir);

  return {
    adapterType: 'local-object-storage',
    async putObject({ scope, objectId, body, contentType = null } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      const filePath = scopedLocalPath(normalizedRoot, key);
      const bytes = toBuffer(body);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, bytes, { flag: 'w' });
      return { key, size: bytes.length, contentType };
    },
    async getObject({ scope, objectId } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      const filePath = scopedLocalPath(normalizedRoot, key);
      try {
        const body = await fs.readFile(filePath);
        return { found: true, key, body, size: body.length, contentType: null };
      } catch (error) {
        if (isNotFoundError(error)) return { found: false, key };
        throw error;
      }
    },
    async headObject({ scope, objectId } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      const filePath = scopedLocalPath(normalizedRoot, key);
      try {
        const stat = await fs.stat(filePath);
        return { found: true, key, size: stat.size, contentType: null, modifiedAt: stat.mtime };
      } catch (error) {
        if (isNotFoundError(error)) return { found: false, key };
        throw error;
      }
    },
    async deleteObject({ scope, objectId } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      const filePath = scopedLocalPath(normalizedRoot, key);
      try {
        await fs.unlink(filePath);
        return { deleted: true, key };
      } catch (error) {
        if (isNotFoundError(error)) return { deleted: false, key };
        throw error;
      }
    },
  };
}

function requireClientMethod(client, methodName) {
  if (!client || typeof client[methodName] !== 'function') {
    throw new Error(`S3-compatible client method ${methodName} is required`);
  }
  return client[methodName].bind(client);
}

export function createS3CompatibleObjectStorageAdapter(options = {}) {
  const { client } = options;
  const bucket = typeof options.bucket === 'string' ? options.bucket.trim() : '';
  if (!bucket) throw new Error('S3-compatible object storage bucket is required');

  // Endpoint, region and credential fields are intentionally accepted only as
  // configuration-boundary inputs. They are not retained, serialized, logged,
  // or forwarded with individual object operations; client construction belongs
  // to the deployment/configuration layer.
  const put = requireClientMethod(client, 'putObject');
  const get = requireClientMethod(client, 'getObject');
  const head = requireClientMethod(client, 'headObject');
  const remove = requireClientMethod(client, 'deleteObject');

  return {
    adapterType: 's3-compatible-object-storage',
    async putObject({ scope, objectId, body, contentType = null } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      const bytes = toBuffer(body);
      const result = await put({ bucket, key, body: bytes, contentType });
      return {
        key,
        size: bytes.length,
        contentType,
        etag: result?.etag ?? result?.ETag ?? null,
      };
    },
    async getObject({ scope, objectId } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      try {
        const result = await get({ bucket, key });
        const body = toBuffer(result?.body ?? result?.Body ?? Buffer.alloc(0));
        return {
          found: true,
          key,
          body,
          size: result?.contentLength ?? result?.ContentLength ?? body.length,
          contentType: result?.contentType ?? result?.ContentType ?? null,
          etag: result?.etag ?? result?.ETag ?? null,
        };
      } catch (error) {
        if (isNotFoundError(error)) return { found: false, key };
        throw error;
      }
    },
    async headObject({ scope, objectId } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      try {
        const result = await head({ bucket, key });
        return {
          found: true,
          key,
          size: result?.contentLength ?? result?.ContentLength ?? null,
          contentType: result?.contentType ?? result?.ContentType ?? null,
          etag: result?.etag ?? result?.ETag ?? null,
        };
      } catch (error) {
        if (isNotFoundError(error)) return { found: false, key };
        throw error;
      }
    },
    async deleteObject({ scope, objectId } = {}) {
      const key = buildScopedObjectKey(scope, objectId);
      try {
        await remove({ bucket, key });
        return { deleted: true, key };
      } catch (error) {
        if (isNotFoundError(error)) return { deleted: false, key };
        throw error;
      }
    },
  };
}
