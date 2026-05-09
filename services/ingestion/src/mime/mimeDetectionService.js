const path = require('path');

const MIME_MAP = Object.freeze({
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
  '.json': 'application/json',
  '.xml': 'application/xml'
});

function detectMime(filePath = '') {
  const extension = path.extname(filePath).toLowerCase();

  return MIME_MAP[extension] || 'application/octet-stream';
}

function verifyMime(filePath = '', expectedMime = '') {
  return detectMime(filePath) === expectedMime;
}

function detectEncoding() {
  return 'utf-8';
}

function detectContainerFormat(filePath = '') {
  const extension = path.extname(filePath).toLowerCase();

  return {
    extension,
    mime: detectMime(filePath)
  };
}

module.exports = {
  detectMime,
  verifyMime,
  detectEncoding,
  detectContainerFormat,
  MIME_MAP
};
