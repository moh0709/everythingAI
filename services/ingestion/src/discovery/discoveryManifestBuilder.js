function buildDiscoveryManifest({
  sessionId,
  source,
  files = [],
  mimeTypes = {}
} = {}) {
  return Object.freeze({
    sessionId,
    source,
    filesDiscovered: files.length,
    files,
    mimeTypes,
    discoveredAt: new Date().toISOString()
  });
}

module.exports = {
  buildDiscoveryManifest
};
