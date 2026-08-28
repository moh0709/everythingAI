const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

function isEnabled(value) {
  return TRUE_VALUES.has(String(value ?? '').trim().toLowerCase());
}

function present(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function redactRuntimeConfig(config) {
  return Object.freeze({
    mode: config.mode,
    enterpriseEnabled: config.enterpriseEnabled,
    postgresConfigured: config.postgresConfigured,
    identityConfigured: config.identityConfigured,
    objectStorageConfigured: config.objectStorageConfigured,
  });
}

export function resolveEnterpriseRuntimeConfig(env = process.env) {
  const enterpriseEnabled = isEnabled(env.EVERYTHINGAI_ENTERPRISE_MODE);

  if (!enterpriseEnabled) {
    return Object.freeze({
      mode: 'local',
      enterpriseEnabled: false,
      postgresConfigured: false,
      identityConfigured: false,
      objectStorageConfigured: false,
      safeSummary: Object.freeze({
        mode: 'local',
        enterpriseEnabled: false,
        postgresConfigured: false,
        identityConfigured: false,
        objectStorageConfigured: false,
      }),
    });
  }

  const required = {
    DATABASE_URL: env.DATABASE_URL,
    OIDC_ISSUER: env.OIDC_ISSUER,
    OIDC_CLIENT_ID: env.OIDC_CLIENT_ID,
    S3_ENDPOINT: env.S3_ENDPOINT,
    S3_BUCKET: env.S3_BUCKET,
    S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !present(value))
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Enterprise configuration incomplete: missing ${missing.join(', ')}`);
  }

  const config = {
    mode: 'enterprise',
    enterpriseEnabled: true,
    postgresConfigured: true,
    identityConfigured: true,
    objectStorageConfigured: true,
    postgres: Object.freeze({ connectionString: required.DATABASE_URL }),
    identity: Object.freeze({ issuer: required.OIDC_ISSUER, clientId: required.OIDC_CLIENT_ID }),
    objectStorage: Object.freeze({
      endpoint: required.S3_ENDPOINT,
      bucket: required.S3_BUCKET,
      region: present(env.S3_REGION) ? env.S3_REGION : null,
      accessKeyId: required.S3_ACCESS_KEY_ID,
      secretAccessKey: required.S3_SECRET_ACCESS_KEY,
    }),
  };

  return Object.freeze({ ...config, safeSummary: redactRuntimeConfig(config) });
}

async function runCheck(check) {
  if (typeof check !== 'function') return 'not_ready';
  try {
    return (await check()) === true ? 'ready' : 'not_ready';
  } catch {
    return 'not_ready';
  }
}

export function createEnterpriseHealthReporter({ config, checks = {} } = {}) {
  if (!config) throw new Error('Runtime health reporter requires resolved configuration.');

  return Object.freeze({
    liveness() {
      return {
        status: 'alive',
        service: 'everythingai-api',
        mode: config.mode,
      };
    },

    async readiness() {
      if (!config.enterpriseEnabled) {
        return {
          status: 'ready',
          service: 'everythingai-api',
          mode: 'local',
          dependencies: {},
        };
      }

      const dependencies = {
        postgres: await runCheck(checks.postgres),
        identity: await runCheck(checks.identity),
        objectStorage: await runCheck(checks.objectStorage),
      };
      const ready = Object.values(dependencies).every((status) => status === 'ready');

      return {
        status: ready ? 'ready' : 'not_ready',
        service: 'everythingai-api',
        mode: 'enterprise',
        dependencies,
      };
    },
  });
}
