#!/usr/bin/env node

'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var nconf = env.config;
var notificationGenerator = require('../../server/services/notifications/email-notification-generator-service');

var MAX_TIME = 60000 * 5;

var shutdown = require('shutdown');
var opts = require('yargs')
  .option('age', {
    alias: 'a',
    default: nconf.get('notifications:emailNotificationsAfterMins'),
    required: false,
    description: 'Age in minutes of the unread items'
  })
  .help('help')
  .alias('help', 'h').argv;

winston.info('Looking for all unread messages older than ' + opts.age + ' minutes');
var sinceTime = Date.now() - opts.age * 60 * 1000;
var startTime = Date.now();
function run() {
  return notificationGenerator(sinceTime).then(function(result) {
    if (result) {
      /* Only keep iterating up to the maximum time */
      if (Date.now() - startTime < MAX_TIME) {
        return run();
      } else {
        winston.warn('Reached MAX_TIME (' + MAX_TIME + ') before notifying everyone.');
      }
    }
  });
}

run()
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.log(err);
    console.log(err.stack);
    winston.error('send-unread-notifications failed: ' + err, { exception: err });
    shutdown.shutdownGracefully(1);
  });
