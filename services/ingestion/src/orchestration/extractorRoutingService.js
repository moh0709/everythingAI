const { detectMime } = require('../mime/mimeDetectionService');

function routeExtractor({ filePath = '' } = {}) {
  const mimeType = detectMime(filePath);

  return Object.freeze({
    mimeType,
    extractor:
      mimeType.startsWith('image/') ? 'imageExtractor'
      : mimeType.startsWith('audio/') ? 'audioExtractor'
      : mimeType.startsWith('video/') ? 'videoExtractor'
      : mimeType === 'application/pdf' ? 'pdfExtractor'
      : mimeType.includes('spreadsheet') ? 'xlsxExtractor'
      : 'genericExtractor'
  });
}

module.exports = {
  routeExtractor
};
