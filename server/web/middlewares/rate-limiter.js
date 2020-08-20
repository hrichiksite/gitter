'use strict';

var dolph = require('dolph');
var redis = require('gitter-web-utils/lib/redis');
var redisClient = redis.getClient();

var env = require('gitter-web-env');
var config = env.config;

var rateLimiter = dolph({
  prefix: 'rate:',
  limit: config.get('web:apiRateLimit') || 100,
  expiry: 60,
  applyLimit: function(req) {
    if (req.user) return true;
    if (req.authInfo && req.authInfo.accessToken) return true;
    return false;
  },
  keyFunction: function(req) {
    if (req.user) {
      if (req.authInfo && req.authInfo.client) {
        return req.user.id + ':' + req.authInfo.client.id;
      }

      return req.user.id;
    }

    // Anonymous access tokens
    if (req.authInfo && req.authInfo.accessToken) {
      return req.authInfo.accessToken;
    }

    /* Should never get here */
    return 'anonymous';
  },
  redisClient: redisClient
});

// Hacky workaround for avatar rate limit issues in our dev environments
// until we come up with a better solution
var rateLimiterMiddleware;
if (process.env.NODE_ENV === 'dev') {
  rateLimiterMiddleware = function(req, res, next) {
    if (req.originalUrl.indexOf('/api/private/avatars') === 0) {
      return next();
    }

    return rateLimiter(req, res, next);
  };
} else {
  rateLimiterMiddleware = rateLimiter;
}

module.exports = rateLimiterMiddleware;
