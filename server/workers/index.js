'use strict';

var onMongoConnect = require('gitter-web-persistence-utils/lib/on-mongo-connect');
var debug = require('debug')('gitter:infra:workers');

var listening = false;

exports.listen = function() {
  if (listening) return;
  listening = true;

  debug('Starting scheduler instance');
  require('gitter-web-utils/lib/worker-queue-redis').startScheduler();

  // Do not start the workers until theres a valid mongo connection
  // A redis connection is implied since resque needs redis to process
  // the workers
  onMongoConnect().then(function() {
    debug('Starting works on successful mongodb connection');
    require('gitter-web-unread-items/lib/readby-service').listen();
    require('gitter-web-unread-items').listen();
    require('../services/notifications/push-notification-postbox').listen();
  });
};
