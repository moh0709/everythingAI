export function createIdentityMetadataModel({
  metadataId,
  operatorId,
  source = 'governance',
  traceContext = {},
  createdAt = new Date().toISOString()
}) {
  return Object.freeze({
    metadataId,
    operatorId,
    source,
    traceContext,
    createdAt
  });
}
