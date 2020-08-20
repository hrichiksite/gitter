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
  var hashValues = {};
  var count = 0;
  function iter() {
    return Promise.fromCallback(function(callback) {
      redisClient.scan(cursor, 'COUNT', 1000, callback);
    }).spread(function(nextCursor, result) {
      count++;
      if (count % 100 === 0) {
        console.log(count++);
      }
      if (result) {
        result.forEach(function(key) {
          var prefix = key.split(':', 1)[0];
          if (hashValues[prefix]) {
            hashValues[prefix]++;
          } else {
            hashValues[prefix] = 1;
          }
        });
      }

      if (nextCursor === '0') return;
      cursor = nextCursor;
      return iter();
    });
  }

  return iter().then(function() {
    return hashValues;
  });
}

scanEmailNotifications()
  .then(function(result) {
    console.log(result);
    process.exit(0);
  })
  .done();
