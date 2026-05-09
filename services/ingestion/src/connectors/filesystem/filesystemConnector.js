const fs = require('fs');
const path = require('path');

function enumerate(directoryPath = '') {
  return fs.readdirSync(directoryPath).map((entry) => ({
    name: entry,
    fullPath: path.join(directoryPath, entry)
  }));
}

function discover(directoryPath = '') {
  return enumerate(directoryPath).filter((entry) => {
    try {
      return fs.statSync(entry.fullPath).isFile();
    } catch {
      return false;
    }
  });
}

function retrieve(filePath = '') {
  return fs.readFileSync(filePath);
}

function stream(filePath = '') {
  return fs.createReadStream(filePath);
}

module.exports = {
  enumerate,
  discover,
  retrieve,
  stream
};
