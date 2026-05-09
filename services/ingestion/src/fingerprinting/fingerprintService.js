const crypto = require('crypto');

function generateBinaryFingerprint(content = '') {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function generateSemanticFingerprint(content = '') {
  return crypto.createHash('md5').update(content.toLowerCase()).digest('hex');
}

function generateStructuralFingerprint(metadata = {}) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(metadata))
    .digest('hex');
}

module.exports = {
  generateBinaryFingerprint,
  generateSemanticFingerprint,
  generateStructuralFingerprint
};
