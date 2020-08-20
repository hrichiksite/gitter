/*jshint node:true, unused:true */
'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var redis = require('./redis');
var workerQueue = require('./worker-queue-redis');

var PREFIX = 'rb:';

function emptyFn(err) {
  if (err) winston.warn('Warning ' + err, { exception: err });
}

// Name of batcher and the delay in milliseconds
var RedisBatcher = function(name, delay, handler) {
  this.name = name;
  this.redisClient = redis.createClient();
  this.prefix = PREFIX;
  this.delay = delay;

  var self = this;
  this.queue = workerQueue.queue('redis-batch-' + this.name, {}, function() {
    return function(data, done) {
      self.dequeue(data.key, handler, done);
    };
  });
};

RedisBatcher.prototype = {
  getKey: function(key) {
    return this.prefix + this.name + ':' + key;
  },

  // Callback(err)
  add: function(key, item, callback) {
    if (!callback) callback = emptyFn;

    var self = this;

    var redisKey = this.getKey(key);

    var timeout = this.timeout;

    if (Array.isArray(item)) {
      this.redisClient.rpush.apply(this.redisClient, [redisKey].concat(item).concat(rpushCallback));
    } else {
      this.redisClient.rpush(redisKey, item, rpushCallback);
    }

    function rpushCallback(err) {
      if (err) return callback(err);

      var friendlyLockValue = Date.now() + timeout + 1;

      // check if batch timeout is already queued
      self.redisClient.set('ul:' + redisKey, [friendlyLockValue, 'PX', timeout, 'NX'], function(
        err,
        reply
      ) {
        if (err) return callback(err);

        if (reply === 'OK') {
          // successfully set lock, so queue a new batch timeout
          self.addToQueue(key, callback);
        } else {
          callback();
        }
      });
    }
  },

  listen: function() {
    this.queue.listen();
  },

  dequeue: function(key, handler, done) {
    var redisKey = this.getKey(key);

    this.redisClient
      .multi()
      .lrange(redisKey, 0, -1)
      .del(redisKey)
      .exec(function(err, replies) {
        if (err) return done(err);

        var items = replies[0];
        if (items.length) {
          return handler(key, items, done);
        } else {
          return done();
        }
      });
  },

  addToQueue: function(key, callback) {
    this.queue.invoke({ key: key }, { delay: this.delay }, callback);
  }
};

exports.RedisBatcher = RedisBatcher;
