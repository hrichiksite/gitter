'use strict';

var Promise = require('bluebird');
var presenceService = require('gitter-web-presence');
var isNative = require('./is-native');

/**
 * Figures out whether to use desktop notifications for this user
 */
var determineDesktopNotifications = Promise.method(function(user, req) {
  if (!user) return true;

  var agent = req.getParsedUserAgent();
  var os = agent.os.family;
  var clientType;

  if (os === 'Mac OS X') {
    clientType = 'osx';
  } else if (os.indexOf('Windows') === 0) {
    clientType = 'win';
  } else if (os.indexOf('Linux') === 0) {
    clientType = 'linux';
  }

  if (clientType) {
    return presenceService
      .isUserConnectedWithClientType(user.id, clientType)
      .then(function(result) {
        return !result;
      });
  }

  return true;
});

function contextFromRequest(req) {
  var user = req.user;
  var events = req.session && req.session.events;

  // Pass the feature toggles through to the client
  var features;
  if (req.fflip && req.fflip.features) {
    features = Object.keys(req.fflip.features).filter(function(featureKey) {
      return req.fflip.features[featureKey];
    });
  }

  if (events) {
    req.session.events = [];
  }

  var contextHash = {
    events: events,
    accessToken: req.accessToken,
    isNativeDesktopApp: isNative(req),
    locale: req.i18n.locales[req.i18n.locale],
    features: features
  };

  if (!user) {
    return contextHash;
  }

  return determineDesktopNotifications(user, req).then(function(desktopNotifications) {
    contextHash.desktopNotifications = desktopNotifications;
    return contextHash;
  });
}

module.exports = Promise.method(contextFromRequest);
