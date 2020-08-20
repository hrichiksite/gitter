'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var appEvents = require('gitter-web-appevents');

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  appEvents.onRepoRenameDetected(function(oldFullName, newFullName) {
    logger.warn('Manual repo rename required', { oldName: oldFullName, newName: newFullName });
  });
};
