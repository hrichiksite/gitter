#!/usr/bin/env node
'use strict';

var env = require('gitter-web-env');
var config = env.config;
var redisClient = env.ioredis.createClient(null, { keyPrefix: 'github:stats:' });
var Tentacles = require('tentacles');
var Promise = require('bluebird');
var shutdown = require('shutdown');

var clientId = config.get('github:anonymous_app:client_id');
var clientSecret = config.get('github:anonymous_app:client_secret');

var ghClient = new Tentacles({ clientId: clientId, clientSecret: clientSecret });

function next(count, last) {
  return ghClient.user.listAll({ query: { since: last, per_page: 100 } }).then(function(users) {
    if (!users.length) return [count, last];

    users.forEach(function(user) {
      if (user.type === 'User') {
        count++;
      }
    });

    var lastId = users[users.length - 1].id;

    if (users.length < 100) {
      return [count, lastId];
    } else {
      return Promise.delay(10).then(function() {
        return next(count, lastId);
      });
    }
  });
}

function getLastMaxId() {
  return redisClient.get('last_known_max_user_id').then(function(maxId) {
    if (!maxId) return 19256436;
    return maxId;
  });
}

function setLastMaxId(lastMaxId) {
  return redisClient.set('last_known_max_user_id', lastMaxId);
}

function execute() {
  return getLastMaxId()
    .then(function(lastMaxId) {
      return next(0, lastMaxId);
    })
    .spread(function(count, maxId) {
      console.log('new github users: ', count);
      // stats.gaugeHF('github.user.signup.count', count, 1);
      return setLastMaxId(maxId);
    });
}

execute()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    shutdown.shutdownGracefully(1);
    throw err;
  })
  .done();
