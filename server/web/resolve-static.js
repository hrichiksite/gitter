'use strict';

var env = require('gitter-web-env');
var config = env.config;
var path = require('path');
var baseDir = path.normalize(__dirname + '/../../' + config.get('web:staticContent'));

module.exports = function(staticPath) {
  if (!staticPath) {
    return baseDir;
  }

  return path.join(baseDir, staticPath);
};
