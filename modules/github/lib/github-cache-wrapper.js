'use strict';

/*
 *
 * DEPRECATED, use cache-wrapper instead
 *
 */

var SnappyCache = require('snappy-cache');
var env = require('gitter-web-env');
var config = env.config;
var _ = require('lodash');
var util = require('util');
var Promise = require('bluebird');
var redisClient;

function getRedisCachingClient() {
  if (redisClient) return redisClient;

  var redisCachingConfig =
    process.env.REDIS_CACHING_CONNECTION_STRING || config.get('redis_caching');
  if (typeof redisCachingConfig === 'string') {
    redisCachingConfig = env.redis.parse(redisCachingConfig);
  }

  var redisConfig = _.extend({}, redisCachingConfig, {
    clientOpts: {
      // Snappy cache needs detect_buffers on
      detect_buffers: true
    }
  });

  redisClient = env.redis.createClient(redisConfig);
  return redisClient;
}

function getKeys(method, contextValues, args) {
  var arr = [method].concat(contextValues).concat(args);

  return arr.map(encodeURIComponent).join(':');
}

function wrap(Service, contextFunction, options) {
  if (!config.get('github:caching')) return Service;
  if (!options) options = {};

  var sc = new SnappyCache(
    _.defaults(options, {
      prefix: 'sc:',
      redis: getRedisCachingClient(),
      validateRedisClient: false,
      ttl: config.get('github:cache-timeout')
    })
  );

  var ServiceWrapper = function() {
    Service.apply(this, arguments);
  };

  util.inherits(ServiceWrapper, Service);

  Object.keys(Service.prototype).forEach(function(value) {
    var method = Service.prototype[value];

    /* Only create prototypes for methods... */
    if (typeof method !== 'function') return;

    var wrapped = function() {
      var self = this;
      var args = Array.prototype.slice.apply(arguments);
      var contextValues = contextFunction ? contextFunction.apply(self) : [];

      var key = getKeys(value, contextValues, args);

      return Promise.fromCallback(function(callback) {
        sc.lookup(
          key,
          function(cb) {
            var promise = method.apply(self, args);
            promise.nodeify(cb);
          },
          callback
        );
      });
    };

    ServiceWrapper.prototype[value] = wrapped;
  }, {});

  return ServiceWrapper;
}

module.exports = exports = wrap;
