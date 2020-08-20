'use strict';

var path = require('path');
var parsePathLib = require('path-parse');

var parsePath = function(path) {
  var result = parsePathLib(path);

  return {
    dir: result.dir,
    name: result.name,
    ext: result.ext
  };
};

var formatPath = function(pathObj) {
  pathObj = pathObj || {};

  return path.join(pathObj.dir, pathObj.name + pathObj.ext);
};

module.exports = {
  parsePath: parsePath,
  formatPath: formatPath
};
