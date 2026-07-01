import { createWorkspaceContextMiddleware } from '../../middleware/workspaceContext.js';
import { createProductionIdentityRepository } from './identityRepository.js';

function hasExplicitProductionResolutionInput(options = {}) {
  return Boolean(
    options.identityRepository
    || options.adapter
    || options.adapterFactory
    || options.productionAdapterFactory
    || options.postgresAdapter
    || options.postgresAdapterFactory
    || options.postgresQuery
    || options.postgresClient
    || options.pool
    || Array.isArray(options.tenants)
    || Array.isArray(options.workspaces),
  );
}

function createIdentityRepositoryFromOptions(options = {}) {
  if (options.identityRepository) {
    return options.identityRepository;
  }

  return createProductionIdentityRepository({
    productionMode: true,
    adapter: options.adapter,
    adapterFactory: options.adapterFactory,
    productionAdapterFactory: options.productionAdapterFactory,
    postgresAdapter: options.postgresAdapter,
    postgresAdapterFactory: options.postgresAdapterFactory,
    postgresQuery: options.postgresQuery,
    postgresClient: options.postgresClient,
    pool: options.pool,
    tenants: options.tenants,
    workspaces: options.workspaces,
  });
}

export function createProductionWorkspaceContextMiddleware(options = {}) {
  if (options.productionMode !== true || !hasExplicitProductionResolutionInput(options)) {
    return null;
  }

  const identityRepository = createIdentityRepositoryFromOptions(options);

  return createWorkspaceContextMiddleware({
    productionResolution: true,
    identityRepository,
  });
}
