'use strict';

var path = require('path');
var mkdirp = require('mkdirp');

function getSourceMapUrl() {
  if (!process.env.BUILD_URL) return;

  return process.env.BUILD_URL + 'artifact/output';
}

function getSourceMapOptions(mapsSubDir) {
  var sourceMapUrl = getSourceMapUrl();
  if (!sourceMapUrl) {
    return {
      dest: '.'
    };
  }
  var suffix = mapsSubDir ? mapsSubDir + '/' : '';

  mkdirp.sync('output/maps/' + suffix);

  return {
    dest: path.relative('./output/assets/js/' + suffix + '/', './output/maps/' + suffix + '/'),
    options: {
      sourceRoot: path.relative('./output/maps/' + suffix, './output/assets/js/' + suffix),
      sourceMappingURLPrefix: sourceMapUrl
    }
  };
}

module.exports = getSourceMapOptions;
