'use strict';

var userSettingsService = require('gitter-web-user-settings');

function getSnapshotsForPageContext(req) {
  if (!req.user) return {};
  return userSettingsService
    .getUserSettings(req.user._id, 'rightToolbar')
    .then(function(rightToolbarUserSettings) {
      var isPinned;

      if (!rightToolbarUserSettings || rightToolbarUserSettings.isPinned === undefined) {
        // Default to pinned
        isPinned = true;
      } else {
        isPinned = rightToolbarUserSettings.isPinned;
      }
      return {
        isPinned: isPinned
      };
    });
}

module.exports = getSnapshotsForPageContext;
