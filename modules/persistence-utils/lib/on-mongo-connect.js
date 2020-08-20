'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Promise = require('bluebird');
var debug = require('debug')('gitter:infra:on-mongo-connect');

module.exports = function onMongoConnect(callback) {
  var promise;

  if (mongoose.connection.readyState === 1) {
    debug('Mongo already ready, continuing immediately');

    promise = Promise.resolve();
  } else {
    debug('Awaiting mongo connection');

    promise = new Promise(function(resolve) {
      mongoose.connection.once('open', function() {
        debug('Mongo connection ready');
        resolve();
      });
    });
  }

  return promise.nodeify(callback);
};
