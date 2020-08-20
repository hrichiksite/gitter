'use strict';

var through = require('through2');
var utimes = require('fs').utimes;

/**
 * Ensures that the file has the same mtime as the original source
 */
function restoreTimestamps() {
  return through.obj(function(file, enc, done) {
    utimes(file.path, file.stat.atime, file.stat.mtime, done);
  });
}

module.exports = restoreTimestamps;
