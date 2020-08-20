#!/usr/bin/env node
/*jslint node: true, unused:true */
'use strict';

var Promise = require('bluebird');
var env = require('gitter-web-env');

var redisClient = env.redis.getClient();

/**
 * HGETALL can take down your redis server if the hash is big enough.
 * This way, we scan the redis server and return things chunk at a time
 */
function scanEmailNotifications() {
  var cursor = '0';
  function iter() {
    return Promise.fromCallback(function(callback) {
      redisClient.scan(cursor, 'COUNT', 10000, 'MATCH', 'resque:*', callback);
    }).spread(function(nextCursor, result) {
      if (result) {
        result.forEach(function(key) {
          console.log(key);
        });
      }

      if (nextCursor === '0') return;
      cursor = nextCursor;
      return iter();
    });
  }

  return iter();
}

scanEmailNotifications()
  .then(function() {
    process.exit(0);
  })
  .done();
