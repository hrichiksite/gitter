'use strict';

var env = require('gitter-web-env');
var config = env.config;
var _ = require('lodash');
var fetchAllPages = require('./fetch-all-pages');
var logFailingRequest = require('./log-failing-request');
var logRateLimit = require('./log-rate-limit');
var requestWithRetry = require('./request-with-retry');
var publicTokenPool = require('./public-token-pool');
var requestExt = require('request-extensible');
var RequestHttpCache = require('request-http-cache');
var useForeverExtension = require('./use-forever-extension');

function createRedisClient() {
  var redisCachingConfig =
    process.env.REDIS_CACHING_CONNECTION_STRING || config.get('redis_caching');
  if (typeof redisCachingConfig === 'string') {
    redisCachingConfig = env.redis.parse(redisCachingConfig);
  }

  var redisConfig = _.extend({}, redisCachingConfig, {
    clientOpts: {
      // NB: this needs to be returnBuffers if we switch to IORedis
      return_buffers: true
    }
  });

  return env.redis.createClient(redisConfig);
}

var httpRequestCache = new RequestHttpCache({
  backend: 'redis',
  redisClient: createRedisClient(),
  stats: env.createStatsClient({ prefix: 'github.cache.' })
});

var extensions = [
  publicTokenPool,
  fetchAllPages,
  logFailingRequest,
  httpRequestCache.extension,
  requestWithRetry({ maxRetries: 3 }),
  logRateLimit
];

if (config.get('github:foreverAgent')) {
  extensions.push(useForeverExtension);
}

module.exports = requestExt({
  extensions: extensions
});
