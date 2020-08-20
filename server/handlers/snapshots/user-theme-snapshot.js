'use strict';

var Promise = require('bluebird');
var userSettingsService = require('gitter-web-user-settings');

module.exports = Promise.method(function getSnapshotsForPageContext(req) {
  if (!req.user) return {};

  return userSettingsService.getUserSettings(req.user._id, 'userTheme').then(function(result) {
    return result || {};
  });
});
