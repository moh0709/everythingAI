import crypto from 'node:crypto';

const MANIFEST_KIND = 'everythingai.enterprise-backup-manifest';
const MANIFEST_VERSION = 1;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const SECRET_KEY_RE = /(password|secret|token|databaseurl|connection(string|url)?|accesskey|secretkey|credential|authorization|privatekey|dsn)/i;

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} is required`);
  return value.trim();
}

function normalizeScope(scope) {
  if (!scope || typeof scope !== 'object') throw new Error('tenant and workspace scope are required');
  return {
    tenantId: requireString(scope.tenantId, 'tenant scope'),
    workspaceId: requireString(scope.workspaceId, 'workspace scope'),
  };
}

function assertSecretFree(value, path = 'manifest input') {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSecretFree(item, `${path}[${index}]`));
    return;
  }
  if (typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(key)) {
      throw new Error(`secret or credential field is not allowed in backup metadata: ${path}.${key}`);
    }
    assertSecretFree(nested, `${path}.${key}`);
  }
}

function assertChecksum(value, label, { optional = false } = {}) {
  if ((value === null || value === undefined || value === '') && optional) return null;
  const checksum = requireString(value, label).toLowerCase();
  if (!SHA256_RE.test(checksum)) throw new Error(`${label} must be a SHA-256 checksum`);
  return checksum;
}

function expectedStoragePrefix(scope) {
  return `tenants/${scope.tenantId}/workspaces/${scope.workspaceId}/objects/`;
}

function normalizeObject(object, scope) {
  if (!object || typeof object !== 'object') throw new Error('object backup entry is required');
  const objectId = requireString(object.objectId, 'objectId');
  if (objectId.includes('/') || objectId.includes('\\') || objectId === '.' || objectId === '..') {
    throw new Error('objectId must be opaque and path-safe');
  }
  const storageKey = requireString(object.storageKey, 'storageKey');
  const prefix = expectedStoragePrefix(scope);
  if (!storageKey.startsWith(prefix) || storageKey !== `${prefix}${objectId}` || storageKey.includes('../') || storageKey.includes('..\\')) {
    throw new Error('object storage key is outside the authorized tenant/workspace scope');
  }
  const size = Number(object.size);
  if (!Number.isSafeInteger(size) || size < 0) throw new Error('object size must be a non-negative safe integer');
  const checksumSha256 = assertChecksum(object.checksumSha256, 'object checksum', { optional: true });
  const checksumVerified = object.checksumVerified === true;
  if (checksumVerified && !checksumSha256) throw new Error('verified object checksum requires checksum evidence');
  return { objectId, storageKey, size, checksumSha256, checksumVerified };
}

function normalizePostgres(postgres) {
  if (!postgres || typeof postgres !== 'object') throw new Error('PostgreSQL backup identity is required');
  const checksumSha256 = assertChecksum(postgres.checksumSha256, 'PostgreSQL backup checksum', { optional: true });
  const checksumVerified = postgres.checksumVerified === true;
  if (checksumVerified && !checksumSha256) throw new Error('verified PostgreSQL backup checksum requires checksum evidence');
  return {
    backupId: requireString(postgres.backupId, 'PostgreSQL backupId'),
    checksumSha256,
    checksumVerified,
  };
}

function canonicalCore(input) {
  assertSecretFree(input);
  const scope = normalizeScope(input.scope);
  const schemaVersion = requireString(input.schemaVersion, 'schemaVersion');
  const createdAt = requireString(input.createdAt, 'createdAt');
  if (Number.isNaN(Date.parse(createdAt))) throw new Error('createdAt must be a valid timestamp');
  const objects = Array.isArray(input.objects)
    ? input.objects.map((object) => normalizeObject(object, scope)).sort((a, b) => a.objectId.localeCompare(b.objectId))
    : [];
  const seen = new Set();
  for (const object of objects) {
    if (seen.has(object.objectId)) throw new Error(`duplicate objectId in backup manifest: ${object.objectId}`);
    seen.add(object.objectId);
  }
  return {
    kind: MANIFEST_KIND,
    version: MANIFEST_VERSION,
    scope,
    schemaVersion,
    createdAt: new Date(createdAt).toISOString(),
    postgres: normalizePostgres(input.postgres),
    objects,
  };
}

function hashCore(core) {
  return crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex');
}

export function createEnterpriseBackupManifest(input) {
  const core = canonicalCore(input);
  return { ...core, manifestSha256: hashCore(core) };
}

function outcome(status, reason) {
  return { status, reason, destructive: false, productionRestorePerformed: false };
}

const blocked = (reason) => outcome('blocked', reason);
const notValidated = (reason) => outcome('not_validated', reason);
const failed = (reason) => outcome('failed', reason);

export async function validateEnterpriseRestoreCandidate({
  manifest,
  expectedScope,
  scopeGuard,
  supportedSchemaVersions = [],
  requireVerifiedChecksums = false,
  target,
  targetGuard,
  adapters = {},
} = {}) {
  if (!manifest || typeof manifest !== 'object') return blocked('backup manifest is required');
  try {
    assertSecretFree(manifest, 'backup manifest');
  } catch (error) {
    return blocked(error.message);
  }
  if (manifest.kind !== MANIFEST_KIND || manifest.version !== MANIFEST_VERSION) {
    return blocked('unsupported backup manifest kind or version');
  }

  let core;
  try {
    core = canonicalCore(manifest);
  } catch (error) {
    return blocked(error.message);
  }
  if (!SHA256_RE.test(String(manifest.manifestSha256 || '')) || hashCore(core) !== manifest.manifestSha256) {
    return blocked('backup manifest integrity check failed; manifest may be tampered');
  }

  let scope;
  try {
    scope = normalizeScope(expectedScope);
  } catch (error) {
    return blocked(error.message);
  }
  if (core.scope.tenantId !== scope.tenantId || core.scope.workspaceId !== scope.workspaceId) {
    return blocked('backup tenant/workspace scope does not match the authorized restore scope');
  }
  if (typeof scopeGuard !== 'function') return blocked('trusted restore scope guard is required');
  try {
    if (await scopeGuard(scope) !== true) return blocked('restore scope is not authorized by the trusted scope guard');
  } catch {
    return blocked('restore scope authorization failed closed');
  }

  if (!target || target.isolated !== true || target.disposable !== true || !target.id) {
    return blocked('restore validation requires an explicitly isolated disposable target');
  }
  if (typeof targetGuard !== 'function') return blocked('trusted restore target guard is required');
  try {
    if (await targetGuard(target) !== true) return blocked('restore target is not authorized by the trusted target guard');
  } catch {
    return blocked('restore target authorization failed closed');
  }

  if (!Array.isArray(supportedSchemaVersions) || !supportedSchemaVersions.includes(core.schemaVersion)) {
    return blocked('backup schema/migration version is not supported for restore validation');
  }
  if (requireVerifiedChecksums) {
    if (!core.postgres.checksumVerified) return blocked('PostgreSQL backup checksum is unverified');
    if (core.objects.some((object) => !object.checksumVerified)) return blocked('one or more object checksums are unverified');
  }
  if (typeof adapters.postgres !== 'function' || typeof adapters.object !== 'function') {
    return notValidated('isolated restore adapters are required before recoverability can be validated');
  }

  try {
    const postgresResult = await adapters.postgres({
      backup: core.postgres,
      scope: core.scope,
      schemaVersion: core.schemaVersion,
      target,
      dryRun: true,
    });
    if (!postgresResult || postgresResult.ok !== true) return failed('isolated PostgreSQL restore validation failed');
    for (const object of core.objects) {
      const objectResult = await adapters.object({ object, scope: core.scope, target, dryRun: true });
      if (!objectResult || objectResult.ok !== true) {
        return failed(`isolated object restore validation failed for ${object.objectId}`);
      }
    }
  } catch (error) {
    return failed(`isolated restore validation failed: ${error instanceof Error ? error.message : 'unknown adapter error'}`);
  }

  return {
    status: 'validated',
    reason: null,
    destructive: false,
    productionRestorePerformed: false,
    targetId: String(target.id),
    scope: core.scope,
    schemaVersion: core.schemaVersion,
    objectCount: core.objects.length,
  };
}
