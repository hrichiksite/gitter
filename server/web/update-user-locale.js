'use strict';

var env = require('gitter-web-env');
var logger = env.logger;

var userSettingsService = require('gitter-web-user-settings');

// use this whenever a user signs up or logs in
// (Why don't we add it as middleware to those routes rather?)
module.exports = function updateUserLocale(req, user) {
  if (req.i18n && req.i18n.locale) {
    userSettingsService.setUserSettings(user.id, 'lang', req.i18n.locale).catch(function(err) {
      logger.error('Failed to save lang user setting', {
        userId: user.id,
        lang: req.i18n.locale,
        exception: err
      });
    });
  }
};
