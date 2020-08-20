'use strict';

var env = require('gitter-web-env');
var config = env.config;
var Promise = require('bluebird');

var redisClient = env.ioredis.createClient(config.get('redis_caching'), {
  keyPrefix: 'perm:cache:'
});

function recordSuccessfulCheck(rateLimitKey, expiry) {
  if (!rateLimitKey) return Promise.resolve();
  return redisClient.set(rateLimitKey, '1', 'EX', expiry, 'NX');
}

function checkForRecentSuccess(rateLimitKey) {
  if (!rateLimitKey) return Promise.resolve(false);

  return redisClient.exists(rateLimitKey).then(function(result) {
    return result === 1;
  });
}

module.exports = {
  recordSuccessfulCheck: recordSuccessfulCheck,
  checkForRecentSuccess: checkForRecentSuccess
};
