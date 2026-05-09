const { detectMime } = require('../mime/mimeDetectionService');
const {
  generateBinaryFingerprint
} = require('../fingerprinting/fingerprintService');
const {
  routeExtractor
} = require('./extractorRoutingService');

function orchestrateIngestion({ filePath = '', content = '' } = {}) {
  const mimeType = detectMime(filePath);
  const fingerprint = generateBinaryFingerprint(content);
  const routing = routeExtractor({ filePath });

  return Object.freeze({
    filePath,
    mimeType,
    fingerprint,
    routing,
    orchestratedAt: new Date().toISOString()
  });
}

module.exports = {
  orchestrateIngestion
};
