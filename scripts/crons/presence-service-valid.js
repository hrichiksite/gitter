#!/usr/bin/env node

'use strict';

var env = require('gitter-web-env');
var winston = env.logger;
var presenceService = require('gitter-web-presence');
var shutdown = require('shutdown');

var start = Date.now();

presenceService.validateUsers(function(err) {
  if (err) {
    winston.error('presence-user-validation failed: ' + err, { exception: err });
  }

  var timeTaken = Date.now() - start;
  winston.info('presence-user-validation completed in ' + timeTaken + 'ms');
  shutdown.shutdownGracefully(err ? 1 : 0);
});
