'use strict';

var env = require('gitter-web-env');
var config = env.config;
var _ = require('lodash');
var SnappyCache = require('snappy-cache');
var Promise = require('bluebird');
var assert = require('assert');

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

function generateKey(moduleName, instanceId, propertyName, args = []) {
  assert(moduleName);
  assert(propertyName);

  const serializedArgs = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg);
    }
    return arg;
  });
  var parts = [moduleName || '', instanceId || '', propertyName || ''].concat(serializedArgs);

  return parts.map(encodeURIComponent).join(':');
}

function wrapFunction(cache, moduleName, func, funcName, getInstanceIdFunc) {
  return function() {
    var args = Array.prototype.slice.apply(arguments);
    var self = this;

    var instanceIdPromise = Promise.resolve(getInstanceIdFunc ? getInstanceIdFunc(this) : '');
    return instanceIdPromise.then(function(instanceId) {
      var key = generateKey(moduleName, instanceId, funcName, args);

      return new Promise(function(resolve, reject) {
        cache.lookup(
          key,
          function(cb) {
            Promise.resolve(func.apply(self, args)).nodeify(cb);
          },
          function(err, result) {
            if (err) return reject(err);
            resolve(result);
          }
        );
      });
    });
  };
}

// Standalone caching method for a given function. Also gurantees that cacheKeyGenerator is present (which makes it more secure)
//
// The normal cacheWrapper has no gurantee that the cacheKeyGenerator(getInstanceIdFunc) is present
// so we created this to ensure we don't share data between instances if the cacheKeyGenerator is not passed in
//
// It's also a lot more straightforward and has one specific usage to cache functions vs the general cacheWrapper
function secureWrapFunction(moduleName, func, cacheKeyGenerator, options) {
  const cache = new SnappyCache({
    prefix: 'sc:',
    redis: getRedisCachingClient(),
    validateRedisClient: false,
    ttl: (options && options.ttl) || 0
  });

  assert(cacheKeyGenerator, 'You must provide a cacheKeyGenerator function');
  return wrapFunction(cache, moduleName, func, `${moduleName}-function`, cacheKeyGenerator);
}

function wrapObject(cache, moduleName, obj, getInstanceIdFunc) {
  var wrapped = {};

  Object.keys(obj).forEach(function(key) {
    var property = obj[key];
    if (typeof property === 'function') {
      wrapped[key] = wrapFunction(cache, moduleName, property, key, getInstanceIdFunc);
    } else {
      wrapped[key] = property;
    }
  });

  return wrapped;
}

function wrapClass(cache, moduleName, Klass, getInstanceIdFunc) {
  var Wrapped = function() {
    Klass.apply(this, arguments);
  };

  Wrapped.prototype = wrapObject(cache, moduleName, Klass.prototype, getInstanceIdFunc);

  return Wrapped;
}

function cacheWrapper(moduleName, module, options = {}) {
  var cache = new SnappyCache({
    prefix: 'sc:',
    redis: getRedisCachingClient(),
    validateRedisClient: false,
    ttl: (options && options.ttl) || 0
  });

  if (typeof module === 'function') {
    if (module.prototype && Object.keys(module.prototype).length) {
      // its a class
      assert(options && options.getInstanceId, 'options.getInstanceId required');
      return wrapClass(cache, moduleName, module, options.getInstanceId);
    } else {
      // its a function
      return wrapFunction(
        cache,
        moduleName,
        module,
        `${moduleName}-function`,
        options.getInstanceId
      );
    }
  } else if (typeof module === 'object') {
    // its a collection of functions
    return wrapObject(cache, moduleName, module);
  }
}

module.exports = cacheWrapper;
module.exports.secureWrapFunction = secureWrapFunction;
