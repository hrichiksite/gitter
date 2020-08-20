/*jshint node:true, unused:true */
'use strict';

var env = require('gitter-web-env');

/* Wrapper to gitter-env */
exports.getClient = function() {
  return env.redis.getClient();
};

exports.createClient = function() {
  return env.redis.createClient();
};

exports.createTransientClient = function(callback) {
  return env.redis.createTransientClient(callback);
};

exports.quit = function(client) {
  return env.redis.quitClient(client);
};

/** If we ever move away from node-redis-sentinel-client, we'll probably need to change this */
exports.exposeUnderlyingClient = function(client) {
  return client.activeMasterClient || client;
};
