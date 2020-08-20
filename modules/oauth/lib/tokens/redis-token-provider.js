'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var conf = env.config;

const assert = require('assert');

/* Uses the no-persist redis */
var redisClient = env.redis.createClient(
  process.env.REDIS_NOPERSIST_CONNECTION_STRING || conf.get('redis_nopersist')
);
var STANDARD_TTL = 10 * 60; /* 10 minutes */
var ANONYMOUS_TTL = conf.get('web:sessionTTL') + 60; /* One minute more than the session age */

const tokenLookupCachePrefix = 'token:c:';
const tokenValidationCachePrefix = 'token:t:';

function getAnonymousRedisKey(token) {
  assert(token);
  return tokenValidationCachePrefix + token;
}

function getRedisKey(userId, clientId) {
  assert(userId);
  assert(clientId);
  return tokenLookupCachePrefix + userId + ':' + clientId;
}

module.exports = {
  getToken: function(userId, clientId, callback) {
    if (!userId) return callback();

    redisClient.get(getRedisKey(userId, clientId), callback);
  },

  validateToken: function(token, callback) {
    var redisKey = getAnonymousRedisKey(token);
    redisClient.get(redisKey, function(err, value) {
      if (err) {
        logger.warn('Unable to lookup token in cache ' + err, { exception: err });
        return callback();
      }

      if (!value) return callback();

      var parts = ('' + value).split(':', 2);
      var userId = parts[0] || null;
      var clientId = parts[1];

      if (!userId) {
        /* Async refresh the token for an anonymous user */
        redisClient.expire(redisKey, ANONYMOUS_TTL, function(err) {
          if (err) logger.warn('Unable to refresh expires for token ', { exception: err });
        });
      }

      return callback(null, [userId, clientId]);
    });
  },

  cacheToken: function(userId, clientId, token, callback) {
    var multi = redisClient.multi();

    var cacheTimeout = userId ? STANDARD_TTL : ANONYMOUS_TTL;

    multi.setex(getAnonymousRedisKey(token), cacheTimeout, (userId || '') + ':' + clientId);

    if (userId) {
      multi.setex(getRedisKey(userId, clientId), cacheTimeout, token);
    }

    multi.exec(callback);
  },

  deleteToken: function(token, callback) {
    return this.validateToken(token, function(err, result) {
      if (err) {
        logger.warn('Error while deleting token: ' + err, { exception: err });
        return callback();
      }

      if (!result) return callback();

      var userId = result[0];
      var clientId = result[1];

      // Anonymous tokens don't have this
      if (!userId) return redisClient.del(getAnonymousRedisKey(token), callback);

      return redisClient.del(getAnonymousRedisKey(token), getRedisKey(userId, clientId), callback);
    });
  },

  invalidateCache: function(callback) {
    redisClient.keys('token:*', function(err, results) {
      if (err) return callback(err);

      if (!results.length) return callback();

      redisClient.del(results, callback);
    });
  },

  testOnly: {
    redisClient: redisClient,
    tokenValidationCachePrefix: tokenValidationCachePrefix
  }
};
