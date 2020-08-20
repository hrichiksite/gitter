'use strict';

var env = require('gitter-web-env');
var nconf = env.config;

// A comma-separated list of GitLab private-tokens
var accessTokenPoolString = nconf.get('gitlab:public_token_pool') || '';
var accessTokenPool = accessTokenPoolString.split(',');

var usageIterator = 0;

module.exports = function() {
  var accessToken = null;
  if (accessTokenPool.length > 0) {
    accessToken = accessTokenPool[usageIterator++ % accessTokenPool.length];
  }
  return accessToken;
};
